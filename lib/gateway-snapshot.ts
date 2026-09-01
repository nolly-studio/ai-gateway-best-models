export const SNAPSHOT_SCHEMA_VERSION = 6
export const SNAPSHOT_LIST_LIMIT = 20
export const HISTORY_SCHEMA_VERSION = 4
export const SNAPSHOT_RELATIVE_PATH = "public/data/gateway.json"
export const HISTORY_RELATIVE_PATH = "public/data/history.json"
export const WEEKS_RELATIVE_DIR = "public/data/weeks"

export const SNAPSHOT_LANE_KEYS = ["privacy", "open"] as const

export const SNAPSHOT_PICK_KEYS = [
  "bangForBuck",
  "workhorse",
  "cheapRouter",
  "frontier",
  "rising",
] as const satisfies readonly SnapshotPickKey[]

export function weekSnapshotRelativePath(week: string): string {
  return `${WEEKS_RELATIVE_DIR}/${week}.json`
}

export function weekSnapshotPublicPath(week: string): string {
  return `/data/weeks/${week}.json`
}

export function weekPagePath(week: string): string {
  return `/week/${week}`
}

export const CATALOG_URL = "https://ai-gateway.vercel.sh/v1/models"
export const MODELS_PAGE_URL = "https://vercel.com/ai-gateway/models"
export const MODELS_LEADERBOARD_URL =
  "https://vercel.com/api/ai/leaderboard-export?dataset=models&modality=text"
export const LABS_LEADERBOARD_URL =
  "https://vercel.com/api/ai/leaderboard-export?dataset=labs&modality=text"
export const DEEPSEC_RESULTS_URL =
  "https://vercel.com/ai-gateway/leaderboards/deepsecbench/results.json"
export const AA_API_URL =
  "https://artificialanalysis.ai/api/v2/language/models/free"
export const AA_BENCHMARKS_URL =
  "https://openrouter.ai/api/v1/benchmarks?source=artificial-analysis&max_results=100"
export const AA_MODELS_URL = "https://openrouter.ai/api/v1/models"
export const AA_ATTRIBUTION =
  "Intelligence, coding, and agentic indices: Artificial Analysis, CC BY 4.0. OpenRouter is the fallback when the AA key is missing."

export const ATTRIBUTION_TEXT =
  "© 2026 Vercel. AI Gateway Leaderboard Data is licensed under CC BY 4.0."
export const ATTRIBUTION_LICENSE = "CC-BY-4.0"
export const ATTRIBUTION_LICENSE_URL =
  "https://creativecommons.org/licenses/by/4.0/"

export type SnapshotZdr = "all" | "some" | "none"

/**
 * One complete DeepsecBench run: the score, the reasoning effort, and the
 * cost all belong to the same execution. Never mix fields across runs.
 */
export type SnapshotDeepsecRun = {
  score: number
  effort: string
  costUsd: number
  /** score / costUsd for this run */
  bang: number | null
}

export type SnapshotModel = {
  id: string
  name: string
  href: string
  provider: string | null
  tags: string[]
  zdr: SnapshotZdr | null
  noTraining: SnapshotZdr | null
  contextWindow: number
  inputPerMillion: number | null
  outputPerMillion: number | null
  blendedPerMillion: number | null
  /**
   * Blend at the endpoint the lane would actually route through, when it
   * differs from list. Privacy lane: cheapest ZDR endpoint (may exceed list).
   * Open lane: cheapest endpoint, set only when it beats list. Field names
   * predate the open lane and are kept for snapshot compatibility.
   */
  zdrBlendedPerMillion: number | null
  zdrProvider: string | null
  discounted: boolean
  discountPercent: number | null
  requestsShare: number
  tokensShare: number
  spendShare: number
  valueScore: number | null
  overpay: number | null
  /** Run with the highest score (frontier's number). */
  deepsecBest: SnapshotDeepsecRun | null
  /** Run with the best score per dollar (bang's number). */
  deepsecValue: SnapshotDeepsecRun | null
  /** Lowest published effort run (workhorse's everyday quality number). */
  deepsecEveryday: SnapshotDeepsecRun | null
  /** Artificial Analysis indices. Frontier ranks on intelligence; never mixed with Deepsec. */
  aa: SnapshotAaIndices | null
}

export type SnapshotAaIndices = {
  intelligence: number | null
  coding: number | null
  agentic: number | null
}

export type SnapshotLabBang = Record<SnapshotLaneKey, SnapshotModel[]>

export type SnapshotLab = {
  name: string
  requestsShare: number
  tokensShare: number
  spendShare: number
  /** Capable Deepsec value-runs for this lab, unsliced, per lane. */
  bang: SnapshotLabBang
}

export function emptyLabBang(): SnapshotLabBang {
  return {
    privacy: [],
    open: [],
  }
}

export type SnapshotPickKey =
  | "bangForBuck"
  | "workhorse"
  | "cheapRouter"
  | "frontier"
  | "rising"

export type SnapshotLaneKey = (typeof SNAPSHOT_LANE_KEYS)[number]

export type SnapshotPicks = Record<SnapshotPickKey, SnapshotModel | null>

