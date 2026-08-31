import {
  AA_BENCHMARKS_URL,
  ATTRIBUTION_LICENSE,
  ATTRIBUTION_LICENSE_URL,
  ATTRIBUTION_TEXT,
  CATALOG_URL,
  DEEPSEC_RESULTS_URL,
  LABS_LEADERBOARD_URL,
  MODELS_LEADERBOARD_URL,
  SNAPSHOT_SCHEMA_VERSION,
  type GatewaySnapshot,
  type SnapshotLab,
  type SnapshotLists,
  type SnapshotModel,
  type SnapshotPicks,
  type SnapshotZdr,
} from "../../lib/gateway-snapshot"
import {
  byDeepsecBang,
  byDeepsecScore,
  byDiscount,
  bySpendShare,
  byTokenShare,
  CHEAP_BLEND_USD,
  effectiveBlend,
  hasAdoption,
  isCapable,
  LOOKBACK_DAYS,
  MIN_DEEPSEC_SCORE,
  type Adoption,
  type RankedModel,
  type ZdrLevel,
} from "./rank"

export type RankedPicks = {
  bangForBuck: RankedModel | null
  workhorse: RankedModel | null
  cheapRouter: RankedModel | null
  frontier: RankedModel | null
  rising: RankedModel | null
}

export type RankedLists = {
  deepsecBang: RankedModel[]
  deepsecScore: RankedModel[]
  discounted: RankedModel[]
  cheapCapable: RankedModel[]
  tokenShare: RankedModel[]
  spendShare: RankedModel[]
}

export type SnapshotInput = {
  generatedAt?: string
  window: { from: string; to: string }
  languageModels: number
  zdrModels: number
  privacyModels: number
  deepsecRuns: number
  aaModels: number
  picks: {
    privacy: RankedPicks
    open: RankedPicks
  }
  lists: {
    privacy: RankedLists
    open: RankedLists
  }
  labs: Map<string, Adoption>
  unmatched: {
    leaderboard: string[]
    deepsec: string[]
    aa: string[]
  }
}

function modelHref(id: string): string {
  const slug = id.split("/").at(-1) ?? id
  return `https://vercel.com/ai-gateway/models/${slug}`
}

function toSnapshotZdr(zdr: ZdrLevel | null): SnapshotZdr | null {
  if (zdr === null) {
    return null
  }
  switch (zdr) {
    case "all":
    case "some":
    case "none":
      return zdr
    default: {
      const _exhaustive: never = zdr
      return _exhaustive
    }
  }
}

export function toSnapshotModel(model: RankedModel): SnapshotModel {
  return {
    id: model.id,
    name: model.name,
    href: modelHref(model.id),
    provider: model.provider,
    tags: model.tags,
    zdr: toSnapshotZdr(model.zdr),
    noTraining: toSnapshotZdr(model.noTraining),
    contextWindow: model.contextWindow,
    inputPerMillion: model.inputPerMillion,
    outputPerMillion: model.outputPerMillion,
    blendedPerMillion: model.blendedPerMillion,
    // Schema keeps the historical zdr* field names; since schema v2 they hold
    // the lane's governing endpoint (ZDR-only in the privacy lane, cheapest
    // list-beating endpoint in the open lane).
    zdrBlendedPerMillion: model.endpointBlendedPerMillion,
    zdrProvider: model.endpointProvider,
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
  }
}

export function toSnapshotLabs(
  adoption: Map<string, Adoption>,
  limit = 10
): SnapshotLab[] {
  return [...adoption.entries()]
    .map(([name, metrics]) => ({
      name,
      requestsShare: metrics.requests,
      tokensShare: metrics.tokens,
      spendShare: metrics.spend,
    }))
    .toSorted((left, right) => right.tokensShare - left.tokensShare)
    .slice(0, limit)
}

export function buildLists(
  ranked: RankedModel[],
  leaderboard: RankedModel[]
): RankedLists {
  return {
    deepsecBang: ranked
      .filter(
        (model) =>
          model.deepsecValue?.bang != null &&
          model.deepsecValue.score >= MIN_DEEPSEC_SCORE
      )
      .toSorted(byDeepsecBang)
      .slice(0, 12),
    deepsecScore: ranked
      .filter((model) => model.deepsecBest != null)
      .toSorted(byDeepsecScore)
      .slice(0, 8),
    discounted: ranked.filter((model) => model.discounted).toSorted(byDiscount),
    cheapCapable: ranked
      .filter(
        (model) =>
          isCapable(model) &&
          hasAdoption(model) &&
          (effectiveBlend(model) ?? Number.POSITIVE_INFINITY) <=
            CHEAP_BLEND_USD
      )
      .toSorted(
        (left, right) =>
          (effectiveBlend(left) ?? Number.POSITIVE_INFINITY) -
          (effectiveBlend(right) ?? Number.POSITIVE_INFINITY)
      ),
    tokenShare: leaderboard.toSorted(byTokenShare).slice(0, 8),
    spendShare: leaderboard.toSorted(bySpendShare).slice(0, 8),
  }
}

export function toSnapshotPicks(picks: RankedPicks): SnapshotPicks {
  return {
    bangForBuck: picks.bangForBuck ? toSnapshotModel(picks.bangForBuck) : null,
    workhorse: picks.workhorse ? toSnapshotModel(picks.workhorse) : null,
    cheapRouter: picks.cheapRouter ? toSnapshotModel(picks.cheapRouter) : null,
    frontier: picks.frontier ? toSnapshotModel(picks.frontier) : null,
    rising: picks.rising ? toSnapshotModel(picks.rising) : null,
  }
}

export function toSnapshotLists(lists: RankedLists): SnapshotLists {
  return {
    deepsecBang: lists.deepsecBang.map(toSnapshotModel),
    deepsecScore: lists.deepsecScore.map(toSnapshotModel),
    discounted: lists.discounted.map(toSnapshotModel),
    cheapCapable: lists.cheapCapable.map(toSnapshotModel),
    tokenShare: lists.tokenShare.map(toSnapshotModel),
    spendShare: lists.spendShare.map(toSnapshotModel),
  }
}

export function buildSnapshot(input: SnapshotInput): GatewaySnapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    window: {
      from: input.window.from,
      to: input.window.to,
      lookbackDays: LOOKBACK_DAYS,
    },
    sources: {
      catalog: CATALOG_URL,
      models: MODELS_LEADERBOARD_URL,
      labs: LABS_LEADERBOARD_URL,
      deepsec: DEEPSEC_RESULTS_URL,
      aa: AA_BENCHMARKS_URL,
    },
    attribution: {
      text: ATTRIBUTION_TEXT,
      license: ATTRIBUTION_LICENSE,
      licenseUrl: ATTRIBUTION_LICENSE_URL,
    },
    stats: {
      languageModels: input.languageModels,
      zdrModels: input.zdrModels,
      privacyModels: input.privacyModels,
      deepsecRuns: input.deepsecRuns,
      aaModels: input.aaModels,
    },
    picks: {
      privacy: toSnapshotPicks(input.picks.privacy),
      open: toSnapshotPicks(input.picks.open),
    },
    lists: {
      privacy: toSnapshotLists(input.lists.privacy),
      open: toSnapshotLists(input.lists.open),
    },
    labs: toSnapshotLabs(input.labs),
    unmatched: input.unmatched,
    analysis: null,
  }
}
