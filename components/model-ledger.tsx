"use client"

import { useState } from "react"

import { CopyModelId } from "@/components/copy-model-id"
import { ProviderIcon } from "@/components/provider-icon"
import { pct } from "@/lib/format"
import type {
  GatewaySnapshot,
  SnapshotLaneKey,
  SnapshotModel,
} from "@/lib/gateway-snapshot"
import {
  laneTitle,
  ledgerBangMetric,
  ledgerBlendMetric,
  ledgerCodingMetric,
  ledgerIntelMetric,
  ledgerScoreMetric,
  policyLabel,
  type LedgerMetric,
} from "@/lib/picks"
import { cn } from "@/lib/utils"

type LedgerKey =
  | "aaIntelligence"
  | "aaCoding"
  | "deepsecBang"
  | "deepsecScore"
  | "discounted"
  | "cheapCapable"
  | "tokenShare"
  | "spendShare"

type LedgerShare = "tokens" | "spend"

const FILTERS: { key: LedgerKey; label: string; share?: LedgerShare }[] = [
  { key: "aaIntelligence", label: "Intel" },
  { key: "aaCoding", label: "Coding" },
  { key: "deepsecBang", label: "Bang" },
  { key: "deepsecScore", label: "Deepsec" },
  { key: "discounted", label: "On sale" },
  { key: "cheapCapable", label: "Cheap" },
  { key: "tokenShare", label: "Tokens", share: "tokens" },
  { key: "spendShare", label: "Spend", share: "spend" },
]

const LANES: { key: SnapshotLaneKey; label: string }[] = [
  { key: "privacy", label: "ZDR+NPT" },
  { key: "open", label: "All" },
]

const MAX_ROWS = 20

function ledgerGrid(showShare: boolean): string {
  return showShare
    ? "grid grid-cols-[minmax(0,1.6fr)_4.75rem_3.75rem] sm:grid-cols-[minmax(0,1.7fr)_5.5rem_4.75rem_4.75rem_3.75rem]"
    : "grid grid-cols-[minmax(0,1.6fr)_4.75rem] sm:grid-cols-[minmax(0,1.7fr)_5.5rem_4.75rem_4.75rem]"
}

function scoreColumnLabel(filter: LedgerKey): string {
  switch (filter) {
    case "aaIntelligence":
      return "Intel"
    case "aaCoding":
      return "Coding"
    case "deepsecBang":
    case "deepsecScore":
    case "discounted":
    case "cheapCapable":
    case "tokenShare":
    case "spendShare":
      return "Score"
    default: {
      const _exhaustive: never = filter
      return _exhaustive
    }
  }
}

function scoreMetric(model: SnapshotModel, filter: LedgerKey): LedgerMetric {
  switch (filter) {
    case "aaIntelligence":
      return ledgerIntelMetric(model)
    case "aaCoding":
      return ledgerCodingMetric(model)
    case "deepsecBang":
    case "deepsecScore":
    case "discounted":
    case "cheapCapable":
    case "tokenShare":
    case "spendShare":
      return ledgerScoreMetric(model)
    default: {
      const _exhaustive: never = filter
      return _exhaustive
    }
  }
}

export function ModelLedger({ lists }: { lists: GatewaySnapshot["lists"] }) {
  const [lane, setLane] = useState<SnapshotLaneKey>("privacy")
  const [filter, setFilter] = useState<LedgerKey>("aaIntelligence")
  const active =
    FILTERS.find((item) => item.key === filter) ??
    FILTERS[0] ??
    ({ key: "aaIntelligence", label: "Intel" } as const)
  const laneLists = lists[lane]
  const rows = laneLists[filter].slice(0, MAX_ROWS)
  const showPolicy = lane === "open"
  const share = active.share
  const showShare = share != null
  const grid = ledgerGrid(showShare)

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h2 className="text-sm font-semibold text-balance text-ink">
          Ranked AI Gateway models
        </h2>
        <div className="flex items-center gap-1">
          {LANES.map((item) => {
            const selected = lane === item.key
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "flex h-6.5 items-center rounded-full px-2.5 text-[12px] font-medium transition-[background-color,box-shadow,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  selected
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
      <p className="px-0.5 text-[12px] text-ink-3">{laneTitle(lane)}, top 20</p>

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
                {Math.min(laneLists[item.key].length, MAX_ROWS)}
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
              grid,
              "border-b border-line px-3 py-2 text-[11.5px] font-medium text-ink-3"
            )}
          >
            <span>Model</span>
            <span className="text-right">Blend</span>
            <span className="hidden text-right sm:block">
              {scoreColumnLabel(filter)}
            </span>
            <span className="hidden text-right sm:block">Bang</span>
            {showShare ? (
              <span className="text-right">
                {share === "spend" ? "Spend" : "Tokens"}
              </span>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-[12.5px] text-ink-3">
              Nothing in this list this week.
            </p>
          ) : (
            rows.map((model) => (
              <LedgerRow
                filter={filter}
                key={`${lane}-${filter}-${model.id}`}
                model={model}
                share={share}
                showPolicy={showPolicy}
                showShare={showShare}
              />
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function LedgerRow({
  filter,
  model,
  share,
  showPolicy,
  showShare,
}: {
  filter: LedgerKey
  model: SnapshotModel
  share: LedgerShare | undefined
  showPolicy: boolean
  showShare: boolean
}) {
  const blend = ledgerBlendMetric(model)
  const quality = scoreMetric(model, filter)
  const bang = ledgerBangMetric(model)
  const shareValue = share === "spend" ? model.spendShare : model.tokensShare

  return (
    <div
      className={cn(
        ledgerGrid(showShare),
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
            {showPolicy ? (
              <span className="shrink-0 text-[11px] text-ink-3">
                · {policyLabel(model)}
              </span>
            ) : null}
            {model.discountPercent != null ? (
              <span className="shrink-0 text-[11px] text-ink-3">
                · {Math.round(model.discountPercent)}% off
              </span>
            ) : null}
          </span>
        </span>
      </span>
      <MetricCell metric={blend} />
      <MetricCell className="hidden sm:block" metric={quality} />
      <MetricCell className="hidden sm:block" metric={bang} />
      {showShare ? (
        <span className="text-right text-ink-2 tabular-nums">
          {pct(shareValue)}
        </span>
      ) : null}
    </div>
  )
}

function MetricCell({
  metric,
  className,
}: {
  metric: LedgerMetric
  className?: string
}) {
  return (
    <span className={cn("min-w-0 text-right", className)}>
      <span className="block truncate text-ink-2 tabular-nums">
        {metric.value}
      </span>
      {metric.note != null ? (
        <span className="block truncate text-[11px] text-ink-3">
          {metric.note}
        </span>
      ) : null}
    </span>
  )
}
