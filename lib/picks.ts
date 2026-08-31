import {
  SNAPSHOT_PICK_KEYS,
  type SnapshotModel,
  type SnapshotPickKey,
} from "@/lib/gateway-snapshot"

export type PickRole = {
  key: SnapshotPickKey
  label: string
}

export type FeaturedPick = {
  model: SnapshotModel
  roles: PickRole[]
}

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
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
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
