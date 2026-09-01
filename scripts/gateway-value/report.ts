/**
 * Rank Vercel AI Gateway language models and write the weekly snapshot archive.
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
  priorWeekTokenShares,
  SNAPSHOT_RELATIVE_PATH,
  toHistoryWeek,
  tokenSharesFromModels,
  upsertHistory,
  weekSnapshotRelativePath,
  type GatewaySnapshot,
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

export async function buildGatewaySnapshot(): Promise<{
  snapshot: GatewaySnapshot
  tokenShares: Record<string, number>
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
  const { from, to, window } = lookbackWindow(dates)
  const history = await readHistory()
  const priorTokens = priorWeekTokenShares(history, to)
  const index = indexCatalog(catalog)
  const adoption = averageAdoption(rows, window)
  const labs = averageAdoption(
    labRows,
    lookbackWindow(uniqueSortedDates(labRows)).window
  )
  const adoptionById = adoptionByCatalogId(adoption, index)
  const deepsec = deepsecByCatalogId(deepsecRows, index)
  const { byId: aa, unmatched: unmatchedAa } = aaByCatalogId(aaRows, index)

  const quotes = await fetchEndpointQuotes(catalog.map((model) => model.id))

  const boardRanked = [...adoption.entries()].map(([name, metrics]) =>
    rankFromBoard(name, matchCatalog(name, index), metrics)
  )
  const catalogBase = catalog
    .map((model) => rankFromCatalog(model, adoptionById.get(model.id)))
    .filter((model): model is RankedModel => model != null)

  // Each lane prices models against the endpoints it may route through:
  // the privacy lane pays the cheapest ZDR endpoint, the open lane pays
  // min(list, cheapest endpoint of any kind).
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

  const unmatched = openLeaderboard.filter((model) => model.unmatched)
  const unmatchedDeepsec = deepsecRows.filter(
    (row) => matchModelId(row.id, index) == null
  )

  return {
    snapshot: buildSnapshot({
      window: { from, to },
      languageModels: catalog.length,
      zdrModels: catalogBase.filter(hasZdr).length,
      privacyModels: privacyRanked.length,
      deepsecRuns: deepsecRows.length,
      aaModels: aa.size,
      picks: {
        privacy: picksFrom(privacyRanked, priorTokens),
        open: picksFrom(openRanked, priorTokens),
      },
      lists: {
        privacy: buildLists(privacyRanked, privacyLeaderboard),
        open: buildLists(openRanked, openLeaderboard),
      },
      labs,
      labBang: {
        privacy: buildLabBang(privacyRanked, listLabNames(labs)),
        open: buildLabBang(openRanked, listLabNames(labs)),
      },
      unmatched: {
        leaderboard: unmatched.map((model) => model.boardName),
        deepsec: [
          ...new Set(unmatchedDeepsec.map((row) => `${row.id} (${row.effort})`)),
        ],
        aa: [...new Set(unmatchedAa)],
      },
    }),
    tokenShares: tokenSharesFromModels(openRanked),
  }
}

async function writeSnapshot(
  snapshot: GatewaySnapshot,
  tokenShares: Record<string, number>
): Promise<string[]> {
  const latestPath = join(process.cwd(), SNAPSHOT_RELATIVE_PATH)
  const weekPath = join(
    process.cwd(),
    weekSnapshotRelativePath(snapshot.window.to)
  )
  const historyPath = join(process.cwd(), HISTORY_RELATIVE_PATH)
  const history = upsertHistory(
    await readHistory(),
    toHistoryWeek(snapshot, tokenShares)
  )
  const body = `${JSON.stringify(snapshot, null, 2)}\n`

  await mkdir(dirname(weekPath), { recursive: true })
  await writeFile(latestPath, body)
  await writeFile(weekPath, body)
  await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`)
  return [latestPath, weekPath, historyPath]
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
  const { window, stats, picks, lists, labs, unmatched, attribution } = snapshot

  console.log(
    `AI Gateway bang-for-buck  ·  ${window.from} → ${window.to}  ·  ${stats.languageModels} language models  ·  ${stats.privacyModels} ZDR+NPT`
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
  const { snapshot, tokenShares } = await buildGatewaySnapshot()
  const paths = await writeSnapshot(snapshot, tokenShares)
  printReport(snapshot)
  console.log(`\nWrote ${paths.join("\n      ")}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
