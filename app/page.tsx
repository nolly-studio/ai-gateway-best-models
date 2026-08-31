import type { Metadata } from "next"

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
import { readHistory, readSnapshot } from "@/lib/read-snapshot"
import {
  homeDescription,
  homeJsonLd,
  homeTitle,
  siteFaqs,
  updatedLabel,
} from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const snapshot = await readSnapshot()
  const title = homeTitle()
  const description = homeDescription(snapshot)

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: "/",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function Page() {
  const [snapshot, history] = await Promise.all([
    readSnapshot(),
    readHistory(),
  ])
  const privacyPicks = groupPicks(snapshot.picks.privacy)
  const openPicks = groupPicks(snapshot.picks.open)
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const archives = [...history.weeks].toReversed()

  return (
    <PageFrame>
      <JsonLd data={homeJsonLd(snapshot)} />
      <PageHeader
        current="picks"
        meta={
          <>
            {updatedLabel(snapshot)} · {window} · {snapshot.stats.languageModels}{" "}
            models · {snapshot.stats.privacyModels} ZDR+NPT
          </>
        }
        title="Best models on AI Gateway"
      >
        <HeroLead snapshot={snapshot} />
      </PageHeader>

      <PickCards
        hint="Zero data retention and no training on prompts"
        picks={privacyPicks}
        title={laneHeading("privacy")}
      />
      <PickCards
        hint="Includes models that train or skip ZDR"
        picks={openPicks}
        showPolicy
        title={laneHeading("open")}
      />
      <ModelLedger lists={snapshot.lists} />
      <LabsReadout labs={snapshot.labs} />
      <FaqList faqs={siteFaqs(snapshot)} />

      {archives.length > 0 ? (
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
        attribution={snapshot.attribution}
        week={snapshot.window.to}
      />
    </PageFrame>
  )
}
