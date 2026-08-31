/**
 * Rank Vercel AI Gateway language models and write the weekly snapshot archive.
 *
 * Usage:
 *   bun run gateway:value
 *
 * Data:
 *   Catalog       https://ai-gateway.vercel.sh/v1/models
 *   Endpoints     https://ai-gateway.vercel.sh/v1/models/{id}/endpoints
 *   Models        https://vercel.com/api/ai/leaderboard-export?dataset=models&modality=text
 *   Labs          https://vercel.com/api/ai/leaderboard-export?dataset=labs&modality=text
 *   DeepsecBench  https://vercel.com/ai-gateway/leaderboards/deepsecbench/results.json
 *   License       CC BY 4.0 — © 2026 Vercel, AI Gateway Leaderboard Data
 */

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import {
  HISTORY_RELATIVE_PATH,
  SNAPSHOT_RELATIVE_PATH,
  readHistory,
  toHistoryWeek,
  upsertHistory,
  weekSnapshotRelativePath,
  type GatewaySnapshot,
} from "../../lib/gateway-snapshot"
import {
  fetchCatalog,
  fetchDeepsecBench,
  fetchEndpointQuotes,
  fetchLabsLeaderboard,
  fetchLeaderboard,
} from "./fetch"
import {
  attachDeepsec,
  attachEndpoints,
  averageAdoption,
  CHEAP_BLEND_USD,
  hasPrivacy,
  hasZdr,
  indexCatalog,
  lookbackWindow,
  matchCatalog,
  matchModelId,
  MIN_DEEPSEC_SCORE,
  pickBangForBuck,
  pickCheapRouter,
  pickDefaultWorkhorse,
  pickFrontier,
  rankFromBoard,
  rankFromCatalog,
  uniqueSortedDates,
  type Adoption,
  type DeepsecRow,
  type EndpointQuote,
  type RankedModel,
} from "./rank"
import { buildLists, buildSnapshot } from "./snapshot"

function money(value: number | null): string {
  return value == null ? "n/a" : `$${value.toFixed(3)}`
}

function pct(value: number): string {
  return `${value.toFixed(2)}%`
}

