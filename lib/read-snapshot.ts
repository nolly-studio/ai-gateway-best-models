import { readFile } from "node:fs/promises"
import { join } from "node:path"

import {
  AA_API_URL,
  HISTORY_RELATIVE_PATH,
  HISTORY_SCHEMA_VERSION,
  SNAPSHOT_LANE_KEYS,
  SNAPSHOT_PICK_KEYS,
  SNAPSHOT_RELATIVE_PATH,
  SNAPSHOT_SCHEMA_VERSION,
  emptyHistory,
  emptyHistoryLanePicks,
  weekSnapshotRelativePath,
  type GatewayHistory,
  type GatewaySnapshot,
  type SnapshotDeepsecRun,
  type SnapshotLab,
  type SnapshotLaneKey,
  type SnapshotLists,
  type SnapshotModel,
  type SnapshotPickKey,
  type SnapshotPicks,
} from "@/lib/gateway-snapshot"
import { sameLab } from "@/lib/providers"

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

/** Schema v2 stored flat DeepsecBench fields fused across two runs. */
type LegacyModel = SnapshotModel & {
  deepsecScore?: number | null
  deepsecEffort?: string | null
  deepsecCost?: number | null
  deepsecBang?: number | null
}

type LegacySnapshot = Omit<
  GatewaySnapshot,
  "schemaVersion" | "picks" | "lists" | "sources" | "stats" | "unmatched"
> & {
  schemaVersion: number
  sources: GatewaySnapshot["sources"] & { aa?: string }
  stats: GatewaySnapshot["stats"] & { aaModels?: number }
  unmatched: GatewaySnapshot["unmatched"] & { aa?: string[] }
  picks: Record<
    SnapshotLaneKey,
    Partial<Record<SnapshotPickKey, LegacyModel | null>>
  >
  lists: Record<
    SnapshotLaneKey,
    Partial<Record<keyof SnapshotLists, LegacyModel[]>>
  >
  labs: Array<Omit<SnapshotLab, "bang"> & { bang?: SnapshotLab["bang"] }>
}

function normalizeModel(model: LegacyModel): SnapshotModel {
  if (model.deepsecBest !== undefined) {
    return { ...model, aa: model.aa ?? null }
  }
  const { deepsecScore, deepsecEffort, deepsecCost, deepsecBang, ...rest } =
    model
  // v2 mixed the best run's score with the value run's cost/effort. The
  // archive keeps the numbers it published, attributed to both run slots.
  const legacyRun: SnapshotDeepsecRun | null =
    deepsecScore == null
      ? null
      : {
          score: deepsecScore,
          effort: deepsecEffort ?? "",
          costUsd: deepsecCost ?? 0,
          bang: deepsecBang ?? null,
        }
  return {
    ...rest,
    deepsecBest: legacyRun,
    deepsecValue: legacyRun,
    deepsecEveryday: null,
    aa: model.aa ?? null,
  }
}

function normalizeSnapshot(raw: LegacySnapshot): GatewaySnapshot {
  const picks = {} as GatewaySnapshot["picks"]
  const lists = {} as GatewaySnapshot["lists"]
  for (const lane of SNAPSHOT_LANE_KEYS) {
    const lanePicks = {} as SnapshotPicks
    for (const key of SNAPSHOT_PICK_KEYS) {
      const model = raw.picks[lane]?.[key] ?? null
      lanePicks[key] = model == null ? null : normalizeModel(model)
    }
    picks[lane] = lanePicks
    const rawLists = raw.lists[lane]
    lists[lane] = {
      aaIntelligence: (rawLists.aaIntelligence ?? []).map(normalizeModel),
      aaCoding: (rawLists.aaCoding ?? []).map(normalizeModel),
      deepsecBang: (rawLists.deepsecBang ?? []).map(normalizeModel),
      deepsecScore: (rawLists.deepsecScore ?? []).map(normalizeModel),
      discounted: (rawLists.discounted ?? []).map(normalizeModel),
      cheapCapable: (rawLists.cheapCapable ?? []).map(normalizeModel),
      tokenShare: (rawLists.tokenShare ?? []).map(normalizeModel),
      spendShare: (rawLists.spendShare ?? []).map(normalizeModel),
    }
  }
  return {
    ...raw,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    sources: {
      ...raw.sources,
      aa: raw.sources.aa ?? AA_API_URL,
    },
    stats: {
      ...raw.stats,
      aaModels: raw.stats.aaModels ?? 0,
    },
    unmatched: {
      ...raw.unmatched,
      aa: raw.unmatched.aa ?? [],
    },
    picks,
    lists,
    labs: raw.labs.map((lab) => ({
      ...lab,
      bang: lab.bang ?? {
        privacy: lists.privacy.deepsecBang.filter((model) =>
          sameLab(model.provider, lab.name)
        ),
        open: lists.open.deepsecBang.filter((model) =>
          sameLab(model.provider, lab.name)
        ),
      },
    })),
  }
}

function normalizeHistory(history: GatewayHistory): GatewayHistory {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    weeks: history.weeks.map((week) => ({
      ...week,
      picks: {
        privacy: { ...emptyHistoryLanePicks(), ...week.picks.privacy },
        open: { ...emptyHistoryLanePicks(), ...week.picks.open },
      },
    })),
  }
}

export async function readSnapshot(): Promise<GatewaySnapshot> {
  const raw = await readFile(
    join(process.cwd(), SNAPSHOT_RELATIVE_PATH),
    "utf8"
  )
  return normalizeSnapshot(JSON.parse(raw) as LegacySnapshot)
}

export async function readHistory(): Promise<GatewayHistory> {
  try {
    const raw = await readFile(
      join(process.cwd(), HISTORY_RELATIVE_PATH),
      "utf8"
    )
    return normalizeHistory(JSON.parse(raw) as GatewayHistory)
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return emptyHistory()
    }
    throw error
  }
}

export async function readWeekSnapshot(
  week: string
): Promise<GatewaySnapshot | null> {
  try {
    const raw = await readFile(
      join(process.cwd(), weekSnapshotRelativePath(week)),
      "utf8"
    )
    return normalizeSnapshot(JSON.parse(raw) as LegacySnapshot)
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return null
    }
    throw error
  }
}
