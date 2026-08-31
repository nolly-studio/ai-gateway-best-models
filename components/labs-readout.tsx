import { ProviderIcon } from "@/components/provider-icon"
import { pct } from "@/lib/format"
import type { SnapshotLab } from "@/lib/gateway-snapshot"

export function LabsReadout({ labs }: { labs: SnapshotLab[] }) {
  const maxTokens = Math.max(...labs.map((lab) => lab.tokensShare), 1)
  const maxSpend = Math.max(...labs.map((lab) => lab.spendShare), 1)

  return (
    <section className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="flex primitive-card-bar items-center justify-between border-b border-line">
        <span className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-ink">Labs</h2>
          <span className="inline-flex h-5 items-center rounded-md bg-inset px-1.5 text-[11.5px] font-medium text-ink-2 tabular-nums shadow-hairline">
            {labs.length}
          </span>
        </span>
        <span className="text-[12px] text-ink-3">Token share vs spend</span>
      </div>
      <div className="flex flex-col">
        {labs.map((lab) => (
          <div
            className="grid grid-cols-[108px_1fr_auto] items-center gap-3 border-b border-line px-3 py-2 last:border-0"
            key={lab.name}
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
          </div>
        ))}
      </div>
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
