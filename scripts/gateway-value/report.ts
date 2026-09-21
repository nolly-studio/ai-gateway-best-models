/**
 * Rank Vercel AI Gateway language models and write daily + weekly snapshots.
 *
 * Usage:
 *   bun run gateway:value
 *
 * Data:
 *   Catalog       https://ai-gateway.vercel.sh/v1/models
 *   Endpoints     https://ai-gateway.vercel.sh/v1/models/{id}/endpoints
 *   Models page   https://vercel.com/ai-gateway/models (official list-vs-sale)
 *   Models        https://vercel.com/api/ai/leaderboard-export?dataset=models&modality=text
 *   Labs          https://vercel.com/api/ai/leaderboard-export?dataset=labs&modality=text
 *   DeepsecBench  https://vercel.com/ai-gateway/leaderboards/deepsecbench/results.json
 *   AA indices    https://artificialanalysis.ai/api/v2/language/models/free
 *                 (OpenRouter fallback)
 *   License       CC BY 4.0 — © 2026 Vercel, AI Gateway Leaderboard Data
 *                 Artificial Analysis Free API, CC BY 4.0
 *                 (OpenRouter fallback when the AA key is missing)
 */

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import {
  HISTORY_RELATIVE_PATH,
  buildSnapshotDelta,
  featuredPickIds,
  priorWeekTokenShares,
  shouldWriteWeekArchive,
  SNAPSHOT_RELATIVE_PATH,
  WEEKLY_RELATIVE_PATH,
  toHistoryWeek,
  tokenSharesFromModels,
  upsertHistory,
  weekSnapshotRelativePath,
  type GatewaySnapshot,
  type SnapshotCadence,
  type SnapshotLaneKey,
  type SnapshotLists,
} from "../../lib/gateway-snapshot"
import { readHistory } from "../../lib/read-snapshot"
import {
  fetchAaIndices,
  fetchCatalog,
  fetchDeepsecBench,
  fetchEndpointQuotes,
  fetchLabsLeaderboard,
  fetchLeaderboard,
  fetchOfficialPromos,
} from "./fetch"
import {
  aaCreatorPrefix,
  attachAa,
  attachDeepsec,
  attachEndpoints,
  attachPromo,
  averageAdoption,
  CHEAP_BLEND_USD,
  completeExportDay,
  hasPrivacy,
  hasZdr,
  indexCatalog,
  lookbackWindow,
  matchAaRecord,
  matchCatalog,
  matchModelId,
  MIN_DEEPSEC_SCORE,
  pickBangForBuck,
  pickCheapRouter,
  pickDefaultWorkhorse,
  pickFrontier,
  pickRising,
  rankFromBoard,
  rankFromCatalog,
  uniqueSortedDates,
  withGateShares,
  type AaIndices,
  type AaRecord,
  type Adoption,
  type DeepsecRow,
  type EndpointQuote,
  type OfficialPromo,
  type RankedModel,
} from "./rank"
import {
  buildLabBang,
  buildLists,
  buildSnapshot,
  listLabNames,
  snapshotMovers,
  weekTokenSharesFromModels,
  type RankedPicks,
} from "./snapshot"

function money(value: number | null): string {
  return value == null ? "n/a" : `$${value.toFixed(3)}`
}

function pct(value: number): string {
  return `${value.toFixed(2)}%`
}

function line(model: RankedModel): string {
  const value = model.valueScore == null ? "n/a" : model.valueScore.toFixed(2)
  const valueRun = model.deepsecValue
  const bang =
    valueRun?.bang == null
      ? "n/a"
      : `${valueRun.bang.toFixed(2)}${valueRun.effort ? `@${valueRun.effort}` : ""}`
  const score =
    model.deepsecBest == null ? "n/a" : model.deepsecBest.score.toFixed(1)
  const disc =
    model.discountPercent == null
      ? ""
      : `  disc=${model.discountPercent.toFixed(0)}%`
  const zdr = model.zdr ?? "n/a"
  const npt = model.noTraining ?? "n/a"
  return [
    model.id.padEnd(42),
    `zdr=${zdr}`.padEnd(9),
    `npt=${npt}`.padEnd(9),
    `blend=${money(model.endpointBlendedPerMillion ?? model.blendedPerMillion)}`.padEnd(
      14
    ),
    `deepsec=${score}`.padEnd(13),
    `bang=${bang}`.padEnd(10),
    `tok=${pct(model.tokensShare)}`.padEnd(12),
    `value=${value}${disc}`,
  ].join("  ")
}

