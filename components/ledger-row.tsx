"use client"

import { CopyModelId } from "@/components/copy-model-id"
import { ProviderIcon } from "@/components/provider-icon"
import type { SnapshotModel } from "@/lib/gateway-snapshot"
import {
  ledgerBangMetric,
  ledgerBlendMetric,
  ledgerScoreMetric,
  policyLabel,
  type LedgerMetric,
} from "@/lib/picks"
import { cn } from "@/lib/utils"

export const BANG_LEDGER_GRID =
  "grid grid-cols-[minmax(0,1.6fr)_4.75rem] sm:grid-cols-[minmax(0,1.7fr)_5.5rem_4.75rem_4.75rem]"

export function LedgerMetricRow({
  model,
  showPolicy = false,
}: {
  model: SnapshotModel
  showPolicy?: boolean
}) {
  const blend = ledgerBlendMetric(model)
  const score = ledgerScoreMetric(model)
  const bang = ledgerBangMetric(model)

  return (
    <div
      className={cn(
        BANG_LEDGER_GRID,
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
      <MetricCell className="hidden sm:block" metric={score} />
      <MetricCell className="hidden sm:block" metric={bang} />
    </div>
  )
}

export function LedgerMetricHeader() {
  return (
    <div
      className={cn(
        BANG_LEDGER_GRID,
        "border-b border-line px-3 py-2 text-[11.5px] font-medium text-ink-3"
      )}
    >
      <span>Model</span>
      <span className="text-right">Blend</span>
      <span className="hidden text-right sm:block">Score</span>
      <span className="hidden text-right sm:block">Bang</span>
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
