import {
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
  type SnapshotModel,
  type SnapshotZdr,
} from "../../lib/gateway-snapshot"
import {
  byDeepsecBang,
  byDeepsecScore,
  byDiscount,
  bySpendShare,
  byTokenShare,
  CHEAP_BLEND_USD,
  hasAdoption,
  hasPrivacy,
  isCapable,
  LOOKBACK_DAYS,
  MIN_DEEPSEC_SCORE,
  type Adoption,
  type RankedModel,
  type ZdrLevel,
} from "./rank"

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
  picks: {
    bangForBuck: RankedModel | null
    workhorse: RankedModel | null
    cheapRouter: RankedModel | null
    frontier: RankedModel | null
  }
  lists: RankedLists
  labs: Map<string, Adoption>
  unmatched: {
    leaderboard: string[]
    deepsec: string[]
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
  zdrRanked: RankedModel[],
  leaderboard: RankedModel[]
): RankedLists {
  return {
    deepsecBang: zdrRanked
      .filter(
        (model) =>
          model.deepsecBang != null &&
          (model.deepsecScore ?? 0) >= MIN_DEEPSEC_SCORE
      )
      .toSorted(byDeepsecBang)
      .slice(0, 12),
    deepsecScore: zdrRanked
      .filter((model) => model.deepsecScore != null)
      .toSorted(byDeepsecScore)
      .slice(0, 8),
    discounted: zdrRanked
      .filter((model) => model.discounted)
      .toSorted(byDiscount),
    cheapCapable: zdrRanked
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
      ),
    tokenShare: leaderboard
      .filter(hasPrivacy)
      .toSorted(byTokenShare)
      .slice(0, 8),
    spendShare: leaderboard
      .filter(hasPrivacy)
      .toSorted(bySpendShare)
      .slice(0, 8),
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
    },
    picks: {
      bangForBuck: input.picks.bangForBuck
        ? toSnapshotModel(input.picks.bangForBuck)
        : null,
      workhorse: input.picks.workhorse
        ? toSnapshotModel(input.picks.workhorse)
        : null,
      cheapRouter: input.picks.cheapRouter
        ? toSnapshotModel(input.picks.cheapRouter)
        : null,
      frontier: input.picks.frontier
        ? toSnapshotModel(input.picks.frontier)
        : null,
    },
    lists: {
      deepsecBang: input.lists.deepsecBang.map(toSnapshotModel),
      deepsecScore: input.lists.deepsecScore.map(toSnapshotModel),
      discounted: input.lists.discounted.map(toSnapshotModel),
      cheapCapable: input.lists.cheapCapable.map(toSnapshotModel),
      tokenShare: input.lists.tokenShare.map(toSnapshotModel),
      spendShare: input.lists.spendShare.map(toSnapshotModel),
    },
    labs: toSnapshotLabs(input.labs),
    unmatched: input.unmatched,
    analysis: null,
  }
}