function section(title: string, models: RankedModel[]) {
  console.log(`\n${title}`)
  if (models.length === 0) {
    console.log("  (none)")
    return
  }
  for (const model of models) {
    console.log(`  ${line(model)}`)
  }
}

function adoptionByCatalogId(
  adoption: Map<string, Adoption>,
  index: ReturnType<typeof indexCatalog>
): Map<string, Adoption> {
  const byId = new Map<string, Adoption>()
  for (const [boardName, metrics] of adoption) {
    const model = matchCatalog(boardName, index)
    if (model) {
      byId.set(model.id, metrics)
    }
  }
  return byId
}

function deepsecByCatalogId(
  rows: DeepsecRow[],
  index: ReturnType<typeof indexCatalog>
): Map<string, DeepsecRow[]> {
  const byId = new Map<string, DeepsecRow[]>()
  for (const row of rows) {
    const model = matchModelId(row.id, index)
    if (!model) {
      continue
    }
    const existing = byId.get(model.id) ?? []
    existing.push(row)
    byId.set(model.id, existing)
  }
  return byId
}

function aaByCatalogId(
  rows: AaRecord[],
  index: ReturnType<typeof indexCatalog>
): { byId: Map<string, AaRecord["indices"]>; unmatched: string[] } {
  const byId = new Map<string, AaRecord["indices"]>()
  const unmatched: string[] = []
  for (const record of rows) {
    const model = matchAaRecord(record, index)
    if (!model) {
      if (record.source === "openrouter") {
        unmatched.push(
          record.creator == null
            ? record.slug
            : `${aaCreatorPrefix(record.creator) ?? record.creator}/${record.slug}`
        )
      }
      continue
    }
    if (!byId.has(model.id)) {
      byId.set(model.id, record.indices)
    }
  }
  return { byId, unmatched }
}

function enrich(
  model: RankedModel,
  deepsec: Map<string, DeepsecRow[]>,
  aa: Map<string, AaIndices>,
  quotes: Map<string, EndpointQuote[]>,
  promos: Map<string, OfficialPromo>,
  zdrOnly: boolean
): RankedModel {
  const withBench = attachDeepsec(model, deepsec.get(model.id) ?? [])
  const withAa = attachAa(withBench, aa.get(model.id))
  const withEndpoints = attachEndpoints(
    withAa,
    quotes.get(model.id) ?? [],
    zdrOnly
  )
  return attachPromo(withEndpoints, promos.get(model.id))
}

type RankedLanes = {
  openRanked: RankedModel[]
  privacyRanked: RankedModel[]
  openLeaderboard: RankedModel[]
  privacyLeaderboard: RankedModel[]
  catalogBase: RankedModel[]
  labs: Map<string, Adoption>
}

function aaSourceLabel(rows: AaRecord[]): string {
  const sources = new Set(rows.map((row) => row.source))
  if (sources.has("aa") && sources.has("openrouter")) {
    return "mixed"
  }
  if (sources.has("aa")) {
    return "aa"
  }
  if (sources.has("openrouter")) {
    return "openrouter"
  }
  return "none"
}

function rankCadence(
  catalog: Awaited<ReturnType<typeof fetchCatalog>>,
  index: ReturnType<typeof indexCatalog>,
  adoption: Map<string, Adoption>,
  labs: Map<string, Adoption>,
  deepsec: Map<string, DeepsecRow[]>,
  aa: Map<string, AaIndices>,
  quotes: Map<string, EndpointQuote[]>,
  promos: Map<string, OfficialPromo>,
  gateAdoption?: Map<string, Adoption>
): RankedLanes {
  const adoptionById = adoptionByCatalogId(adoption, index)
  const gateById =
    gateAdoption == null ? null : adoptionByCatalogId(gateAdoption, index)
  const attachGates = (model: RankedModel): RankedModel => {
    if (gateById == null) {
      return model
    }
    return withGateShares(
      model,
      gateById.get(model.id) ?? gateAdoption?.get(model.boardName)
    )
  }

  const boardRanked = [...adoption.entries()].map(([name, metrics]) =>
    attachGates(rankFromBoard(name, matchCatalog(name, index), metrics))
  )
  const catalogBase = catalog
    .map((model) => rankFromCatalog(model, adoptionById.get(model.id)))
    .filter((model): model is RankedModel => model != null)
    .map(attachGates)

  const openLeaderboard = boardRanked.map((model) =>
    enrich(model, deepsec, aa, quotes, promos, false)
  )
  const privacyLeaderboard = boardRanked
    .filter(hasPrivacy)
    .map((model) => enrich(model, deepsec, aa, quotes, promos, true))
  const openRanked = catalogBase.map((model) =>
    enrich(model, deepsec, aa, quotes, promos, false)
  )
  const privacyRanked = catalogBase
    .filter(hasPrivacy)
    .map((model) => enrich(model, deepsec, aa, quotes, promos, true))

  return {
    openRanked,
    privacyRanked,
    openLeaderboard,
    privacyLeaderboard,
    catalogBase,
    labs,
  }
}

