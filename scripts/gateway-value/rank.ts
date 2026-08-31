/**
 * Pure ranking helpers for the AI Gateway cost-effectiveness script.
 *
 * Value = 7-day mean token share / effective blended $/1M (3× input + 1× output).
 *         Days a model is absent from the leaderboard count as zero share.
 * Effective blend is lane-aware: the privacy lane must route through a ZDR
 *   endpoint (its price governs even when above list); the open lane pays
 *   min(list, cheapest endpoint of any kind).
 * Overpay = 7-day mean spend share / token share.
 * Capable = tool-use + context ≥ 128K (vision is not required).
 * ZDR = catalog `zdr` is `all` or `some` (matches ?zdr=true).
 * NPT = catalog `no_training` is `all` or `some` (matches ?npt=true).
 * Privacy = ZDR and NPT. Pickers rank whatever pool they are given.
 * DeepsecBench runs are kept intact: a model carries up to three whole runs
 *   (best score, best score-per-run-dollar, lowest published effort) and
 *   each role reads the run that matches it. Score, effort, and cost are
 *   never mixed across runs.
 * Bang-for-buck = the value run's score / that same run's cost.
 * Frontier = highest best-run score; AA intelligence if nobody has Deepsec.
 * Workhorse = most capable model people actually run at mid price: adoption
 *   floor + everyday-run score, blend ≤ MID_BLEND_USD.
 * Rising = adopted capable model DeepsecBench has not benchmarked yet.
 * Discount = official AI Gateway list-vs-sale promo from the models page
 *   (`inputListCostTiers` vs current `inputCost`). Cheaper third-party
 *   endpoints are a routing price, not a sale. Must clear
 *   MIN_DISCOUNT_PERCENT so noise-level wobbles don't flip the flag.
 */
export const LOOKBACK_DAYS = 7
export const INPUT_WEIGHT = 3
export const OUTPUT_WEIGHT = 1
export const CHEAP_BLEND_USD = 0.5
export const MID_BLEND_USD = 3
export const MIN_CONTEXT = 128_000
export const MIN_DEEPSEC_SCORE = 12
export const MIN_DISCOUNT_PERCENT = 5
export const WORKHORSE_MIN_TOKEN_SHARE = 3
export const UNMATCHED_ID = "unmatched"

export const DEEPSEC_ID_ALIASES: Record<string, string> = {
  "xai/grok-4.5": "spacexai/grok-4.5",
  "xai/grok-4.6": "spacexai/grok-4.6",
  "x-ai/grok-4.5": "spacexai/grok-4.5",
  "x-ai/grok-4.6": "spacexai/grok-4.6",
}

const OPENROUTER_PREFIX_ALIASES: Record<string, string> = {
  "x-ai": "spacexai",
  "z-ai": "zai",
  qwen: "alibaba",
  "meta-llama": "meta",
  mistralai: "mistral",
}

