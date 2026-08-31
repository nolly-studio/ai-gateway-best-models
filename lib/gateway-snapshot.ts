export const SNAPSHOT_SCHEMA_VERSION = 2
export const HISTORY_SCHEMA_VERSION = 2
export const SNAPSHOT_RELATIVE_PATH = "public/data/gateway.json"
export const HISTORY_RELATIVE_PATH = "public/data/history.json"
export const WEEKS_RELATIVE_DIR = "public/data/weeks"

export const SNAPSHOT_LANE_KEYS = ["privacy", "open"] as const

export const SNAPSHOT_PICK_KEYS = [
  "bangForBuck",
  "workhorse",
  "cheapRouter",
  "frontier",
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
export const MODELS_LEADERBOARD_URL =
  "https://vercel.com/api/ai/leaderboard-export?dataset=models&modality=text"
export const LABS_LEADERBOARD_URL =
  "https://vercel.com/api/ai/leaderboard-export?dataset=labs&modality=text"
export const DEEPSEC_RESULTS_URL =
  "https://vercel.com/ai-gateway/leaderboards/deepsecbench/results.json"

export const ATTRIBUTION_TEXT =
  "© 2026 Vercel. AI Gateway Leaderboard Data is licensed under CC BY 4.0."
export const ATTRIBUTION_LICENSE = "CC-BY-4.0"
export const ATTRIBUTION_LICENSE_URL =
  "https://creativecommons.org/licenses/by/4.0/"

export type SnapshotZdr = "all" | "some" | "none"

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
}

export type SnapshotLab = {
  name: string
  requestsShare: number
  tokensShare: number
  spendShare: number
}

export type SnapshotPickKey =
  "bangForBuck" | "workhorse" | "cheapRouter" | "frontier"

export type SnapshotLaneKey = (typeof SNAPSHOT_LANE_KEYS)[number]

export type SnapshotPicks = Record<SnapshotPickKey, SnapshotModel | null>

export type SnapshotLists = {
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
  }
  picks: Record<SnapshotLaneKey, SnapshotPicks>
  lists: Record<SnapshotLaneKey, SnapshotLists>
  labs: SnapshotLab[]
  unmatched: {
    leaderboard: string[]
    deepsec: string[]
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
    deepsecBang: model.deepsecBang,
    valueScore: model.valueScore,
  }
}

export function emptyHistoryLanePicks(): HistoryLanePicks {
  return {
    bangForBuck: null,
    workhorse: null,
    cheapRouter: null,
    frontier: null,
  }
}

export function toHistoryWeek(snapshot: GatewaySnapshot): HistoryWeek {
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