function snapshotFromRanked(
  cadence: SnapshotCadence,
  window: { from: string; to: string },
  ranked: RankedLanes,
  catalogCount: number,
  deepsecRuns: number,
  aaModels: number,
  unmatched: GatewaySnapshot["unmatched"],
  priorTokens?: Record<string, number>
): GatewaySnapshot {
  const zdrModels = ranked.catalogBase.filter(hasZdr).length
  return buildSnapshot({
    cadence,
    window,
    languageModels: catalogCount,
    zdrModels,
    privacyModels: ranked.privacyRanked.length,
    deepsecRuns,
    aaModels,
    picks: {
      privacy: picksFrom(ranked.privacyRanked, priorTokens),
      open: picksFrom(ranked.openRanked, priorTokens),
    },
    lists: {
      privacy: buildLists(ranked.privacyRanked, ranked.privacyLeaderboard),
      open: buildLists(ranked.openRanked, ranked.openLeaderboard),
    },
    labs: ranked.labs,
    labBang: {
      privacy: buildLabBang(ranked.privacyRanked, listLabNames(ranked.labs)),
      open: buildLabBang(ranked.openRanked, listLabNames(ranked.labs)),
    },
    unmatched,
  })
}

export async function buildGatewaySnapshot(): Promise<{
  daily: GatewaySnapshot
  weekly: GatewaySnapshot
  weeklyTokenShares: Record<string, number>
}> {
  const [catalog, rows, labRows, deepsecRows, aaRows, promos] =
    await Promise.all([
      fetchCatalog(),
      fetchLeaderboard(),
      fetchLabsLeaderboard(),
      fetchDeepsecBench(),
      fetchAaIndices(),
      fetchOfficialPromos(),
    ])

  const dates = uniqueSortedDates(rows)
  const completeDay = completeExportDay(dates)
  const weeklyWindow = lookbackWindow(dates)
  const dailyWindow = lookbackWindow(
    dates.filter((date) => date <= completeDay),
    1
  )
  const history = await readHistory()
  const priorWeekTokens = priorWeekTokenShares(history, weeklyWindow.to)
  const index = indexCatalog(catalog)
  const weekAdoption = averageAdoption(rows, weeklyWindow.window)
  const dayAdoption = averageAdoption(rows, dailyWindow.window)
  const labDates = uniqueSortedDates(labRows)
  const weekLabs = averageAdoption(
    labRows,
    lookbackWindow(labDates).window
  )
  const dayLabDates = labDates.filter((date) => date <= completeDay)
  const dayLabs = averageAdoption(
    labRows,
    lookbackWindow(dayLabDates, 1).window
  )
  const deepsec = deepsecByCatalogId(deepsecRows, index)
  const { byId: aa, unmatched: unmatchedAa } = aaByCatalogId(aaRows, index)
  const aaSource = aaSourceLabel(aaRows)
  console.log(`Artificial Analysis source: ${aaSource}`)

  const quotes = await fetchEndpointQuotes(catalog.map((model) => model.id))

  const weeklyRanked = rankCadence(
    catalog,
    index,
    weekAdoption,
    weekLabs,
    deepsec,
    aa,
    quotes,
    promos
  )
  const dailyRanked = rankCadence(
    catalog,
    index,
    dayAdoption,
    dayLabs,
    deepsec,
    aa,
    quotes,
    promos,
    weekAdoption
  )

  const unmatchedLeaderboard = weeklyRanked.openLeaderboard.filter(
    (model) => model.unmatched
  )
  const unmatchedDeepsec = deepsecRows.filter(
    (row) => matchModelId(row.id, index) == null
  )
  const unmatched = {
    leaderboard: unmatchedLeaderboard.map((model) => model.boardName),
    deepsec: [
      ...new Set(unmatchedDeepsec.map((row) => `${row.id} (${row.effort})`)),
    ],
    aa: [...new Set(unmatchedAa)],
  }

  const weekly = snapshotFromRanked(
    "week",
    { from: weeklyWindow.from, to: weeklyWindow.to },
    weeklyRanked,
    catalog.length,
    deepsecRows.length,
    aa.size,
    unmatched,
    priorWeekTokens
  )
  const dailyPriorTokens = weekTokenSharesFromModels(dailyRanked.openRanked)
  let daily = snapshotFromRanked(
    "day",
    { from: dailyWindow.from, to: dailyWindow.to },
    dailyRanked,
    catalog.length,
    deepsecRows.length,
    aa.size,
    unmatched,
    dailyPriorTokens
  )
  daily = {
    ...daily,
    delta: buildSnapshotDelta(
      daily,
      weekly,
      snapshotMovers(dailyRanked.openRanked, featuredPickIds(daily.picks))
    ),
  }

  return {
    daily,
    weekly,
    weeklyTokenShares: tokenSharesFromModels(weeklyRanked.openRanked),
  }
}

