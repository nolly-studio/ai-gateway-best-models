import { LabsReadout } from "@/components/labs-readout"
import { ModelLedger } from "@/components/model-ledger"
import { PickCards } from "@/components/pick-cards"
import { formatWindow } from "@/lib/format"
import { readSnapshot } from "@/lib/gateway-snapshot"
import { groupPicks } from "@/lib/picks"

export async function generateMetadata() {
  const snapshot = await readSnapshot()
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  return {
    title: "Best AI Gateway models",
    description: `Weekly ZDR and no-training picks from Vercel AI Gateway for ${window}.`,
  }
}

export default async function Page() {
  const snapshot = await readSnapshot()
  const picks = groupPicks(snapshot.picks)
  const window = formatWindow(snapshot.window.from, snapshot.window.to)

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11.5px] text-ink-3">
          {window} · {snapshot.stats.languageModels} models ·{" "}
          {snapshot.stats.privacyModels} ZDR+NPT
        </p>
        <h1 className="text-[22px] leading-tight font-semibold text-balance text-ink">
          Best models on AI Gateway
        </h1>
        <p className="max-w-prose text-[13.5px] leading-relaxed text-pretty text-ink-2">
          Weekly picks that keep zero data retention and no training on prompts,
          ranked from live catalog, adoption, discounts, and DeepsecBench.
        </p>
      </header>

      <PickCards picks={picks} />
      <ModelLedger lists={snapshot.lists} />
      <LabsReadout labs={snapshot.labs} />

      <footer className="flex flex-col gap-2 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-3">
        <p className="text-pretty">
          {snapshot.attribution.text}{" "}
          <a
            className="underline decoration-transparent underline-offset-2 transition-colors duration-100 hover:text-ink-2 hover:decoration-current"
            href={snapshot.attribution.licenseUrl}
            rel="noreferrer"
            target="_blank"
          >
            License
          </a>
          {" · "}
          <a
            className="underline decoration-transparent underline-offset-2 transition-colors duration-100 hover:text-ink-2 hover:decoration-current"
            href="/data/gateway.json"
          >
            JSON
          </a>
          {" · "}
          <a
            className="underline decoration-transparent underline-offset-2 transition-colors duration-100 hover:text-ink-2 hover:decoration-current"
            href="/data/history.json"
          >
            History
          </a>
        </p>
        <p className="font-mono text-[11px]">
          Press{" "}
          <kbd className="rounded-[4px] bg-inset px-1 py-px shadow-hairline">
            d
          </kbd>{" "}
          to toggle dark mode
        </p>
      </footer>
    </main>
  )
}