export type SnapshotLists = {
  aaIntelligence: SnapshotModel[]
  aaCoding: SnapshotModel[]
  deepsecBang: SnapshotModel[]
  deepsecScore: SnapshotModel[]
  discounted: SnapshotModel[]
  cheapCapable: SnapshotModel[]
  tokenShare: SnapshotModel[]
  spendShare: SnapshotModel[]
}

export type SnapshotAnalysis = {
  modelId: string
  headline: string
  summary: string
  pickNotes: Partial<Record<SnapshotPickKey, string>>
}

export type GatewaySnapshot = {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION
  generatedAt: string
  window: { from: string; to: string; lookbackDays: number }
  sources: {
    catalog: string
    models: string
    labs: string
    deepsec: string
    aa: string
  }
  attribution: {
    text: string
    license: string
    licenseUrl: string
  }
  stats: {
    languageModels: number
    zdrModels: number
    privacyModels: number
    deepsecRuns: number
    aaModels: number
  }
  picks: Record<SnapshotLaneKey, SnapshotPicks>
  lists: Record<SnapshotLaneKey, SnapshotLists>
  labs: SnapshotLab[]
  unmatched: {
    leaderboard: string[]
    deepsec: string[]
    aa: string[]
  }
  analysis: SnapshotAnalysis | null
}

export type HistoryPickMetrics = {
  tokensShare: number
  zdrBlendedPerMillion: number | null
  deepsecBang: number | null
  valueScore: number | null
}

export type HistoryLanePicks = Record<SnapshotPickKey, string | null>
export type HistoryLaneMetrics = Partial<
  Record<SnapshotPickKey, HistoryPickMetrics>
>

export type HistoryWeek = {
  week: string
  from: string
  generatedAt: string
  href: string
  stats: GatewaySnapshot["stats"]
  picks: Record<SnapshotLaneKey, HistoryLanePicks>
  pickMetrics: Record<SnapshotLaneKey, HistoryLaneMetrics>
  /** Catalog ids → 7-day token share, used for rising week-over-week growth. */
  tokenShares?: Record<string, number>
}

export type GatewayHistory = {
  schemaVersion: typeof HISTORY_SCHEMA_VERSION
  weeks: HistoryWeek[]
}

export function emptyHistory(): GatewayHistory {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    weeks: [],
  }
}

function toPickMetrics(model: SnapshotModel): HistoryPickMetrics {
  return {
    tokensShare: model.tokensShare,
    zdrBlendedPerMillion: model.zdrBlendedPerMillion,
    deepsecBang: model.deepsecValue?.bang ?? null,
    valueScore: model.valueScore,
  }
}

export function emptyHistoryLanePicks(): HistoryLanePicks {
  return {
    bangForBuck: null,
    workhorse: null,
    cheapRouter: null,
    frontier: null,
    rising: null,
  }
}

export function tokenSharesFromModels(
  models: Iterable<{ id: string; tokensShare: number }>
): Record<string, number> {
  const shares: Record<string, number> = {}
  for (const model of models) {
    if (model.tokensShare > 0) {
      shares[model.id] = model.tokensShare
    }
  }
  return shares
}

export function priorWeekTokenShares(
  history: GatewayHistory,
  beforeWeek: string
): Record<string, number> | undefined {
  const prior = history.weeks
    .filter((week) => week.week < beforeWeek && week.tokenShares != null)
    .at(-1)
  if (prior?.tokenShares == null || Object.keys(prior.tokenShares).length === 0) {
    return undefined
  }
  return prior.tokenShares
}

export function toHistoryWeek(
  snapshot: GatewaySnapshot,
  tokenShares?: Record<string, number>
): HistoryWeek {
  const picks = {} as Record<SnapshotLaneKey, HistoryLanePicks>
  const pickMetrics = {} as Record<SnapshotLaneKey, HistoryLaneMetrics>

  for (const lane of SNAPSHOT_LANE_KEYS) {
    const lanePicks = emptyHistoryLanePicks()
    const laneMetrics: HistoryLaneMetrics = {}
    for (const key of SNAPSHOT_PICK_KEYS) {
      const model = snapshot.picks[lane][key]
      lanePicks[key] = model?.id ?? null
      if (model) {
        laneMetrics[key] = toPickMetrics(model)
      }
    }
    picks[lane] = lanePicks
    pickMetrics[lane] = laneMetrics
  }

  return {
    week: snapshot.window.to,
    from: snapshot.window.from,
    generatedAt: snapshot.generatedAt,
    href: weekSnapshotPublicPath(snapshot.window.to),
    stats: snapshot.stats,
    picks,
    pickMetrics,
    ...(tokenShares != null && Object.keys(tokenShares).length > 0
      ? { tokenShares }
      : {}),
  }
}

export function upsertHistory(
  history: GatewayHistory,
  week: HistoryWeek
): GatewayHistory {
  const weeks = [
    ...history.weeks.filter((row) => row.week !== week.week),
    week,
  ].toSorted((left, right) => left.week.localeCompare(right.week))

  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    weeks,
  }
}
