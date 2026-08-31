import type { Metadata } from "next"

import { FaqList } from "@/components/faq-list"
import { JsonLd } from "@/components/json-ld"
import { PageFrame, PageHeader } from "@/components/page-frame"
import { SiteFooter } from "@/components/site-footer"
import { TextLink } from "@/components/text-link"
import {
  CATALOG_URL,
  DEEPSEC_RESULTS_URL,
  LABS_LEADERBOARD_URL,
  MODELS_LEADERBOARD_URL,
} from "@/lib/gateway-snapshot"
import { RANKING_RULES, STATIC_FAQS } from "@/lib/methodology"
import { readSnapshot } from "@/lib/read-snapshot"
import { methodologyJsonLd } from "@/lib/seo"

const title = "How we rank AI Gateway models"
const description =
  "Independent methodology for weekly Vercel AI Gateway picks: ZDR + no-training filters, capable-model rules, blended price, bang-for-buck, and DeepsecBench."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/methodology" },
  openGraph: {
    title,
    description,
    url: "/methodology",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
}

export default async function MethodologyPage() {
  const snapshot = await readSnapshot()

  return (
    <PageFrame>
      <JsonLd data={methodologyJsonLd()} />
      <PageHeader
        current="methodology"
        meta="Ranking rules · 7-day lookback"
        title="How we rank AI Gateway models"
      >
        Independent weekly ranking. Not affiliated with Vercel. Catalog,
        adoption, and DeepsecBench numbers come from Vercel AI Gateway data
        licensed CC BY 4.0.
      </PageHeader>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-ink">
          What the weekly picks mean
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[13.5px] leading-relaxed text-pretty text-ink-2">
          <li>
            <strong className="font-medium text-ink">Privacy lane</strong> keeps
            models where the catalog marks both ZDR and no-training as{" "}
            <code className="font-mono text-[12.5px]">all</code> or{" "}
            <code className="font-mono text-[12.5px]">some</code>. That matches
            Vercel&apos;s <code className="font-mono text-[12.5px]">?zdr=true</code>{" "}
            and <code className="font-mono text-[12.5px]">?npt=true</code>{" "}
            filters.
          </li>
          <li>
            <strong className="font-medium text-ink">Open lane</strong> ranks
            the full catalog, including models that train or skip ZDR.
          </li>
          <li>
            <strong className="font-medium text-ink">Capable</strong> means
            tool-use plus at least {RANKING_RULES.minContext.toLocaleString()}{" "}
            tokens of context. Vision is not required.
          </li>
          <li>
            <strong className="font-medium text-ink">Blended price</strong> is{" "}
            {RANKING_RULES.inputWeight}× input + {RANKING_RULES.outputWeight}×
            output, in $ / 1M tokens. Privacy ranks prefer a cheaper ZDR
            endpoint when one exists.
          </li>
          <li>
            <strong className="font-medium text-ink">Value</strong> is{" "}
            {RANKING_RULES.lookbackDays}-day mean token share divided by blended
            $ / 1M.
          </li>
          <li>
            <strong className="font-medium text-ink">Bang-for-buck</strong> is
            DeepsecBench score divided by that run&apos;s cost. Frontier prefers
            the highest Deepsec score among capable models; we ignore scores
            below {RANKING_RULES.minDeepsecScore} when ranking bang.
          </li>
          <li>
            <strong className="font-medium text-ink">Cheap router</strong> blends
            at or under ${RANKING_RULES.cheapBlendUsd.toFixed(2)} / 1M.{" "}
            <strong className="font-medium text-ink">Workhorse</strong> blends at
            or under ${RANKING_RULES.midBlendUsd.toFixed(2)} / 1M.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-ink">Sources</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13.5px] leading-relaxed text-ink-2">
          <li>
            <TextLink external href={CATALOG_URL}>
              AI Gateway catalog
            </TextLink>
          </li>
          <li>
            <TextLink external href={MODELS_LEADERBOARD_URL}>
              Model adoption leaderboard
            </TextLink>
          </li>
          <li>
            <TextLink external href={LABS_LEADERBOARD_URL}>
              Lab adoption leaderboard
            </TextLink>
          </li>
          <li>
            <TextLink external href={DEEPSEC_RESULTS_URL}>
              DeepsecBench results
            </TextLink>
          </li>
        </ul>
      </section>

      <FaqList faqs={STATIC_FAQS} />
      <SiteFooter attribution={snapshot.attribution} week={snapshot.window.to} />
    </PageFrame>
  )
}
