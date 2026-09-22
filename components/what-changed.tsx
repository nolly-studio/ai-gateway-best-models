import { ProviderIcon } from "@/components/provider-icon"
import { TextLink } from "@/components/text-link"
import { formatWindow, pct } from "@/lib/format"
import {
  MODELS_PAGE_URL,
  SNAPSHOT_LANE_KEYS,
  SNAPSHOT_PICK_KEYS,
  type GatewaySnapshot,
  type SnapshotModel,
  type SnapshotPickKey,
} from "@/lib/gateway-snapshot"
import { pickLabel } from "@/lib/picks"
import { cn } from "@/lib/utils"

const modelLinkClass =
  "inline-flex min-w-0 items-center gap-1.5 text-[13px] transition-colors duration-100 hover:text-ink-2 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"

function modelPageHref(id: string): string {
  const slug = id.split("/").at(-1) ?? id
  return `${MODELS_PAGE_URL}/${slug}`
}

function providerFromId(id: string): string | null {
  const provider = id.split("/")[0]
  return provider == null || provider.length === 0 ? null : provider
}

function modelsById(snapshot: GatewaySnapshot): Map<string, SnapshotModel> {
  const byId = new Map<string, SnapshotModel>()
  for (const lane of SNAPSHOT_LANE_KEYS) {
    for (const key of SNAPSHOT_PICK_KEYS) {
      const model = snapshot.picks[lane][key]
      if (model != null) {
        byId.set(model.id, model)
      }
    }
    for (const models of Object.values(snapshot.lists[lane])) {
      for (const model of models) {
        byId.set(model.id, model)
      }
    }
  }
  return byId
}

function signedShare(value: number): string {
  const rounded = Number(value.toFixed(1))
  if (rounded === 0) {
    return pct(0)
  }
  if (rounded > 0) {
    return `+${pct(rounded)}`
  }
  return pct(rounded)
}

function shareTone(value: number): string {
  const rounded = Number(value.toFixed(1))
  if (rounded > 0) {
    return "text-green"
  }
  if (rounded < 0) {
    return "text-ink-2"
  }
  return "text-ink-3"
}

type WinnerChange = {
  key: SnapshotPickKey
  fromId: string | null
  toId: string | null
}

function winnerChanges(snapshot: GatewaySnapshot): WinnerChange[] {
  const openDiffs = snapshot.delta?.vsWeek.open ?? {}
  return SNAPSHOT_PICK_KEYS.flatMap((key) => {
    const diff = openDiffs[key]
    return diff == null ? [] : [{ key, fromId: diff.from, toId: diff.to }]
  })
}

function ModelLink({
  id,
  model,
  muted = false,
}: {
  id: string
  model: SnapshotModel | undefined
  muted?: boolean
}) {
  const name = model?.name ?? id.split("/").at(-1) ?? id
  return (
    <a
      className={cn(
        modelLinkClass,
        muted ? "text-ink-3" : "font-medium text-ink"
      )}
      href={model?.href ?? modelPageHref(id)}
      rel="noreferrer"
      target="_blank"
    >
      <ProviderIcon
        className="size-3.5"
        provider={model?.provider ?? providerFromId(id)}
      />
      <span className="truncate">{name}</span>
    </a>
  )
}

function WinnerRow({
  byId,
  change,
}: {
  byId: Map<string, SnapshotModel>
  change: WinnerChange
}) {
  const from = change.fromId == null ? undefined : byId.get(change.fromId)
  const to = change.toId == null ? undefined : byId.get(change.toId)

  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex h-5 items-center rounded-chip bg-inset px-1.5 text-xs font-medium text-ink-2">
        {pickLabel(change.key)}
      </span>
      {change.fromId != null && change.toId != null ? (
        <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <ModelLink id={change.fromId} model={from} muted />
          <span aria-hidden="true" className="text-ink-3">
            →
          </span>
          <span className="sr-only">to</span>
          <ModelLink id={change.toId} model={to} />
        </span>
      ) : (
        <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink-2">
          {change.toId != null ? "is now" : "left"}
          {change.toId != null ? (
            <ModelLink id={change.toId} model={to} />
          ) : change.fromId != null ? (
            <ModelLink id={change.fromId} model={from} />
          ) : null}
        </span>
      )}
    </li>
  )
}

export function WhatChanged({ snapshot }: { snapshot: GatewaySnapshot }) {
  const byId = modelsById(snapshot)
  const changes = winnerChanges(snapshot)
  const movers = snapshot.delta?.movers ?? []
  const sales = snapshot.lists.open.discounted.filter(
    (model) => model.discounted
  )
  const asOf = snapshot.window.to
    ? formatWindow(snapshot.window.from, snapshot.window.to)
    : null

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 px-0.5">
        <h2 className="text-sm font-semibold text-balance text-ink">
          What changed
        </h2>
        <p className="text-xs text-pretty text-ink-3">
          Versus <TextLink href="/week">this week</TextLink>
          {asOf != null ? ` · as of ${asOf}` : null}. Same fetch, not yesterday.
        </p>
      </div>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className="border-b border-line px-3 py-2.5 last:border-b-0">
          {changes.length === 0 ? (
            <p className="text-[13px] text-pretty text-ink-2">
              Same winners as <TextLink href="/week">this week</TextLink>.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {changes.map((change) => (
                <WinnerRow byId={byId} change={change} key={change.key} />
              ))}
            </ul>
          )}
        </div>
        {movers.length > 0 ? (
          <div className="border-b border-line last:border-b-0">
            <h3 className="px-3 pt-2.5 text-[11.5px] font-medium text-ink-3">
              Movers vs 7-day mean
            </h3>
            <ul>
              {movers.map((mover) => {
                const model = byId.get(mover.id)
                return (
                  <li
                    className="grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-3 px-3 py-2"
                    key={mover.id}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ProviderIcon
                        provider={model?.provider ?? providerFromId(mover.id)}
                      />
                      <span className="min-w-0">
                        <a
                          className="block truncate text-[13px] font-medium text-ink transition-colors duration-100 hover:text-ink-2 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                          href={model?.href ?? modelPageHref(mover.id)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {mover.name}
                        </a>
                        <span className="block truncate text-[11px] text-ink-3 tabular-nums">
                          {pct(mover.dayShare)} today · {pct(mover.weekShare)}{" "}
                          week
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "text-right text-[13px] font-medium tabular-nums",
                        shareTone(mover.delta)
                      )}
                    >
                      {signedShare(mover.delta)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {sales.length > 0 ? (
          <div className="border-b border-line px-3 py-3 last:border-b-0">
            <h3 className="text-[11.5px] font-medium text-ink-3">
              On sale <span className="tabular-nums">{sales.length}</span>
            </h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {sales.map((model) => (
                <li className="max-w-full" key={model.id}>
                  <a
                    className="inline-flex h-6 max-w-full items-center gap-1 rounded-chip bg-green-tint pr-1.5 pl-1 text-xs font-medium text-green shadow-hairline transition-[background-color,transform] duration-100 hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none motion-safe:active:scale-[0.96]"
                    href={model.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ProviderIcon
                      className="size-3.5"
                      provider={model.provider}
                    />
                    <span className="truncate">{model.name}</span>
                    {model.discountPercent != null ? (
                      <span className="shrink-0 tabular-nums">
                        {Math.round(model.discountPercent)}% off
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
