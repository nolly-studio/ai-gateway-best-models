"use client"

import { useState } from "react"

import { CopyModelId } from "@/components/copy-model-id"
import { ProviderIcon } from "@/components/provider-icon"
import { blendOf, money, pct, score } from "@/lib/format"
import type { GatewaySnapshot, SnapshotModel } from "@/lib/gateway-snapshot"
import { cn } from "@/lib/utils"

type LedgerKey =
  | "deepsecBang"
  | "deepsecScore"
  | "discounted"
  | "cheapCapable"
  | "tokenShare"
  | "spendShare"

const FILTERS: { key: LedgerKey; label: string; share: "tokens" | "spend" }[] =
  [
    { key: "deepsecBang", label: "Bang", share: "tokens" },
    { key: "deepsecScore", label: "Score", share: "tokens" },
    { key: "discounted", label: "On sale", share: "tokens" },
    { key: "cheapCapable", label: "Cheap", share: "tokens" },
    { key: "tokenShare", label: "Tokens", share: "tokens" },
    { key: "spendShare", label: "Spend", share: "spend" },
  ]

const MAX_ROWS = 12
const LEDGER_GRID =
  "grid grid-cols-[minmax(0,1.6fr)_4.5rem_4.25rem] sm:grid-cols-[1.7fr_0.6fr_0.5fr_0.5fr_0.55fr]"

export function ModelLedger({ lists }: { lists: GatewaySnapshot["lists"] }) {
  const [filter, setFilter] = useState<LedgerKey>("deepsecBang")
  const active =
    FILTERS.find((item) => item.key === filter) ??
    FILTERS[0] ??
    ({ key: "deepsecBang", label: "Bang", share: "tokens" } as const)
  const rows = lists[filter].slice(0, MAX_ROWS)

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h2 className="text-[13px] font-semibold text-balance text-ink">
          Ledger
        </h2>
        <span className="text-[12px] text-ink-3">
          ZDR + no-training, ranked
        </span>
      </div>

      <div
        className="-mx-1 mb-1 flex items-center gap-1 overflow-x-auto px-1 py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTERS.map((item) => {
          const selected = filter === item.key
          return (
            <button
              aria-pressed={selected}
              className={cn(
                "flex h-6.5 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-[background-color,box-shadow,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                selected
                  ? "bg-surface text-ink shadow-btn"
                  : "text-ink-2 hover:bg-hover"
              )}
              key={item.key}
              onClick={(event) => {
                setFilter(item.key)
                event.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                })
              }}
              type="button"
            >
              {item.label}
              <span
                className={cn(
                  "rounded-[4px] px-1 text-[10.5px] tabular-nums",
                  selected ? "bg-field text-ink-2" : "text-ink-3"
                )}
              >
                {Math.min(lists[item.key].length, MAX_ROWS)}
              </span>
            </button>
          )
        })}
      </div>

      <div
        className="overflow-x-auto rounded-card bg-surface shadow-card"
        style={{ scrollbarWidth: "none" }}
      >
        <div>
          <div
            className={cn(
              LEDGER_GRID,
              "border-b border-line px-3 py-2 text-[11.5px] font-medium text-ink-3"
            )}
          >
            <span>Model</span>
            <span className="text-right">Blend</span>
            <span className="hidden text-right sm:block">Score</span>
            <span className="hidden text-right sm:block">Bang</span>
            <span className="text-right">
              {active.share === "spend" ? "Spend" : "Tokens"}
            </span>
          </div>
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-[12.5px] text-ink-3">
              Nothing in this list this week.
            </p>
          ) : (
            rows.map((model) => (
              <LedgerRow
                key={`${filter}-${model.id}`}
                model={model}
                share={active.share}
              />
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function LedgerRow({
  model,
  share,
}: {
  model: SnapshotModel
  share: "tokens" | "spend"
}) {
  const blend = blendOf(model)
  const shareValue = share === "spend" ? model.spendShare : model.tokensShare

  return (
    <div
      className={cn(
        LEDGER_GRID,
        "items-center border-b border-line px-3 py-2 text-[12px] last:border-0"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <ProviderIcon provider={model.provider} />
        <span className="min-w-0">
          <a
            className="block truncate font-medium text-ink transition-colors duration-100 hover:text-ink-2 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            href={model.href}
            rel="noreferrer"
            target="_blank"
          >
            {model.name}
          </a>
          <span className="flex min-w-0 items-center gap-1">
            <CopyModelId id={model.id} variant="inline" />
            {model.discountPercent != null ? (
              <span className="shrink-0 text-[11px] text-ink-3">
                · {Math.round(model.discountPercent)}% off
              </span>
            ) : null}
          </span>
        </span>
      </span>
      <span className="text-right text-ink-2 tabular-nums">{money(blend)}</span>
      <span className="hidden text-right text-ink-2 tabular-nums sm:block">
        {score(model.deepsecScore)}
      </span>
      <span className="hidden text-right text-ink-2 tabular-nums sm:block">
        {score(model.deepsecBang, 2)}
      </span>
      <span className="text-right text-ink-2 tabular-nums">
        {pct(shareValue)}
      </span>
    </div>
  )
}