async function writeSnapshot(
  daily: GatewaySnapshot,
  weekly: GatewaySnapshot,
  weeklyTokenShares: Record<string, number>
): Promise<{ paths: string[]; archivedWeek: boolean }> {
  const dailyPath = join(process.cwd(), SNAPSHOT_RELATIVE_PATH)
  const weeklyPath = join(process.cwd(), WEEKLY_RELATIVE_PATH)
  const historyPath = join(process.cwd(), HISTORY_RELATIVE_PATH)
  const history = await readHistory()
  const archivedWeek = shouldWriteWeekArchive(history, weekly.window.to)
  const paths = [dailyPath, weeklyPath]

  await writeFile(dailyPath, `${JSON.stringify(daily, null, 2)}\n`)
  await writeFile(weeklyPath, `${JSON.stringify(weekly, null, 2)}\n`)

  if (archivedWeek) {
    const weekPath = join(
      process.cwd(),
      weekSnapshotRelativePath(weekly.window.to)
    )
    const nextHistory = upsertHistory(
      history,
      toHistoryWeek(weekly, weeklyTokenShares)
    )
    await mkdir(dirname(weekPath), { recursive: true })
    await writeFile(weekPath, `${JSON.stringify(weekly, null, 2)}\n`)
    await writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`)
    paths.push(weekPath, historyPath)
  }

  return { paths, archivedWeek }
}

function picksFrom(
  ranked: RankedModel[],
  priorTokens?: Record<string, number>
): RankedPicks {
  const bangForBuck = pickBangForBuck(ranked)
  const workhorse = pickDefaultWorkhorse(ranked)
  const cheapRouter = pickCheapRouter(ranked)
  const frontier = pickFrontier(ranked)
  return {
    bangForBuck,
    workhorse,
    cheapRouter,
    frontier,
    rising: pickRising(ranked, {
      exclude: [bangForBuck, workhorse, cheapRouter, frontier],
      priorTokens,
    }),
  }
}

function printLanePicks(
  title: string,
  picks: GatewaySnapshot["picks"]["privacy"]
) {
  console.log(`\nPicks (${title})`)
  console.log(
    `  BANG FOR BUCK  ${picks.bangForBuck ? picks.bangForBuck.id : "none"}`
  )
  const bangScore = picks.bangForBuck?.deepsecValue?.score
  if (picks.bangForBuck && (bangScore ?? 0) < MIN_DEEPSEC_SCORE) {
    console.warn(
      `  WARNING: no model met the DeepsecBench floor (score ≥ ${MIN_DEEPSEC_SCORE}); ` +
        `bang-for-buck fell back to ${picks.bangForBuck.id} (score ${bangScore?.toFixed(1) ?? "n/a"})`
    )
  }
  console.log(
    `  WORKHORSE      ${picks.workhorse ? picks.workhorse.id : "none"}`
  )
  console.log(
    `  CHEAP ROUTER   ${picks.cheapRouter ? picks.cheapRouter.id : "none"}`
  )
  console.log(`  FRONTIER       ${picks.frontier ? picks.frontier.id : "none"}`)
  console.log(`  RISING         ${picks.rising ? picks.rising.id : "none"}`)
}

function laneListLabel(lane: SnapshotLaneKey): string {
  switch (lane) {
    case "privacy":
      return "ZDR+NPT"
    case "open":
      return "all models"
    default: {
      const _exhaustive: never = lane
      return _exhaustive
    }
  }
}

function printLaneLists(lane: SnapshotLaneKey, lists: SnapshotLists) {
  const label = laneListLabel(lane)
  section(
    `Artificial Analysis intelligence (${label})`,
    lists.aaIntelligence.map(asRankedLine)
  )
  section(
    `Artificial Analysis coding (${label})`,
    lists.aaCoding.map(asRankedLine)
  )
  section(
    `DeepsecBench bang-for-buck (${label}, score ≥ floor)`,
    lists.deepsecBang.map(asRankedLine)
  )
  section(
    `DeepsecBench highest score (${label})`,
    lists.deepsecScore.map(asRankedLine)
  )
  section(
    `Discounted ${label} (official list-vs-sale)`,
    lists.discounted.map(asRankedLine)
  )
  section(
    `Adopted cheap capable ${label} (blend ≤ $${CHEAP_BLEND_USD})`,
    lists.cheapCapable.map(asRankedLine)
  )
  section(`Top token share (${label})`, lists.tokenShare.map(asRankedLine))
  section(`Top spend share (${label})`, lists.spendShare.map(asRankedLine))
}

function printReport(snapshot: GatewaySnapshot) {
  const { cadence, window, stats, picks, lists, labs, unmatched, attribution } =
    snapshot
  const label = cadence === "day" ? "daily" : "weekly"

  console.log(
    `AI Gateway ${label}  ·  ${window.from} → ${window.to}  ·  ${stats.languageModels} language models  ·  ${stats.privacyModels} ZDR+NPT`
  )
  console.log(attribution.text)
  console.log(
    `DeepsecBench ${stats.deepsecRuns} runs  ·  bang = score / run $  ·  floor score ≥ ${MIN_DEEPSEC_SCORE}`
  )
  console.log(
    `Artificial Analysis ${stats.aaModels} models  ·  frontier ranks on AA intel  ·  Deepsec is bang`
  )
  console.log(
    "ZDR+NPT = catalog all|some  ·  discount = official models-page list vs sale"
  )

  printLanePicks("ZDR + no-training", picks.privacy)
  printLanePicks("all models", picks.open)
  printLaneLists("privacy", lists.privacy)
  printLaneLists("open", lists.open)

  console.log("\nTop labs (7-day token share)")
  for (const lab of labs) {
    console.log(
      `  ${lab.name.padEnd(16)}  tok=${pct(lab.tokensShare)}  spend=${pct(lab.spendShare)}  req=${pct(lab.requestsShare)}`
    )
  }

  if (unmatched.aa.length > 0) {
    console.log("\nUnmatched Artificial Analysis ids")
    for (const id of unmatched.aa) {
      console.log(`  ${id}`)
    }
  }

  if (unmatched.deepsec.length > 0) {
    console.log("\nUnmatched DeepsecBench ids")
    for (const id of unmatched.deepsec) {
      console.log(`  ${id}`)
    }
  }

  if (unmatched.leaderboard.length > 0) {
    console.log("\nUnmatched leaderboard names")
    for (const name of unmatched.leaderboard) {
      console.log(`  ${name}`)
    }
  }
}

function asRankedLine(
  model: SnapshotLists["deepsecBang"][number]
): RankedModel {
  return {
    id: model.id,
    name: model.name,
    boardName: model.name,
    provider: model.provider,
    unmatched: false,
    tags: model.tags,
    contextWindow: model.contextWindow,
    maxTokens: 0,
    zdr: model.zdr,
    noTraining: model.noTraining,
    inputPerMillion: model.inputPerMillion,
    outputPerMillion: model.outputPerMillion,
    blendedPerMillion: model.blendedPerMillion,
    endpointBlendedPerMillion: model.zdrBlendedPerMillion,
    endpointProvider: model.zdrProvider,
    discounted: model.discounted,
    discountPercent: model.discountPercent,
    requestsShare: model.requestsShare,
    tokensShare: model.tokensShare,
    spendShare: model.spendShare,
    valueScore: model.valueScore,
    overpay: model.overpay,
    deepsecBest: model.deepsecBest,
    deepsecValue: model.deepsecValue,
    deepsecEveryday: model.deepsecEveryday,
    aa: model.aa,
    description: "",
  }
}

async function main() {
  const { daily, weekly, weeklyTokenShares } = await buildGatewaySnapshot()
  const { paths, archivedWeek } = await writeSnapshot(
    daily,
    weekly,
    weeklyTokenShares
  )
  printReport(daily)
  printReport(weekly)
  if (archivedWeek) {
    console.log("\nArchived weekly snapshot")
  } else {
    console.log("\nSkipped weekly archive (last week is under 7 days old)")
  }
  console.log(`archivedWeek=${archivedWeek}`)
  console.log(`\nWrote ${paths.join("\n      ")}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
