import type { ReactNode } from "react"

import { FaqList } from "@/components/faq-list"
import { HeroLead } from "@/components/hero-lead"
import { JsonLd } from "@/components/json-ld"
import { LabsReadout } from "@/components/labs-readout"
import { ModelLedger } from "@/components/model-ledger"
import { PageFrame, PageHeader, type SiteNavCurrent } from "@/components/page-frame"
import { SiteFooter } from "@/components/site-footer"
import { TextLink } from "@/components/text-link"
import { VercelLogo } from "@/components/vercel-logo"
import { WeeklyPicks } from "@/components/weekly-picks"
import { formatWindow } from "@/lib/format"
import type { GatewayHistory, GatewaySnapshot } from "@/lib/gateway-snapshot"
import { weekPagePath } from "@/lib/gateway-snapshot"
import { siteFaqs, updatedLabel } from "@/lib/seo"

export function SnapshotPage({
  archiveWeek,
  current,
  jsonLd,
  note,
  showArchives = false,
  snapshot,
  title,
  whatChanged,
  history,
}: {
  archiveWeek?: string
  current: SiteNavCurrent
  history?: GatewayHistory
  jsonLd: unknown
  note?: ReactNode
  showArchives?: boolean
  snapshot: GatewaySnapshot
  title: ReactNode
  whatChanged?: ReactNode
}) {
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const archives = history ? [...history.weeks].toReversed() : []
  const cadence = snapshot.cadence

  return (
    <PageFrame>
      <JsonLd data={jsonLd} />
      <PageHeader
        current={current}
        meta={
          <>
            {updatedLabel(snapshot)} · {window} · {snapshot.stats.languageModels}{" "}
            models · {snapshot.stats.privacyModels} ZDR+NPT
          </>
        }
        title={title}
      >
        <HeroLead note={note} snapshot={snapshot} />
      </PageHeader>

      {whatChanged}
      <WeeklyPicks cadence={cadence} picks={snapshot.picks} />
      <ModelLedger cadence={cadence} lists={snapshot.lists} />
      <LabsReadout cadence={cadence} labs={snapshot.labs} />
      <FaqList faqs={siteFaqs(snapshot)} />

      {showArchives && archives.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-ink">Weekly archives</h2>
          <p className="text-[13px] leading-relaxed text-pretty text-ink-2">
            {archives.map((week, index) => (
              <span key={week.week}>
                {index > 0 ? " · " : null}
                <TextLink href={weekPagePath(week.week)}>
                  {formatWindow(week.from, week.week)}
                </TextLink>
              </span>
            ))}
          </p>
        </section>
      ) : null}

      <SiteFooter
        archiveWeek={archiveWeek}
        attribution={snapshot.attribution}
      />
    </PageFrame>
  )
}

export function gatewayTitle(label: string) {
  return (
    <>
      Best models on{" "}
      <span className="whitespace-nowrap">
        <VercelLogo className="mr-[0.22em] inline-block h-[0.62em] w-auto translate-y-[-0.03em]" />
        {label}
      </span>
    </>
  )
}
