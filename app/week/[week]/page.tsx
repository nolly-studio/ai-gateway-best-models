import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { FaqList } from "@/components/faq-list"
import { JsonLd } from "@/components/json-ld"
import { LabsReadout } from "@/components/labs-readout"
import { ModelLedger } from "@/components/model-ledger"
import { HeroLead } from "@/components/hero-lead"
import { PageFrame, PageHeader } from "@/components/page-frame"
import { PickCards } from "@/components/pick-cards"
import { SiteFooter } from "@/components/site-footer"
import { TextLink } from "@/components/text-link"
import { formatWindow } from "@/lib/format"
import { weekPagePath } from "@/lib/gateway-snapshot"
import { groupPicks, laneHeading } from "@/lib/picks"
import { readHistory, readWeekSnapshot } from "@/lib/read-snapshot"
import { homeLead, siteFaqs, updatedLabel, weekJsonLd } from "@/lib/seo"

type WeekPageProps = {
  params: Promise<{ week: string }>
}

export async function generateStaticParams() {
  const history = await readHistory()
  return history.weeks.map((week) => ({ week: week.week }))
}

export async function generateMetadata({
  params,
}: WeekPageProps): Promise<Metadata> {
  const { week } = await params
  const snapshot = await readWeekSnapshot(week)
  if (snapshot == null) {
    return { title: "Week not found" }
  }

  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const title = `AI Gateway models for ${window}`
  const description = homeLead(snapshot)

  return {
    title,
    description,
    alternates: { canonical: weekPagePath(week) },
    openGraph: {
      title,
      description,
      url: weekPagePath(week),
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function WeekPage({ params }: WeekPageProps) {
  const { week } = await params
  const [snapshot, history] = await Promise.all([
    readWeekSnapshot(week),
    readHistory(),
  ])
  if (snapshot == null) {
    notFound()
  }

  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const weeks = history.weeks
  const index = weeks.findIndex((row) => row.week === week)
  const previous = index > 0 ? weeks[index - 1] : null
  const next =
    index >= 0 && index < weeks.length - 1 ? weeks[index + 1] : null

  return (
    <PageFrame>
      <JsonLd data={weekJsonLd(snapshot)} />
      <PageHeader
        current="picks"
        meta={
          <>
            {updatedLabel(snapshot)} · {window} · {snapshot.stats.languageModels}{" "}
            models · {snapshot.stats.privacyModels} ZDR+NPT
          </>
        }
        title={`Best models on AI Gateway for ${window}`}
      >
        <HeroLead
          note={
            <>
              {" "}
              Snapshot of the weekly ranking.{" "}
              <TextLink href="/">See the current week</TextLink>.
            </>
          }
          snapshot={snapshot}
        />
      </PageHeader>

      <PickCards
        hint="Zero data retention and no training on prompts"
        picks={groupPicks(snapshot.picks.privacy)}
        title={laneHeading("privacy")}
      />
      <PickCards
        hint="Includes models that train or skip ZDR"
        picks={groupPicks(snapshot.picks.open)}
        showPolicy
        title={laneHeading("open")}
      />
      <ModelLedger lists={snapshot.lists} />
      <LabsReadout labs={snapshot.labs} />
      <FaqList faqs={siteFaqs(snapshot)} />

      <nav className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
        {previous ? (
          <TextLink href={weekPagePath(previous.week)}>
            ← {formatWindow(previous.from, previous.week)}
          </TextLink>
        ) : (
          <span />
        )}
        {next ? (
          <TextLink href={weekPagePath(next.week)}>
            {formatWindow(next.from, next.week)} →
          </TextLink>
        ) : (
          <span />
        )}
      </nav>

      <SiteFooter attribution={snapshot.attribution} week={week} />
    </PageFrame>
  )
}
