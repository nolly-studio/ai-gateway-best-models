"use client"

import { CopyModelId, useCopyText } from "@/components/copy-model-id"
import { Meter } from "@/components/meter"
import { ProviderIcon } from "@/components/provider-icon"
import { blendOf, money, pct, score } from "@/lib/format"
import { policyLabel, type FeaturedPick } from "@/lib/picks"

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
  showPolicy = false,
}: {
  title: string
  hint?: string
  picks: FeaturedPick[]
  showPolicy?: boolean
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-balance text-ink">
            {title}
          </h2>
          <span className="inline-flex h-5 items-center rounded-md bg-inset px-1.5 text-[11.5px] font-medium text-ink-2 tabular-nums shadow-hairline">
            {picks.length}
          </span>
        </div>
        {hint ? <p className="text-[12px] text-ink-3">{hint}</p> : null}
      </div>
      {picks.map((pick) => (
        <PickCard key={pick.model.id} pick={pick} showPolicy={showPolicy} />
      ))}
    </section>
  )
}

function PickCard({
  pick,
  showPolicy,
}: {
  pick: FeaturedPick
  showPolicy: boolean
}) {
  const { model, roles } = pick
  const { status, copy } = useCopyText()
  const blend = blendOf(model)
  const why = [
    showPolicy ? policyLabel(model) : null,
    model.deepsecScore != null ? `${score(model.deepsecScore)} Deepsec` : null,
    model.deepsecBang != null ? `${score(model.deepsecBang, 2)} bang` : null,
    model.tokensShare > 0 ? `${pct(model.tokensShare)} tokens` : null,
    model.discountPercent != null
      ? `${Math.round(model.discountPercent)}% off`
      : null,
  ].filter((part): part is string => part != null)

  return (
    <article className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="primitive-card-pad">
        <div className="flex flex-wrap items-center gap-1">
          {roles.map((role) => (
            <span
              className="inline-flex h-5 items-center rounded-[5px] bg-inset px-1.5 text-[11px] font-medium text-ink-2"
              key={role.key}
            >
              {role.label}
            </span>
          ))}
        </div>
        <h3 className="mt-2 flex items-center gap-2 text-[15px] leading-tight font-semibold text-balance text-ink">
          <ProviderIcon provider={model.provider} />
          {model.name}
        </h3>
        <div className="mt-1.5 text-[13px] leading-relaxed text-pretty text-ink-2">
          <CopyModelId
            id={model.id}
            onCopy={() => copy(model.id)}
            status={status}
          />
          {why.length > 0 ? (
            <span className="text-ink-3"> · {why.join(" · ")}</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-inset primitive-card-footer">
        <span className="flex min-w-0 items-center gap-2">
          <Meter signal={Math.min(3, roles.length + 1)} />
          <span className="truncate text-[12.5px] font-medium text-ink-2">
            {blend != null ? `${money(blend)} / 1M` : "No blend"}
            {model.zdrProvider ? ` · ${model.zdrProvider}` : ""}
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
            className="inline-flex h-7 items-center gap-1.5 rounded-control bg-surface px-2.5 text-[12.5px] font-medium text-ink shadow-btn transition-[background-color,transform] duration-100 hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.96]"
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
