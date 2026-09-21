import { TextLink } from "@/components/text-link"
import { formatWindow, pct } from "@/lib/format"
import {
  SNAPSHOT_PICK_KEYS,
  type GatewaySnapshot,
  type SnapshotPickKey,
} from "@/lib/gateway-snapshot"
import { pickLabel } from "@/lib/picks"

function diffLine(
  key: SnapshotPickKey,
  from: string | null,
  to: string | null
): string {
  const label = pickLabel(key)
  if (from == null && to != null) {
    return `${label} is now ${to}`
  }
  if (from != null && to == null) {
    return `${label} left ${from}`
  }
  return `${label} ${from} → ${to}`
}

export function WhatChanged({ snapshot }: { snapshot: GatewaySnapshot }) {
  const openDiffs = snapshot.delta?.vsWeek.open ?? {}
  const diffs = SNAPSHOT_PICK_KEYS.flatMap((key) => {
    const diff = openDiffs[key]
    return diff == null ? [] : [diffLine(key, diff.from, diff.to)]
  })
  const movers = snapshot.delta?.movers ?? []
  const sales = snapshot.lists.open.discounted.filter((model) => model.discounted)

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 px-0.5">
        <h2 className="text-sm font-semibold text-ink">What changed</h2>
        <p className="text-xs text-pretty text-ink-3">
          Versus{" "}
          <TextLink href="/week">this week</TextLink>
          {snapshot.window.to
            ? ` · as of ${formatWindow(snapshot.window.from, snapshot.window.to)}`
            : null}
          . Same fetch, not yesterday.
        </p>
      </div>
      <div className="flex flex-col gap-3 rounded-card bg-surface px-3 py-3 text-[13px] leading-relaxed text-pretty text-ink-2 shadow-card">
        <p>
          {diffs.length === 0 ? (
            <>
              Same winners as{" "}
              <TextLink href="/week">this week</TextLink>.
            </>
          ) : (
            diffs.join(". ") + "."
          )}
        </p>
        {movers.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-ink">Movers vs 7-day mean</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {movers.map((mover) => {
                const sign = mover.delta > 0 ? "+" : ""
                return (
                  <li key={mover.id}>
                    {mover.name}{" "}
                    <span className="tabular-nums text-ink-3">
                      {sign}
                      {pct(mover.delta)} ({pct(mover.dayShare)} vs{" "}
                      {pct(mover.weekShare)})
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {sales.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-ink">On sale</p>
            <p className="mt-1">
              {sales
                .map((model) => {
                  const off =
                    model.discountPercent != null
                      ? ` ${Math.round(model.discountPercent)}% off`
                      : ""
                  return `${model.name}${off}`
                })
                .join(" · ")}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
