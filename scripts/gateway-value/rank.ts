/**
 * Pure ranking helpers for the AI Gateway cost-effectiveness script.
 *
 * Value = 7-day mean token share / blended $/1M (3× input + 1× output).
 * Overpay = 7-day mean spend share / token share.
 * Capable = tool-use + context ≥ 128K (vision is not required).
 * ZDR = catalog `zdr` is `all` or `some` (matches ?zdr=true).
 * NPT = catalog `no_training` is `all` or `some` (matches ?npt=true).
 * Privacy = ZDR and NPT.
 * Bang-for-buck = DeepsecBench score / run cost (Score vs Cost chart).
 * Discount = cheaper ZDR endpoint than list, or `pricing.discount` > 0.
 */
export const LOOKBACK_DAYS = 7
export const INPUT_WEIGHT = 3
export const OUTPUT_WEIGHT = 1
export const CHEAP_BLEND_USD = 0.5
export const MID_BLEND_USD = 3
export const MIN_CONTEXT = 128_000
export const MIN_DEEPSEC_SCORE = 12
export const MIN_DISCOUNT_PERCENT = 1
export const UNMATCHED_ID = "unmatched"

export const DEEPSEC_ID_ALIASES: Record<string, string> = {
  "xai/grok-4.5": "spacexai/grok-4.5",
  "xai/grok-4.6": "spacexai/grok-4.6",
}

export type ZdrLevel = "all" | "some" | "none"

export type LeaderboardMetric = "requests" | "tokens" | "spend"

export type GatewayPricing = {
  input?: string
  output?: string
  input_cache_read?: string
  input_cache_write?: string
}

export type GatewayModel = {
  id: string
  name: string
  description?: string
  owned_by: string
  type: string
  context_window?: number
  max_tokens?: number
  tags?: string[]
  pricing?: GatewayPricing
  zdr?: ZdrLevel
  no_training?: ZdrLevel
}

export type LeaderboardRow = {
  date: string
  name: string
  metric: LeaderboardMetric
  share_percent: number
}

export type Adoption = {
  requests: number
  tokens: number
  spend: number
}

export type DeepsecRow = {
  rank: number
  name: string
  effort: string
  id: string
  score: number
  recall: number
  precision: number
  issues: number
  total: number
  falsePositives: number
  costUsd: number
  time: string
  tokens: string
  harness: string
}

export type EndpointQuote = {
  provider: string
  hasZdr: boolean
  discount: number
  inputPerMillion: number | null
  outputPerMillion: number | null
  blendedPerMillion: number | null
}

export type RankedModel = {
  id: string
  name: string
  boardName: string
  provider: string | null
  unmatched: boolean
  tags: string[]
  contextWindow: number
  maxTokens: number
  zdr: ZdrLevel | null
  noTraining: ZdrLevel | null
  inputPerMillion: number | null
  outputPerMillion: number | null
  cacheReadPerMillion: number | null
  blendedPerMillion: number | null
  generationPerMillion: number | null
  zdrBlendedPerMillion: number | null
  zdrProvider: string | null
  discounted: boolean
  discountPercent: number | null
  requestsShare: number
  tokensShare: number
  spendShare: number
  valueScore: number | null
  overpay: number | null
  deepsecScore: number | null
  deepsecEffort: string | null
  deepsecCost: number | null
  deepsecBang: number | null
  unitBang: number | null
  description: string
}

export type CatalogIndex = {
  byName: Map<string, GatewayModel>
  byIdTail: Map<string, GatewayModel>
  byId: Map<string, GatewayModel>
}

const PREVIEW_SUFFIX = /\s*preview$/i

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

