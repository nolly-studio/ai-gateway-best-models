import type { ReactNode } from "react"

import { ProviderIcon } from "@/components/provider-icon"
import { TextLink } from "@/components/text-link"
import { blendOf, formatWindow, money } from "@/lib/format"
import {
  CATALOG_URL,
  DEEPSEC_RESULTS_URL,
  MODELS_LEADERBOARD_URL,
  type GatewaySnapshot,
  type SnapshotModel,
} from "@/lib/gateway-snapshot"
import { featuredFrontierPick, featuredValuePick, homeLead } from "@/lib/seo"
import { cn } from "@/lib/utils"

const GATEWAY_URL = "https://vercel.com/ai-gateway"

type ChipTone = "neutral" | "good"

function chipToneClass(tone: ChipTone): string {
  switch (tone) {
    case "neutral":
      return "bg-inset text-ink"
    case "good":
      return "bg-green-tint text-green"
    default: {
      const _exhaustive: never = tone
      return _exhaustive
    }
  }
}

function EntityChip({
  children,
  href,
  icon,
  tone = "neutral",
}: {
  children: ReactNode
  href?: string
  icon?: ReactNode
  tone?: ChipTone
}) {
  const className = cn(
    "mx-0.5 inline-flex h-5 max-w-full -translate-y-px items-center gap-1 rounded-chip align-middle text-[13px] font-medium whitespace-nowrap shadow-hairline",
    icon ? "pr-1.5 pl-1" : "px-1.5",
    chipToneClass(tone),
    href &&
      "transition-[background-color,transform] duration-150 hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.96]"
  )

  if (href != null) {
    const external = href.startsWith("http")
    return (
      <a
        className={className}
        href={href}
        rel={external ? "noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      >
        {icon}
        {children}
      </a>
    )
  }

  return (
    <span className={className}>
      {icon}
      {children}
    </span>
  )
}

function ModelChip({ model }: { model: SnapshotModel }) {
  return (
    <EntityChip
      href={model.href}
      icon={<ProviderIcon className="size-3.5" provider={model.provider} />}
    >
      {model.name}
    </EntityChip>
  )
}

export function HeroLead({
  note,
  snapshot,
}: {
  note?: ReactNode
  snapshot: GatewaySnapshot
}) {
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)
  const sources = (
    <p className="text-xs leading-relaxed text-pretty text-ink-3">
      Independent ranking from{" "}
      <TextLink external href={CATALOG_URL}>
        live catalog
      </TextLink>
      ,{" "}
      <TextLink external href={MODELS_LEADERBOARD_URL}>
        7-day adoption
      </TextLink>
      , discounts, and{" "}
      <TextLink external href={DEEPSEC_RESULTS_URL}>
        DeepsecBench
      </TextLink>
      .
      {note}
    </p>
  )

  if (value == null) {
    return (
      <>
        <p>{homeLead(snapshot)}</p>
        {sources}
      </>
    )
  }

  const blend = blendOf(value)
  const discount =
    value.discountPercent != null
      ? `${Math.round(value.discountPercent)}% off`
      : null
  const showFrontier = frontier != null && frontier.id !== value.id

  return (
    <>
      <p>
        This week ({window}), the best pick on{" "}
        <TextLink external href={GATEWAY_URL}>
          AI Gateway
        </TextLink>{" "}
        is
        <ModelChip model={value} />
        {blend != null ? (
          <>
            at
            <EntityChip>
              <span className="tabular-nums">{money(blend)} / 1M</span>
            </EntityChip>
          </>
        ) : null}
        {value.zdrProvider != null ? (
          <>
            on
            <EntityChip
              icon={
                <ProviderIcon
                  className="size-3.5"
                  label={value.zdrProvider}
                  provider={value.zdrProvider}
                />
              }
            >
              {value.zdrProvider}
            </EntityChip>
          </>
        ) : null}
        {discount != null ? (
          <EntityChip tone="good">
            <span className="tabular-nums">{discount}</span>
          </EntityChip>
        ) : null}
        .
        {showFrontier && frontier != null ? (
          <>
            {" "}
            The frontier pick is
            <ModelChip model={frontier} />.
          </>
        ) : null}
      </p>
      {sources}
    </>
  )
}
