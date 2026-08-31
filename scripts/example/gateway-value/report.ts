/**
 * Rank Vercel AI Gateway language models by ZDR-safe bang-for-buck.
 *
 * Usage:
 *   pnpm gateway:value
 *
 * Data:
 *   Catalog       https://ai-gateway.vercel.sh/v1/models
 *   Endpoints     https://ai-gateway.vercel.sh/v1/models/{id}/endpoints
 *   Leaderboard   https://vercel.com/api/ai/leaderboard-export?dataset=models&modality=text
 *   DeepsecBench  https://vercel.com/ai-gateway/leaderboards/deepsecbench
 *   Filters       https://vercel.com/ai-gateway/models?discount=true&zdr=true
 *   License       CC BY 4.0 — © 2026 Vercel, AI Gateway Leaderboard Data
 */

import {
  fetchCatalog,
  fetchDeepsecBench,
  fetchEndpointQuotes,
  fetchLeaderboard,
} from "./fetch"
import {
  attachDeepsec,
  attachEndpoints,
  averageAdoption,
  byDeepsecBang,
  byDeepsecScore,
  byDiscount,
  bySpendShare,
  byTokenShare,
  CHEAP_BLEND_USD,
  hasAdoption,
  hasZdr,
  indexCatalog,
  isCapable,
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
  return [
    model.id.padEnd(42),
    `zdr=${zdr}`.padEnd(9),
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

async function main() {
  const [catalog, rows, deepsecRows] = await Promise.all([
    fetchCatalog(),
    fetchLeaderboard(),
    fetchDeepsecBench(),
  ])

  const dates = uniqueSortedDates(rows)
  const { from, to, window } = lookbackWindow(dates)
  const index = indexCatalog(catalog)
  const adoption = averageAdoption(rows, window)
  const adoptionById = adoptionByCatalogId(adoption, index)
  const deepsec = deepsecByCatalogId(deepsecRows, index)

  const scanIds = [
    ...new Set([
      ...catalog
        .filter((model) => model.zdr === "all" || model.zdr === "some")
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
  const bang = pickBangForBuck(zdrRanked)
  const workhorse = pickDefaultWorkhorse(leaderboard)
  const cheap = pickCheapRouter(zdrRanked)
  const frontier = pickFrontier(leaderboard)

  const unmatchedDeepsec = deepsecRows.filter(
    (row) => matchModelId(row.id, index) == null
  )

  console.log(
    `AI Gateway ZDR bang-for-buck  ·  ${from} → ${to}  ·  ${catalog.length} language models  ·  ${zdrRanked.length} ZDR`
  )
  console.log(
    "© 2026 Vercel. AI Gateway Leaderboard Data is licensed under CC BY 4.0."
  )
  console.log(
    `DeepsecBench ${deepsecRows.length} runs  ·  bang = score / run $  ·  floor score ≥ ${MIN_DEEPSEC_SCORE}`
  )
  console.log(
    "ZDR = catalog all|some  ·  discount = cheaper ZDR endpoint than list"
  )

  console.log("\nPicks (ZDR only)")
  console.log(`  BANG FOR BUCK  ${bang ? line(bang) : "none"}`)
  console.log(`  WORKHORSE      ${workhorse ? line(workhorse) : "none"}`)
  console.log(`  CHEAP ROUTER   ${cheap ? line(cheap) : "none"}`)
  console.log(`  FRONTIER       ${frontier ? line(frontier) : "none"}`)

  section(
    "DeepsecBench bang-for-buck (ZDR, score ≥ floor)",
    zdrRanked
      .filter(
        (model) =>
          model.deepsecBang != null &&
          (model.deepsecScore ?? 0) >= MIN_DEEPSEC_SCORE
      )
      .toSorted(byDeepsecBang)
      .slice(0, 12)
  )

  section(
    "DeepsecBench highest score (ZDR)",
    zdrRanked
      .filter((model) => model.deepsecScore != null)
      .toSorted(byDeepsecScore)
      .slice(0, 8)
  )

  section(
    "Discounted ZDR (cheaper provider than list)",
    zdrRanked.filter((model) => model.discounted).toSorted(byDiscount)
  )

  section(
    `Adopted cheap capable ZDR (blend ≤ $${CHEAP_BLEND_USD})`,
    zdrRanked
      .filter(
        (model) =>
          isCapable(model) &&
          hasAdoption(model) &&
          (model.zdrBlendedPerMillion ??
            model.blendedPerMillion ??
            Number.POSITIVE_INFINITY) <= CHEAP_BLEND_USD
      )
      .toSorted(
        (left, right) =>
          (left.zdrBlendedPerMillion ??
            left.blendedPerMillion ??
            Number.POSITIVE_INFINITY) -
          (right.zdrBlendedPerMillion ??
            right.blendedPerMillion ??
            Number.POSITIVE_INFINITY)
      )
  )

  section(
    "Top token share (ZDR adopted)",
    leaderboard.filter(hasZdr).toSorted(byTokenShare).slice(0, 8)
  )

  section(
    "Top spend share (ZDR adopted)",
    leaderboard.filter(hasZdr).toSorted(bySpendShare).slice(0, 8)
  )

  if (unmatchedDeepsec.length > 0) {
    console.log("\nUnmatched DeepsecBench ids")
    for (const row of unmatchedDeepsec) {
      console.log(`  ${row.id}  (${row.effort}, score=${row.score})`)
    }
  }

  if (unmatched.length > 0) {
    section("Unmatched leaderboard names", unmatched)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