export function stripPreview(value: string): string {
  return value.replace(PREVIEW_SUFFIX, "").trim()
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function perMillion(perToken: number): number {
  return perToken * 1_000_000
}

export function blendedCost(
  inputPerMillion: number,
  outputPerMillion: number
): number {
  return (
    (inputPerMillion * INPUT_WEIGHT + outputPerMillion * OUTPUT_WEIGHT) /
    (INPUT_WEIGHT + OUTPUT_WEIGHT)
  )
}

export function generationCost(
  inputPerMillion: number,
  outputPerMillion: number
): number {
  return (inputPerMillion + outputPerMillion * 3) / 4
}

export function tokenValueScore(
  tokensShare: number,
  blendedPerMillion: number | null
): number | null {
  if (tokensShare <= 0 || blendedPerMillion == null || blendedPerMillion <= 0) {
    return null
  }
  return tokensShare / blendedPerMillion
}

export function spendOverpay(
  spendShare: number,
  tokensShare: number
): number | null {
  if (tokensShare <= 0 || spendShare <= 0) {
    return null
  }
  return spendShare / tokensShare
}

export function uniqueSortedDates(rows: LeaderboardRow[]): string[] {
  return [...new Set(rows.map((row) => row.date))].toSorted()
}

export function lookbackWindow(
  dates: string[],
  lookbackDays: number = LOOKBACK_DAYS
): { from: string; to: string; window: Set<string> } {
  if (dates.length === 0) {
    return { from: "", to: "", window: new Set() }
  }
  const slice = dates.slice(-lookbackDays)
  return {
    from: slice[0] ?? "",
    to: slice.at(-1) ?? "",
    window: new Set(slice),
  }
}

export function indexCatalog(models: GatewayModel[]): CatalogIndex {
  const byName = new Map<string, GatewayModel>()
  const byIdTail = new Map<string, GatewayModel>()
  const byId = new Map<string, GatewayModel>()

  for (const model of models) {
    byId.set(model.id, model)
    byName.set(normalizeName(model.name), model)
    byName.set(normalizeName(stripPreview(model.name)), model)
    const idTail = model.id.split("/").at(-1)
    if (idTail) {
      byIdTail.set(normalizeName(idTail), model)
    }
  }

  return { byName, byIdTail, byId }
}

export function matchCatalog(
  boardName: string,
  index: CatalogIndex
): GatewayModel | undefined {
  const exact = index.byName.get(normalizeName(boardName))
  if (exact) {
    return exact
  }

  const withoutPreview = index.byName.get(
    normalizeName(stripPreview(boardName))
  )
  if (withoutPreview) {
    return withoutPreview
  }

  return index.byIdTail.get(normalizeName(boardName))
}

export function matchModelId(
  id: string,
  index: CatalogIndex
): GatewayModel | undefined {
  const aliased = DEEPSEC_ID_ALIASES[id] ?? id
  return index.byId.get(aliased) ?? index.byId.get(id)
}

export function averageAdoption(
  rows: LeaderboardRow[],
  window: Set<string>
): Map<string, Adoption> {
  const buckets = new Map<
    string,
    { requests: number[]; tokens: number[]; spend: number[] }
  >()

  for (const row of rows) {
    if (!window.has(row.date) || row.name === "Other") {
      continue
    }
    const existing = buckets.get(row.name) ?? {
      requests: [],
      tokens: [],
      spend: [],
    }
    existing[row.metric].push(row.share_percent)
    buckets.set(row.name, existing)
  }

  const byName = new Map<string, Adoption>()
  for (const [name, metrics] of buckets) {
    byName.set(name, {
      requests: mean(metrics.requests),
      tokens: mean(metrics.tokens),
      spend: mean(metrics.spend),
    })
  }
  return byName
}

function pricingFrom(model: GatewayModel | undefined): {
  inputPerMillion: number | null
  outputPerMillion: number | null
  cacheReadPerMillion: number | null
  blendedPerMillion: number | null
  generationPerMillion: number | null
} {
  const input = toNumber(model?.pricing?.input)
  const output = toNumber(model?.pricing?.output)
  const cacheRead = toNumber(model?.pricing?.input_cache_read)

  if (input == null || output == null || input <= 0) {
    return {
      inputPerMillion: input == null ? null : perMillion(input),
      outputPerMillion: output == null ? null : perMillion(output),
      cacheReadPerMillion: cacheRead == null ? null : perMillion(cacheRead),
      blendedPerMillion: null,
      generationPerMillion: null,
    }
  }

  const inputPerMillion = perMillion(input)
  const outputPerMillion = perMillion(output)
  return {
    inputPerMillion,
    outputPerMillion,
    cacheReadPerMillion: cacheRead == null ? null : perMillion(cacheRead),
    blendedPerMillion: blendedCost(inputPerMillion, outputPerMillion),
    generationPerMillion: generationCost(inputPerMillion, outputPerMillion),
  }
}

export function rankFromCatalog(
  model: GatewayModel,
  adoption: Adoption | undefined
): RankedModel | null {
  const pricing = pricingFrom(model)
  if (pricing.blendedPerMillion == null) {
    return null
  }
  return toRanked(
    model.name,
    model,
    adoption ?? { requests: 0, tokens: 0, spend: 0 }
  )
}

export function rankFromBoard(
  boardName: string,
  model: GatewayModel | undefined,
  adoption: Adoption
): RankedModel {
  return toRanked(boardName, model, adoption)
}

function toRanked(
  boardName: string,
  model: GatewayModel | undefined,
  adoption: Adoption
): RankedModel {
  const pricing = pricingFrom(model)
  return {
    id: model?.id ?? UNMATCHED_ID,
    name: model?.name ?? boardName,
    boardName,
    provider: model?.owned_by ?? null,
    unmatched: model == null,
    tags: model?.tags ?? [],
    contextWindow: model?.context_window ?? 0,
    maxTokens: model?.max_tokens ?? 0,
    ...pricing,
    zdr: model?.zdr ?? null,
    noTraining: model?.no_training ?? null,
    zdrBlendedPerMillion: null,
    zdrProvider: null,
    discounted: false,
    discountPercent: null,
    requestsShare: adoption.requests,
    tokensShare: adoption.tokens,
    spendShare: adoption.spend,
    valueScore: tokenValueScore(adoption.tokens, pricing.blendedPerMillion),
    overpay: spendOverpay(adoption.spend, adoption.tokens),
    deepsecScore: null,
    deepsecEffort: null,
    deepsecCost: null,
    deepsecBang: null,
    unitBang: null,
    description: model?.description ?? "",
  }
}

function isEligibleLevel(level: ZdrLevel | null): boolean {
  return level === "all" || level === "some"
}

export function hasZdr(model: RankedModel): boolean {
  return isEligibleLevel(model.zdr)
}

export function hasNoTraining(model: RankedModel): boolean {
  return isEligibleLevel(model.noTraining)
}

export function hasPrivacy(model: RankedModel): boolean {
  return hasZdr(model) && hasNoTraining(model)
}

export function effectiveBlend(model: RankedModel): number | null {
  return model.zdrBlendedPerMillion ?? model.blendedPerMillion
}

export function deepsecBangForBuck(
  score: number,
  costUsd: number
): number | null {
  if (score <= 0 || costUsd <= 0) {
    return null
  }
  return score / costUsd
}

export function unitBangForBuck(
  score: number | null,
  blendedPerMillion: number | null
): number | null {
  if (
    score == null ||
    score <= 0 ||
    blendedPerMillion == null ||
    blendedPerMillion <= 0
  ) {
    return null
  }
  return score / blendedPerMillion
}

export function summarizeDiscount(
  catalogBlend: number | null,
  quotes: EndpointQuote[]
): {
  discounted: boolean
  discountPercent: number | null
  zdrBlended: number | null
  zdrProvider: string | null
} {
  const zdrQuotes = quotes.filter(
    (quote) => quote.hasZdr && quote.blendedPerMillion != null
  )
  const best = zdrQuotes
    .toSorted(
      (left, right) =>
        (left.blendedPerMillion ?? Number.POSITIVE_INFINITY) -
        (right.blendedPerMillion ?? Number.POSITIVE_INFINITY)
    )
    .at(0)
  const apiDiscount = Math.max(0, ...quotes.map((quote) => quote.discount))
  let priceDiscount = 0
  if (
    catalogBlend != null &&
    catalogBlend > 0 &&
    best?.blendedPerMillion != null &&
    best.blendedPerMillion < catalogBlend
  ) {
    priceDiscount = (1 - best.blendedPerMillion / catalogBlend) * 100
  }
  const discountPercent = Math.max(apiDiscount * 100, priceDiscount)
  return {
    discounted: discountPercent >= MIN_DISCOUNT_PERCENT,
    discountPercent: discountPercent > 0 ? discountPercent : null,
    zdrBlended: best?.blendedPerMillion ?? null,
    zdrProvider: best?.provider ?? null,
  }
}

export function attachEndpoints(
  model: RankedModel,
  quotes: EndpointQuote[]
): RankedModel {
  const summary = summarizeDiscount(model.blendedPerMillion, quotes)
  const nextBlend = summary.zdrBlended ?? model.blendedPerMillion
  return {
    ...model,
    zdrBlendedPerMillion: summary.zdrBlended,
    zdrProvider: summary.zdrProvider,
    discounted: summary.discounted,
    discountPercent: summary.discountPercent,
    valueScore: tokenValueScore(model.tokensShare, nextBlend),
    unitBang: unitBangForBuck(model.deepsecScore, nextBlend),
  }
}

export function bestDeepsecRun(
  rows: DeepsecRow[],
  minScore: number = MIN_DEEPSEC_SCORE
): DeepsecRow | null {
  if (rows.length === 0) {
    return null
  }
  const qualifying = rows.filter((row) => row.score >= minScore)
  const pool = qualifying.length > 0 ? qualifying : rows
  return (
    pool
      .toSorted((left, right) => {
        const leftBang = deepsecBangForBuck(left.score, left.costUsd) ?? 0
        const rightBang = deepsecBangForBuck(right.score, right.costUsd) ?? 0
        if (rightBang !== leftBang) {
          return rightBang - leftBang
        }
        return right.score - left.score
      })
      .at(0) ?? null
  )
}

export function bestDeepsecScore(rows: DeepsecRow[]): DeepsecRow | null {
  return rows.toSorted((left, right) => right.score - left.score).at(0) ?? null
}

export function attachDeepsec(
  model: RankedModel,
  rows: DeepsecRow[]
): RankedModel {
  const efficient = bestDeepsecRun(rows)
  const highest = bestDeepsecScore(rows)
  const score = highest?.score ?? null
  return {
    ...model,
    deepsecScore: score,
    deepsecEffort: efficient?.effort ?? highest?.effort ?? null,
    deepsecCost: efficient?.costUsd ?? highest?.costUsd ?? null,
    deepsecBang:
      efficient == null
        ? null
        : deepsecBangForBuck(efficient.score, efficient.costUsd),
    unitBang: unitBangForBuck(score, effectiveBlend(model)),
  }
}

export function hasAdoption(model: RankedModel): boolean {
  return (
    model.requestsShare > 0 || model.tokensShare > 0 || model.spendShare > 0
  )
}

export function isCapable(model: RankedModel): boolean {
  return (
    !model.unmatched &&
    model.tags.includes("tool-use") &&
    model.contextWindow >= MIN_CONTEXT &&
    model.blendedPerMillion != null &&
    model.blendedPerMillion > 0
  )
}

export function pickDefaultWorkhorse(
  leaderboard: RankedModel[]
): RankedModel | null {
  const candidates = leaderboard.filter(
    (model) =>
      hasPrivacy(model) &&
      isCapable(model) &&
      effectiveBlend(model) != null &&
      (effectiveBlend(model) ?? Number.POSITIVE_INFINITY) <= MID_BLEND_USD
  )
  const withBench = candidates.filter((model) => model.deepsecBang != null)
  const pool = withBench.length > 0 ? withBench : candidates
  return (
    pool
      .toSorted((left, right) => {
        const leftBang =
          left.unitBang ?? left.deepsecBang ?? left.valueScore ?? 0
        const rightBang =
          right.unitBang ?? right.deepsecBang ?? right.valueScore ?? 0
        if (rightBang !== leftBang) {
          return rightBang - leftBang
        }
        return (effectiveBlend(left) ?? 0) - (effectiveBlend(right) ?? 0)
      })
      .at(0) ?? null
  )
}

export function pickCheapRouter(models: RankedModel[]): RankedModel | null {
  const adopted = models.filter(
    (model) =>
      hasPrivacy(model) &&
      isCapable(model) &&
      hasAdoption(model) &&
      effectiveBlend(model) != null &&
      (effectiveBlend(model) ?? Number.POSITIVE_INFINITY) <= CHEAP_BLEND_USD
  )
  const pool =
    adopted.length > 0
      ? adopted
      : models.filter((model) => hasPrivacy(model) && isCapable(model))
  return (
    pool
      .toSorted((left, right) => {
        if (left.discounted !== right.discounted) {
          return Number(right.discounted) - Number(left.discounted)
        }
        return (
          (effectiveBlend(left) ?? Number.POSITIVE_INFINITY) -
          (effectiveBlend(right) ?? Number.POSITIVE_INFINITY)
        )
      })
      .at(0) ?? null
  )
}

export function pickFrontier(leaderboard: RankedModel[]): RankedModel | null {
  const withScore = leaderboard.filter(
    (model) =>
      hasPrivacy(model) && isCapable(model) && model.deepsecScore != null
  )
  if (withScore.length > 0) {
    return (
      withScore
        .toSorted((left, right) => {
          const scoreDelta =
            (right.deepsecScore ?? 0) - (left.deepsecScore ?? 0)
          if (scoreDelta !== 0) {
            return scoreDelta
          }
          return (right.deepsecBang ?? 0) - (left.deepsecBang ?? 0)
        })
        .at(0) ?? null
    )
  }

  const withOverpay = leaderboard.filter(
    (model) => hasPrivacy(model) && isCapable(model) && model.overpay != null
  )
  if (withOverpay.length > 0) {
    return (
      withOverpay
        .toSorted((left, right) => {
          const overpayDelta = (right.overpay ?? 0) - (left.overpay ?? 0)
          if (overpayDelta !== 0) {
            return overpayDelta
          }
          return right.spendShare - left.spendShare
        })
        .at(0) ?? null
    )
  }

  return (
    leaderboard
      .filter(
        (model) => hasPrivacy(model) && isCapable(model) && model.spendShare > 0
      )
      .toSorted((left, right) => right.spendShare - left.spendShare)
      .at(0) ?? null
  )
}

export function pickBangForBuck(models: RankedModel[]): RankedModel | null {
  const qualifying = models.filter(
    (model) =>
      hasPrivacy(model) &&
      model.deepsecBang != null &&
      (model.deepsecScore ?? 0) >= MIN_DEEPSEC_SCORE
  )
  const pool =
    qualifying.length > 0
      ? qualifying
      : models.filter((model) => hasPrivacy(model) && model.deepsecBang != null)
  return (
    pool
      .toSorted((left, right) => {
        const bangDelta = (right.deepsecBang ?? 0) - (left.deepsecBang ?? 0)
        if (bangDelta !== 0) {
          return bangDelta
        }
        return (right.deepsecScore ?? 0) - (left.deepsecScore ?? 0)
      })
      .at(0) ?? null
  )
}

export function byValueScore(left: RankedModel, right: RankedModel): number {
  return (right.valueScore ?? 0) - (left.valueScore ?? 0)
}

export function byBlendedPrice(left: RankedModel, right: RankedModel): number {
  return (
    (left.blendedPerMillion ?? Number.POSITIVE_INFINITY) -
    (right.blendedPerMillion ?? Number.POSITIVE_INFINITY)
  )
}

export function byTokenShare(left: RankedModel, right: RankedModel): number {
  return right.tokensShare - left.tokensShare
}

export function bySpendShare(left: RankedModel, right: RankedModel): number {
  return right.spendShare - left.spendShare
}

export function byDeepsecBang(left: RankedModel, right: RankedModel): number {
  return (right.deepsecBang ?? 0) - (left.deepsecBang ?? 0)
}

export function byDeepsecScore(left: RankedModel, right: RankedModel): number {
  return (right.deepsecScore ?? 0) - (left.deepsecScore ?? 0)
}

export function byDiscount(left: RankedModel, right: RankedModel): number {
  return (right.discountPercent ?? 0) - (left.discountPercent ?? 0)
}
