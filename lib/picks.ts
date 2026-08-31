import { blendOf, money, pct, score } from "@/lib/format"
import {
  SNAPSHOT_PICK_KEYS,
  type SnapshotLaneKey,
  type SnapshotModel,
  type SnapshotPickKey,
  type SnapshotPicks,
} from "@/lib/gateway-snapshot"

export type PickRole = {
  key: SnapshotPickKey
  label: string
}

export type FeaturedPick = {
  model: SnapshotModel
  roles: PickRole[]
  privacyModel?: SnapshotModel | null
}

export type RoutePolicy = "ZDR" | "Trains"

export function pickLabel(key: SnapshotPickKey): string {
  switch (key) {
    case "bangForBuck":
      return "Bang"
    case "workhorse":
      return "Workhorse"
    case "cheapRouter":
      return "Cheap"
    case "frontier":
      return "Frontier"
    case "rising":
      return "Rising"
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
}

export function laneTitle(lane: SnapshotLaneKey): string {
  switch (lane) {
    case "privacy":
      return "ZDR + no training"
    case "open":
      return "Best bang for buck"
    default: {
      const _exhaustive: never = lane
      return _exhaustive
    }
  }
}

export function laneHeading(lane: SnapshotLaneKey): string {
  switch (lane) {
    case "privacy":
      return "Best ZDR + no-training models this week"
    case "open":
      return "If you skip ZDR"
    default: {
      const _exhaustive: never = lane
      return _exhaustive
    }
  }
}

export function laneHint(lane: SnapshotLaneKey): string {
  switch (lane) {
    case "privacy":
      return "Zero data retention and no training on prompts"
    case "open":
      return "These beat the ZDR + no-training picks this week"
    default: {
      const _exhaustive: never = lane
      return _exhaustive
    }
  }
}

export function sameLaneNote(): string {
  return "Same winners this week. Nothing that trains or skips ZDR beat the picks above."
}

export function weeklyPicksTitle(): string {
  return "This week's picks"
}

export function weeklyPicksHint(): string {
  return "Best models on AI Gateway this week. ZDR is the priced route, not the family."
}

export function hasPrivacyPolicy(
  model: Pick<SnapshotModel, "zdr" | "noTraining">
): boolean {
  const zdr = model.zdr === "all" || model.zdr === "some"
  const noTraining = model.noTraining === "all" || model.noTraining === "some"
  return zdr && noTraining
}

export function policyLabel(
  model: Pick<SnapshotModel, "zdr" | "noTraining">
): string {
  if (hasPrivacyPolicy(model)) {
    return "ZDR + no training"
  }
  const zdr = model.zdr === "all" || model.zdr === "some"
  const noTraining = model.noTraining === "all" || model.noTraining === "some"
  if (zdr) {
    return "ZDR · trains"
  }
  if (noTraining) {
    return "No training"
  }
  return "No ZDR · trains"
}

export function differingPolicyLabel(
  model: Pick<SnapshotModel, "zdr" | "noTraining">
): string | null {
  return hasPrivacyPolicy(model) ? null : policyLabel(model)
}

export function lanePicksMatch(
  privacy: SnapshotPicks,
  open: SnapshotPicks
): boolean {
  return SNAPSHOT_PICK_KEYS.every(
    (key) => (privacy[key]?.id ?? null) === (open[key]?.id ?? null)
  )
}

export function openPickDelta(
  privacy: SnapshotPicks,
  open: SnapshotPicks
): FeaturedPick[] {
  const delta = {} as SnapshotPicks
  for (const key of SNAPSHOT_PICK_KEYS) {
    const openModel = open[key]
    delta[key] =
      openModel != null && openModel.id !== privacy[key]?.id ? openModel : null
  }
  return groupPicks(delta)
}

export function privacyModelsById(
  privacy: SnapshotPicks
): Map<string, SnapshotModel> {
  const byId = new Map<string, SnapshotModel>()
  for (const key of SNAPSHOT_PICK_KEYS) {
    const model = privacy[key]
    if (model != null) {
      byId.set(model.id, model)
    }
  }
  return byId
}

export function weeklyFeaturedPicks(picks: {
  privacy: SnapshotPicks
  open: SnapshotPicks
}): FeaturedPick[] {
  const privacyById = privacyModelsById(picks.privacy)
  return groupPicks(picks.open).map((pick) => ({
    ...pick,
    privacyModel: privacyById.get(pick.model.id) ?? null,
  }))
}

function samePricedRoute(
  left: SnapshotModel,
  right: SnapshotModel
): boolean {
  const leftBlend = blendOf(left)
  const rightBlend = blendOf(right)
  if (leftBlend == null || rightBlend == null) {
    return false
  }
  return (
    leftBlend === rightBlend &&
    (left.zdrProvider ?? null) === (right.zdrProvider ?? null)
  )
}

export function routePolicyBadge(
  model: SnapshotModel,
  privacy: SnapshotModel | null | undefined
): RoutePolicy | null {
  if (!hasPrivacyPolicy(model)) {
    return "Trains"
  }
  if (privacy != null && samePricedRoute(model, privacy)) {
    return "ZDR"
  }
  return null
}

export function zdrAltRoute(
  model: SnapshotModel,
  privacy: SnapshotModel | null | undefined
): { blend: number; provider: string | null } | null {
  if (privacy == null || samePricedRoute(model, privacy)) {
    return null
  }
  const blend = blendOf(privacy)
  if (blend == null) {
    return null
  }
  return { blend, provider: privacy.zdrProvider }
}

export type PickMetricKind =
  | "bang"
  | "everyday"
  | "best"
  | "tokens"
  | "aa"
  | "missing"
  | "policy"

export type PickMetric = {
  kind: PickMetricKind
  value: string
  hint: string
}

export function aaMetric(aa: SnapshotModel["aa"]): PickMetric | null {
  if (aa == null) {
    return null
  }
  if (aa.intelligence != null) {
    return {
      kind: "aa",
      value: score(aa.intelligence),
      hint: "Artificial Analysis intelligence index. Not mixed with Deepsec.",
    }
  }
  if (aa.coding != null) {
    return {
      kind: "aa",
      value: score(aa.coding),
      hint: "Artificial Analysis coding index. Not mixed with Deepsec.",
    }
  }
  if (aa.agentic != null) {
    return {
      kind: "aa",
      value: score(aa.agentic),
      hint: "Artificial Analysis agentic index. Not mixed with Deepsec.",
    }
  }
  return null
}

export function aaFootnote(aa: SnapshotModel["aa"]): string | null {
  const metric = aaMetric(aa)
  if (metric == null) {
    return null
  }
  if (aa?.intelligence != null) {
    return `AA intel ${metric.value}`
  }
  if (aa?.coding != null) {
    return `AA coding ${metric.value}`
  }
  return `AA agentic ${metric.value}`
}

export type LedgerMetric = {
  value: string
  note: string | null
}

export function ledgerBlendMetric(model: SnapshotModel): LedgerMetric {
  return {
    value: money(blendOf(model)),
    note: model.zdrProvider,
  }
}

export function ledgerScoreMetric(model: SnapshotModel): LedgerMetric {
  const best = model.deepsecBest
  if (best != null) {
    return { value: score(best.score), note: best.effort }
  }
  const aa = aaMetric(model.aa)
  if (aa != null) {
    return { value: aa.value, note: "AA" }
  }
  return { value: score(null), note: null }
}

export function ledgerBangMetric(model: SnapshotModel): LedgerMetric {
  const value = model.deepsecValue
  if (value?.bang != null) {
    return { value: score(value.bang, 2), note: value.effort }
  }
  return { value: score(null), note: null }
}

/**
 * Role-aware card metrics. Deepsec numbers stay attached to the run they
 * came from; AA is a footnote and never stands in for a Deepsec score.
 */
export function pickMetrics(
  model: SnapshotModel,
  roles: PickRole[],
  showPolicy = false
): PickMetric[] {
  const keys = new Set(roles.map((role) => role.key))
  const best = model.deepsecBest
  const value = model.deepsecValue
  const everyday = model.deepsecEveryday
  const metrics: PickMetric[] = []

  const policy = showPolicy ? differingPolicyLabel(model) : null
  if (policy != null) {
    metrics.push({
      kind: "policy",
      value: policy,
      hint: "This priced route is not ZDR + no-training.",
    })
  }

  if (keys.has("frontier") && best != null) {
    metrics.push({
      kind: "best",
      value: score(best.score),
      hint: `Best Deepsec score at ${best.effort} effort.`,
    })
  }

  if (keys.has("bangForBuck") && value?.bang != null) {
    metrics.push({
      kind: "bang",
      value: score(value.bang, 2),
      hint: `Bang-for-buck: Deepsec score per that run's dollar at ${value.effort} effort.`,
    })
  }

  if (keys.has("workhorse") && everyday != null) {
    const sameAsBest =
      keys.has("frontier") &&
      best != null &&
      best.score === everyday.score &&
      best.effort === everyday.effort
    if (!sameAsBest) {
      metrics.push({
        kind: "everyday",
        value: score(everyday.score),
        hint: `Everyday Deepsec score at the lowest published effort (${everyday.effort}).`,
      })
    }
  }

  if (
    ((keys.has("frontier") && best == null) ||
      (keys.has("rising") && best == null))
  ) {
    metrics.push({
      kind: "missing",
      value: "—",
      hint: "DeepsecBench has not benchmarked this model yet.",
    })
  }

  if (model.tokensShare > 0) {
    metrics.push({
      kind: "tokens",
      value: pct(model.tokensShare),
      hint: "Share of AI Gateway tokens this week.",
    })
  }

  const aa = aaMetric(model.aa)
  if (aa != null) {
    metrics.push(aa)
  }

  return metrics
}

export function groupPicks(
  picks: Record<SnapshotPickKey, SnapshotModel | null>
): FeaturedPick[] {
  const grouped = new Map<string, FeaturedPick>()
  const order: string[] = []

  for (const key of SNAPSHOT_PICK_KEYS) {
    const model = picks[key]
    if (!model) {
      continue
    }
    const existing = grouped.get(model.id)
    const role = { key, label: pickLabel(key) }
    if (existing) {
      existing.roles.push(role)
      continue
    }
    grouped.set(model.id, { model, roles: [role] })
    order.push(model.id)
  }

  return order
    .map((id) => grouped.get(id))
    .filter((pick): pick is FeaturedPick => pick != null)
}