/** Strip OpenRouter :variant suffixes and remap lab prefixes onto the catalog. */
export function canonicalOpenRouterId(id: string): string {
  const base = id.split(":")[0] ?? id
  const slash = base.indexOf("/")
  if (slash <= 0) {
    return base
  }
  const prefix = base.slice(0, slash)
  const rest = base.slice(slash + 1)
  const mapped = OPENROUTER_PREFIX_ALIASES[prefix]
  return mapped == null ? base : `${mapped}/${rest}`
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

/** Official models-page list vs current $/1M. */
export type OfficialPromo = {
  id: string
  inputPerMillion: number
  outputPerMillion: number
  listInputPerMillion: number
  listOutputPerMillion: number
  discountPercent: number
}

/**
 * One complete DeepsecBench run. Score, effort, and cost belong to the same
 * execution — never combine fields from different runs.
 */
export type DeepsecRunSummary = {
  score: number
  effort: string
  costUsd: number
  bang: number | null
}

/** Artificial Analysis headline indices (via OpenRouter). */
export type AaIndices = {
  intelligence: number | null
  coding: number | null
  agentic: number | null
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
  blendedPerMillion: number | null
  /**
   * Cheapest endpoint satisfying the lane's routing constraint, when it
   * governs the price actually paid: for the privacy lane this is the
   * cheapest ZDR endpoint (even if above list); for the open lane it is set
   * only when some endpoint beats the list price.
   */
  endpointBlendedPerMillion: number | null
  endpointProvider: string | null
  discounted: boolean
  discountPercent: number | null
  requestsShare: number
  tokensShare: number
  spendShare: number
  valueScore: number | null
  overpay: number | null
  /** Run with the highest score (frontier's number). */
  deepsecBest: DeepsecRunSummary | null
  /** Run with the best score per run dollar (bang's number). */
  deepsecValue: DeepsecRunSummary | null
  /** Lowest published effort run (workhorse's everyday quality number). */
  deepsecEveryday: DeepsecRunSummary | null
  /** Artificial Analysis indices. Never averaged with DeepsecBench. */
  aa: AaIndices | null
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

function total(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0)
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

/**
 * Last `lookbackDays` calendar days ending at the newest exported date.
 * Stale dates outside that range are excluded rather than padding the window.
 */
export function lookbackWindow(
  dates: string[],
  lookbackDays: number = LOOKBACK_DAYS
): { from: string; to: string; window: Set<string> } {
  const to = dates.at(-1)
  if (to === undefined) {
    return { from: "", to: "", window: new Set() }
  }
  const cutoffDate = new Date(`${to}T00:00:00Z`)
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (lookbackDays - 1))
  const cutoff = cutoffDate.toISOString().slice(0, 10)
  const slice = dates.filter((date) => date >= cutoff)
  return {
    from: slice[0] ?? "",
    to,
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
  return (
    index.byId.get(aliased) ??
    index.byId.get(id) ??
    index.byId.get(canonicalOpenRouterId(id))
  )
}

/**
 * Mean share over every day in the window. Days a model is missing from the
 * export count as zero, so a one-day spike is not treated like a full week
 * of adoption.
 */
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

  const days = Math.max(1, window.size)
  const byName = new Map<string, Adoption>()
  for (const [name, metrics] of buckets) {
    byName.set(name, {
      requests: total(metrics.requests) / days,
      tokens: total(metrics.tokens) / days,
      spend: total(metrics.spend) / days,
    })
  }
  return byName
}

function pricingFrom(model: GatewayModel | undefined): {
  inputPerMillion: number | null
  outputPerMillion: number | null
  blendedPerMillion: number | null
} {
  const input = toNumber(model?.pricing?.input)
  const output = toNumber(model?.pricing?.output)

  if (input == null || output == null || input <= 0) {
    return {
      inputPerMillion: input == null ? null : perMillion(input),
      outputPerMillion: output == null ? null : perMillion(output),
      blendedPerMillion: null,
    }
  }

  const inputPerMillion = perMillion(input)
  const outputPerMillion = perMillion(output)
  return {
    inputPerMillion,
    outputPerMillion,
    blendedPerMillion: blendedCost(inputPerMillion, outputPerMillion),
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
    endpointBlendedPerMillion: null,
    endpointProvider: null,
    discounted: false,
    discountPercent: null,
    requestsShare: adoption.requests,
    tokensShare: adoption.tokens,
    spendShare: adoption.spend,
    valueScore: tokenValueScore(adoption.tokens, pricing.blendedPerMillion),
    overpay: spendOverpay(adoption.spend, adoption.tokens),
    deepsecBest: null,
    deepsecValue: null,
    deepsecEveryday: null,
    aa: null,
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
  return model.endpointBlendedPerMillion ?? model.blendedPerMillion
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

/**
 * Summarize the endpoints a lane is allowed to route through.
 *
 * With `zdrOnly` the pool is ZDR endpoints and the cheapest one governs the
 * price even when it is above list (privacy routing cannot fall back to a
 * non-ZDR endpoint). Without it, any endpoint qualifies but list price is
 * always available, so an endpoint only governs when it beats list.
 * Sale badges come from `attachPromo`, not from a cheaper endpoint.
 */
export function summarizeDiscount(
  catalogBlend: number | null,
  quotes: EndpointQuote[],
  zdrOnly: boolean
): {
  discounted: boolean
  discountPercent: number | null
  endpointBlended: number | null
  endpointProvider: string | null
} {
  const eligible = zdrOnly ? quotes.filter((quote) => quote.hasZdr) : quotes
  // Zero-priced quotes are placeholder data, not free endpoints.
  const best = eligible
    .filter(
      (quote) => quote.blendedPerMillion != null && quote.blendedPerMillion > 0
    )
    .toSorted(
      (left, right) =>
        (left.blendedPerMillion ?? Number.POSITIVE_INFINITY) -
        (right.blendedPerMillion ?? Number.POSITIVE_INFINITY)
    )
    .at(0)

  const beatsList =
    best?.blendedPerMillion != null &&
    (catalogBlend == null || best.blendedPerMillion < catalogBlend)
  const governs = zdrOnly ? best != null : beatsList

  return {
    discounted: false,
    discountPercent: null,
    endpointBlended: governs ? (best?.blendedPerMillion ?? null) : null,
    endpointProvider: governs ? (best?.provider ?? null) : null,
  }
}

export function attachPromo(
  model: RankedModel,
  promo: OfficialPromo | undefined
): RankedModel {
  if (promo == null || promo.discountPercent < MIN_DISCOUNT_PERCENT) {
    return {
      ...model,
      discounted: false,
      discountPercent: null,
    }
  }
  return {
    ...model,
    discounted: true,
    discountPercent: promo.discountPercent,
  }
}

export function attachEndpoints(
  model: RankedModel,
  quotes: EndpointQuote[],
  zdrOnly: boolean
): RankedModel {
  const summary = summarizeDiscount(model.blendedPerMillion, quotes, zdrOnly)
  const nextBlend = summary.endpointBlended ?? model.blendedPerMillion
  return {
    ...model,
    endpointBlendedPerMillion: summary.endpointBlended,
    endpointProvider: summary.endpointProvider,
    discounted: summary.discounted,
    discountPercent: summary.discountPercent,
    valueScore: tokenValueScore(model.tokensShare, nextBlend),
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

const EFFORT_ORDER = [
  "minimal",
  "low",
  "default",
  "medium",
  "high",
  "xhigh",
  "max",
]

function effortRank(effort: string): number {
  const index = EFFORT_ORDER.indexOf(effort.toLowerCase())
  return index === -1 ? EFFORT_ORDER.length : index
}

/**
 * The run closest to production settings: lowest published reasoning effort,
 * ties broken by cheaper run. Effort is not a quality slider — it changes
 * tokens, dollars, and score together — so everyday quality must come from
 * an everyday run, not the xhigh showcase.
 */
export function everydayDeepsecRun(rows: DeepsecRow[]): DeepsecRow | null {
  return (
    rows
      .toSorted((left, right) => {
        const rankDelta = effortRank(left.effort) - effortRank(right.effort)
        if (rankDelta !== 0) {
          return rankDelta
        }
        return left.costUsd - right.costUsd
      })
      .at(0) ?? null
  )
}

function toRunSummary(row: DeepsecRow | null): DeepsecRunSummary | null {
  if (row == null) {
    return null
  }
  return {
    score: row.score,
    effort: row.effort,
    costUsd: row.costUsd,
    bang: deepsecBangForBuck(row.score, row.costUsd),
  }
}

export function attachDeepsec(
  model: RankedModel,
  rows: DeepsecRow[]
): RankedModel {
  return {
    ...model,
    deepsecBest: toRunSummary(bestDeepsecScore(rows)),
    deepsecValue: toRunSummary(bestDeepsecRun(rows)),
    deepsecEveryday: toRunSummary(everydayDeepsecRun(rows)),
  }
}

export function hasAaIndex(indices: AaIndices | null | undefined): boolean {
  return (
    indices != null &&
    (indices.intelligence != null ||
      indices.coding != null ||
      indices.agentic != null)
  )
}

export function attachAa(
  model: RankedModel,
  indices: AaIndices | undefined
): RankedModel {
  return {
    ...model,
    aa: hasAaIndex(indices) ? (indices ?? null) : null,
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

/**
 * Workhorse = the most capable model people actually run at mid price.
 * Not another price-efficiency sort: adoption gates entry, and quality comes
 * from the everyday (lowest published effort) DeepsecBench run, not the
 * xhigh showcase. Falls back to any adopted candidate when nothing clears
 * the token-share floor, and to adoption order when nothing is benchmarked.
 */
export function pickDefaultWorkhorse(
  leaderboard: RankedModel[]
): RankedModel | null {
  const affordable = leaderboard.filter(
    (model) =>
      isCapable(model) &&
      effectiveBlend(model) != null &&
      (effectiveBlend(model) ?? Number.POSITIVE_INFINITY) <= MID_BLEND_USD
  )
  const overFloor = affordable.filter(
    (model) => model.tokensShare >= WORKHORSE_MIN_TOKEN_SHARE
  )
  const pool =
    overFloor.length > 0 ? overFloor : affordable.filter(hasAdoption)
  const benchmarked = pool.filter((model) => model.deepsecEveryday != null)
  if (benchmarked.length > 0) {
    return (
      benchmarked
        .toSorted((left, right) => {
          const scoreDelta =
            (right.deepsecEveryday?.score ?? 0) -
            (left.deepsecEveryday?.score ?? 0)
          if (scoreDelta !== 0) {
            return scoreDelta
          }
          if (right.tokensShare !== left.tokensShare) {
            return right.tokensShare - left.tokensShare
          }
          return (effectiveBlend(left) ?? 0) - (effectiveBlend(right) ?? 0)
        })
        .at(0) ?? null
    )
  }
  return (
    pool
      .toSorted((left, right) => {
        if (right.tokensShare !== left.tokensShare) {
          return right.tokensShare - left.tokensShare
        }
        return (effectiveBlend(left) ?? 0) - (effectiveBlend(right) ?? 0)
      })
      .at(0) ?? null
  )
}

export function pickCheapRouter(models: RankedModel[]): RankedModel | null {
  const adopted = models.filter(
    (model) =>
      isCapable(model) &&
      hasAdoption(model) &&
      effectiveBlend(model) != null &&
      (effectiveBlend(model) ?? Number.POSITIVE_INFINITY) <= CHEAP_BLEND_USD
  )
  const pool = adopted.length > 0 ? adopted : models.filter(isCapable)
  // Cheapest effective price wins; a discount only breaks exact price ties.
  return (
    pool
      .toSorted((left, right) => {
        const priceDelta =
          (effectiveBlend(left) ?? Number.POSITIVE_INFINITY) -
          (effectiveBlend(right) ?? Number.POSITIVE_INFINITY)
        if (priceDelta !== 0) {
          return priceDelta
        }
        return Number(right.discounted) - Number(left.discounted)
      })
      .at(0) ?? null
  )
}

export function pickFrontier(leaderboard: RankedModel[]): RankedModel | null {
  const withScore = leaderboard.filter(
    (model) => isCapable(model) && model.deepsecBest != null
  )
  if (withScore.length > 0) {
    return (
      withScore
        .toSorted((left, right) => {
          const scoreDelta =
            (right.deepsecBest?.score ?? 0) - (left.deepsecBest?.score ?? 0)
          if (scoreDelta !== 0) {
            return scoreDelta
          }
          return (right.deepsecBest?.bang ?? 0) - (left.deepsecBest?.bang ?? 0)
        })
        .at(0) ?? null
    )
  }

  // DeepsecBench is the primary frontier signal. AA intelligence is only a
  // fallback so unbenchmarked capable models are not invisible.
  const withAa = leaderboard.filter(
    (model) => isCapable(model) && model.aa?.intelligence != null
  )
  if (withAa.length > 0) {
    return (
      withAa
        .toSorted((left, right) => {
          const intelDelta =
            (right.aa?.intelligence ?? 0) - (left.aa?.intelligence ?? 0)
          if (intelDelta !== 0) {
            return intelDelta
          }
          return (right.aa?.coding ?? 0) - (left.aa?.coding ?? 0)
        })
        .at(0) ?? null
    )
  }

  const withOverpay = leaderboard.filter(
    (model) => isCapable(model) && model.overpay != null
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
      .filter((model) => isCapable(model) && model.spendShare > 0)
      .toSorted((left, right) => right.spendShare - left.spendShare)
      .at(0) ?? null
  )
}

export function pickBangForBuck(models: RankedModel[]): RankedModel | null {
  // The floor applies to the value run's own score, so the ratio and the
  // quality gate describe the same execution.
  const qualifying = models.filter(
    (model) =>
      model.deepsecValue?.bang != null &&
      model.deepsecValue.score >= MIN_DEEPSEC_SCORE
  )
  const pool =
    qualifying.length > 0
      ? qualifying
      : models.filter((model) => model.deepsecValue?.bang != null)
  return (
    pool
      .toSorted((left, right) => {
        const bangDelta =
          (right.deepsecValue?.bang ?? 0) - (left.deepsecValue?.bang ?? 0)
        if (bangDelta !== 0) {
          return bangDelta
        }
        return (
          (right.deepsecValue?.score ?? 0) - (left.deepsecValue?.score ?? 0)
        )
      })
      .at(0) ?? null
  )
}

/**
 * Rising = the adopted capable model DeepsecBench has not caught yet.
 * Surfaces newcomers on real usage instead of leaving them out of the story
 * until a benchmark run lands. Self-retires as bench coverage grows.
 */
export function pickRising(models: RankedModel[]): RankedModel | null {
  return (
    models
      .filter(
        (model) =>
          isCapable(model) &&
          hasAdoption(model) &&
          model.deepsecBest == null &&
          (effectiveBlend(model) ?? Number.POSITIVE_INFINITY) <= MID_BLEND_USD
      )
      .toSorted((left, right) => {
        if (right.tokensShare !== left.tokensShare) {
          return right.tokensShare - left.tokensShare
        }
        return (
          (effectiveBlend(left) ?? Number.POSITIVE_INFINITY) -
          (effectiveBlend(right) ?? Number.POSITIVE_INFINITY)
        )
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
  return (right.deepsecValue?.bang ?? 0) - (left.deepsecValue?.bang ?? 0)
}

export function byDeepsecScore(left: RankedModel, right: RankedModel): number {
  return (right.deepsecBest?.score ?? 0) - (left.deepsecBest?.score ?? 0)
}

export function byDiscount(left: RankedModel, right: RankedModel): number {
  return (right.discountPercent ?? 0) - (left.discountPercent ?? 0)
}
