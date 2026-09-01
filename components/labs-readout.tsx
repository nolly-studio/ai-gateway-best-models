"use client"

import { useState } from "react"

import {
  LedgerMetricHeader,
  LedgerMetricRow,
} from "@/components/ledger-row"
import { ProviderIcon } from "@/components/provider-icon"
import { pct } from "@/lib/format"
import type { SnapshotLab, SnapshotLaneKey } from "@/lib/gateway-snapshot"
import { cn } from "@/lib/utils"

const LANES: { key: SnapshotLaneKey; label: string }[] = [
  { key: "privacy", label: "ZDR+NPT" },
  { key: "open", label: "All" },
]

export function LabsReadout({ labs }: { labs: SnapshotLab[] }) {
  const [lane, setLane] = useState<SnapshotLaneKey>("privacy")
  const [selected, setSelected] = useState(labs[0]?.name ?? null)
  const maxTokens = Math.max(...labs.map((lab) => lab.tokensShare), 1)
  const maxSpend = Math.max(...labs.map((lab) => lab.spendShare), 1)
  const active = labs.find((lab) => lab.name === selected) ?? labs[0] ?? null
  const rows = active?.bang[lane] ?? []
  const showPolicy = lane === "open"

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-balance text-ink">
            Which labs developers actually use
          </h2>
          <span className="inline-flex h-5 items-center rounded-md bg-inset px-1.5 text-[11.5px] font-medium text-ink-2 tabular-nums shadow-hairline">
            {labs.length}
          </span>
        </div>
        <span className="text-[12px] text-ink-3">Token share vs spend</span>
      </div>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className="flex flex-col">
          {labs.map((lab) => {
            const pressed = lab.name === active?.name
            return (
              <button
                aria-pressed={pressed}
                className={cn(
                  "grid w-full grid-cols-[108px_1fr_auto] items-center gap-3 border-b border-line px-3 py-2 text-left last:border-0 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  pressed ? "bg-field" : "hover:bg-hover"
                )}
                key={lab.name}
                onClick={() => setSelected(lab.name)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <ProviderIcon provider={lab.name} />
                  <span className="truncate font-mono text-[12px] text-ink">
                    {lab.name}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <Bar value={lab.tokensShare} max={maxTokens} tone="ink" />
                  <Bar value={lab.spendShare} max={maxSpend} tone="muted" />
                </span>
                <span className="flex flex-col items-end text-[11px] text-ink-3 tabular-nums">
                  <span>{pct(lab.tokensShare)} tok</span>
                  <span>{pct(lab.spendShare)} $</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {active != null ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3 px-0.5">
            <p className="text-[12px] text-ink-3">
              Best bang on {active.name}
            </p>
            <div className="flex items-center gap-1">
              {LANES.map((item) => {
                const pressed = lane === item.key
                return (
                  <button
                    aria-pressed={pressed}
                    className={cn(
                      "flex h-6.5 items-center rounded-full px-2.5 text-[12px] font-medium transition-[background-color,box-shadow,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                      pressed
                        ? "bg-surface text-ink shadow-btn"
                        : "text-ink-2 hover:bg-hover"
                    )}
                    key={item.key}
                    onClick={() => setLane(item.key)}
                    type="button"
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div
            className="overflow-x-auto rounded-card bg-surface shadow-card"
            style={{ scrollbarWidth: "none" }}
          >
            <LedgerMetricHeader />
            {rows.length === 0 ? (
              <p className="px-3 py-6 text-[12.5px] text-ink-3">
                No Deepsec run this week.
              </p>
            ) : (
              rows.map((model) => (
                <LedgerMetricRow
                  key={`${lane}-${active.name}-${model.id}`}
                  model={model}
                  showPolicy={showPolicy}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function Bar({
  value,
  max,
  tone,
}: {
  value: number
  max: number
  tone: "ink" | "muted"
}) {
  const width = Math.max(4, Math.round((value / max) * 100))
  return (
    <span className="block h-1 overflow-hidden rounded-full bg-field">
      <span
        className={
          tone === "ink" ? "block h-full bg-ink" : "block h-full bg-ink-3"
        }
        style={{ width: `${width}%` }}
      />
    </span>
  )
}