function line(model: RankedModel): string {
  const value = model.valueScore == null ? "n/a" : model.valueScore.toFixed(2)
  const bang =
    model.deepsecBang == null
      ? "n/a"
      : `${model.deepsecBang.toFixed(2)}${model.deepsecEffort ? `@${model.deepsecEffort}` : ""}`
  const score =
    model.deepsecScore == null ? "n/a" : model.deepsecScore.toFixed(1)
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
    `blend=${money(model.zdrBlendedPerMillion ?? model.blendedPerMillion)}`.padEnd(
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

function enrich(
  model: RankedModel,
  deepsec: Map<string, DeepsecRow[]>,
  quotes: Map<string, EndpointQuote[]>
): RankedModel {
  const withBench = attachDeepsec(model, deepsec.get(model.id) ?? [])
  return attachEndpoints(withBench, quotes.get(model.id) ?? [])
}

export async function buildGatewaySnapshot(): Promise<GatewaySnapshot> {
  const [catalog, rows, labRows, deepsecRows] = await Promise.all([
    fetchCatalog(),
    fetchLeaderboard(),
    fetchLabsLeaderboard(),
    fetchDeepsecBench(),
  ])

  const dates = uniqueSortedDates(rows)
  const { from, to, window } = lookbackWindow(dates)
  const index = indexCatalog(catalog)
  const adoption = averageAdoption(rows, window)
  const labs = averageAdoption(
    labRows,
    lookbackWindow(uniqueSortedDates(labRows)).window
  )
  const adoptionById = adoptionByCatalogId(adoption, index)
  const deepsec = deepsecByCatalogId(deepsecRows, index)

  const scanIds = [
    ...new Set([
      ...catalog
        .filter(
          (model) =>
            (model.zdr === "all" || model.zdr === "some") &&
            (model.no_training === "all" || model.no_training === "some")
        )
        .map((model) => model.id),
      ...deepsec.keys(),
    ]),
  ]
  const quotes = await fetchEndpointQuotes(scanIds)

  const leaderboard = [...adoption.entries()]
    .map(([name, metrics]) =>
      rankFromBoard(name, matchCatalog(name, index), metrics)
    )
    .map((model) => enrich(model, deepsec, quotes))
  const unmatched = leaderboard.filter((model) => model.unmatched)

  const catalogRanked = catalog
    .map((model) => rankFromCatalog(model, adoptionById.get(model.id)))
    .filter((model): model is RankedModel => model != null)
    .map((model) => enrich(model, deepsec, quotes))

  const zdrRanked = catalogRanked.filter(hasZdr)
  const privacyRanked = catalogRanked.filter(hasPrivacy)
  const lists = buildLists(privacyRanked, leaderboard)
  const unmatchedDeepsec = deepsecRows.filter(
    (row) => matchModelId(row.id, index) == null
  )

  return buildSnapshot({
    window: { from, to },
    languageModels: catalog.length,
    zdrModels: zdrRanked.length,
    privacyModels: privacyRanked.length,
    deepsecRuns: deepsecRows.length,
    picks: {
      bangForBuck: pickBangForBuck(privacyRanked),
      workhorse: pickDefaultWorkhorse(leaderboard),
      cheapRouter: pickCheapRouter(privacyRanked),
      frontier: pickFrontier(leaderboard),
    },
    lists,
    labs,
    unmatched: {
      leaderboard: unmatched.map((model) => model.boardName),
      deepsec: [
        ...new Set(unmatchedDeepsec.map((row) => `${row.id} (${row.effort})`)),
      ],
    },
  })
}

async function writeSnapshot(snapshot: GatewaySnapshot): Promise<string[]> {
  const latestPath = join(process.cwd(), SNAPSHOT_RELATIVE_PATH)
  const weekPath = join(
    process.cwd(),
    weekSnapshotRelativePath(snapshot.window.to)
  )
  const historyPath = join(process.cwd(), HISTORY_RELATIVE_PATH)
  const history = upsertHistory(await readHistory(), toHistoryWeek(snapshot))
  const body = `${JSON.stringify(snapshot, null, 2)}\n`

  await mkdir(dirname(weekPath), { recursive: true })
  await writeFile(latestPath, body)
  await writeFile(weekPath, body)
  await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`)
  return [latestPath, weekPath, historyPath]
}

function printReport(snapshot: GatewaySnapshot) {
  const { window, stats, picks, lists, labs, unmatched, attribution } = snapshot

  console.log(
    `AI Gateway ZDR+NPT bang-for-buck  ·  ${window.from} → ${window.to}  ·  ${stats.languageModels} language models  ·  ${stats.privacyModels} ZDR+NPT`
  )
  console.log(attribution.text)
  console.log(
    `DeepsecBench ${stats.deepsecRuns} runs  ·  bang = score / run $  ·  floor score ≥ ${MIN_DEEPSEC_SCORE}`
  )
  console.log(
    "ZDR+NPT = catalog all|some  ·  discount = cheaper ZDR endpoint than list"
  )

  console.log("\nPicks (ZDR + no-training)")
  console.log(
    `  BANG FOR BUCK  ${picks.bangForBuck ? picks.bangForBuck.id : "none"}`
  )
  console.log(
    `  WORKHORSE      ${picks.workhorse ? picks.workhorse.id : "none"}`
  )
  console.log(
    `  CHEAP ROUTER   ${picks.cheapRouter ? picks.cheapRouter.id : "none"}`
  )
  console.log(`  FRONTIER       ${picks.frontier ? picks.frontier.id : "none"}`)

  section(
    "DeepsecBench bang-for-buck (ZDR+NPT, score ≥ floor)",
    lists.deepsecBang.map(asRankedLine)
  )
  section(
    "DeepsecBench highest score (ZDR+NPT)",
    lists.deepsecScore.map(asRankedLine)
  )
  section(
    "Discounted ZDR+NPT (cheaper provider than list)",
    lists.discounted.map(asRankedLine)
  )
  section(
    `Adopted cheap capable ZDR+NPT (blend ≤ $${CHEAP_BLEND_USD})`,
    lists.cheapCapable.map(asRankedLine)
  )
  section(
    "Top token share (ZDR+NPT adopted)",
    lists.tokenShare.map(asRankedLine)
  )
  section(
    "Top spend share (ZDR+NPT adopted)",
    lists.spendShare.map(asRankedLine)
  )

  console.log("\nTop labs (7-day token share)")
  for (const lab of labs) {
    console.log(
      `  ${lab.name.padEnd(16)}  tok=${pct(lab.tokensShare)}  spend=${pct(lab.spendShare)}  req=${pct(lab.requestsShare)}`
    )
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
  model: GatewaySnapshot["lists"]["deepsecBang"][number]
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
    cacheReadPerMillion: null,
    blendedPerMillion: model.blendedPerMillion,
    generationPerMillion: null,
    zdrBlendedPerMillion: model.zdrBlendedPerMillion,
    zdrProvider: model.zdrProvider,
    discounted: model.discounted,
    discountPercent: model.discountPercent,
    requestsShare: model.requestsShare,
    tokensShare: model.tokensShare,
    spendShare: model.spendShare,
    valueScore: model.valueScore,
    overpay: model.overpay,
    deepsecScore: model.deepsecScore,
    deepsecEffort: model.deepsecEffort,
    deepsecCost: model.deepsecCost,
    deepsecBang: model.deepsecBang,
    unitBang: null,
    description: "",
  }
}

async function main() {
  const snapshot = await buildGatewaySnapshot()
  const paths = await writeSnapshot(snapshot)
  printReport(snapshot)
  console.log(`\nWrote ${paths.join("\n      ")}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
