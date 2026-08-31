"use client"

import {
  AiBrain01Icon,
  AlertCircleIcon,
  ChartAverageIcon,
  ChartHistogramIcon,
  EnergyIcon,
  Medal01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CopyModelId, useCopyText } from "@/components/copy-model-id"
import { Meter } from "@/components/meter"
import { ProviderIcon } from "@/components/provider-icon"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { blendOf, money } from "@/lib/format"
import {
  pickMetrics,
  routePolicyBadge,
  zdrAltRoute,
  type FeaturedPick,
  type PickMetric,
  type PickMetricKind,
} from "@/lib/picks"
import { cn } from "@/lib/utils"

function ExternalArrow() {
  return (
    <svg
      aria-hidden="true"
      className="size-2.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  )
}

export function PickCards({
  title,
  hint,
  picks,
}: {
  title: string
  hint?: string
  picks: FeaturedPick[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-balance text-ink">
            {title}
          </h2>
          <span className="inline-flex h-5 items-center rounded-md bg-inset px-1.5 text-xs font-medium text-ink-2 tabular-nums shadow-hairline">
            {picks.length}
          </span>
        </div>
        {hint ? (
          <p className="text-xs text-pretty text-ink-3">{hint}</p>
        ) : null}
      </div>
      {picks.map((pick) => (
        <PickCard key={pick.model.id} pick={pick} />
      ))}
    </section>
  )
}

function Chip({
  children,
  muted = false,
}: {
  children: string
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-chip bg-inset px-1.5 text-xs font-medium",
        muted ? "text-ink-3" : "text-ink-2"
      )}
    >
      {children}
    </span>
  )
}

function metricIcon(kind: PickMetricKind) {
  switch (kind) {
    case "bang":
      return EnergyIcon
    case "everyday":
      return ChartAverageIcon
    case "best":
      return Medal01Icon
    case "tokens":
      return ChartHistogramIcon
    case "aa":
      return AiBrain01Icon
    case "missing":
      return AlertCircleIcon
    case "policy":
      return Shield01Icon
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

function MetricPill({ metric }: { metric: PickMetric }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`${metric.value}. ${metric.hint}`}
        className="inline-flex h-5 items-center gap-1 rounded-chip bg-inset px-1.5 text-xs font-medium text-ink-2 tabular-nums select-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <HugeiconsIcon
          color="currentColor"
          icon={metricIcon(metric.kind)}
          size={12}
          strokeWidth={1.8}
        />
        {metric.value}
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-pretty">
        {metric.hint}
      </TooltipContent>
    </Tooltip>
  )
}

function PickCard({ pick }: { pick: FeaturedPick }) {
  const { model, roles, privacyModel } = pick
  const { status, copy } = useCopyText()
  const blend = blendOf(model)
  const metrics = pickMetrics(model, roles)
  const policy = routePolicyBadge(model, privacyModel)
  const zdrAlt = zdrAltRoute(model, privacyModel)
  const discount =
    model.discountPercent != null
      ? `${Math.round(model.discountPercent)}% off`
      : null

  return (
    <article className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="primitive-card-pad">
        <div className="flex flex-wrap items-center gap-1">
          {roles.map((role) => (
            <Chip key={role.key}>{role.label}</Chip>
          ))}
          {policy != null ? (
            <Chip muted={policy === "Trains"}>{policy}</Chip>
          ) : null}
        </div>
        <h3 className="mt-2.5 flex items-center gap-2 text-sm leading-[1.1] font-semibold tracking-tight text-balance text-ink">
          <ProviderIcon provider={model.provider} />
          {model.name}
        </h3>
        <div className="mt-2 flex flex-col gap-1.5">
          <CopyModelId
            className="w-fit"
            id={model.id}
            onCopy={() => copy(model.id)}
            status={status}
          />
          {metrics.length > 0 || discount != null ? (
            <div className="flex flex-wrap items-center gap-1">
              {metrics.map((metric) => (
                <MetricPill key={`${metric.kind}-${metric.value}`} metric={metric} />
              ))}
              {discount != null ? (
                <Tooltip>
                  <TooltipTrigger className="inline-flex h-5 items-center rounded-chip bg-green-tint px-1.5 text-xs font-medium text-green tabular-nums select-none hover:bg-green-tint focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
                    {discount}
                  </TooltipTrigger>
                  <TooltipContent>Official list-vs-sale promo.</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-inset primitive-card-footer">
        <span className="flex min-w-0 items-center gap-2">
          <Meter signal={Math.min(3, roles.length + 1)} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-ink-2 tabular-nums">
              {blend != null ? `${money(blend)} / 1M` : "No blend"}
              {model.zdrProvider ? ` · ${model.zdrProvider}` : ""}
            </span>
            {zdrAlt != null ? (
              <span className="truncate text-xs text-ink-3 tabular-nums">
                ZDR {money(zdrAlt.blend)}
                {zdrAlt.provider ? ` · ${zdrAlt.provider}` : ""}
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <CopyModelId
            id={model.id}
            onCopy={() => copy(model.id)}
            status={status}
            variant="button"
          />
          <a
            className="inline-flex h-7 items-center gap-1.5 rounded-control bg-surface px-2.5 text-xs font-medium text-ink shadow-btn transition-[background-color,transform] duration-100 select-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.96]"
            href={model.href}
            rel="noreferrer"
            target="_blank"
          >
            Open
            <ExternalArrow />
          </a>
        </span>
      </div>
    </article>
  )
}
