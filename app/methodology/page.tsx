import type { Metadata } from "next"

import { FaqList } from "@/components/faq-list"
import { JsonLd } from "@/components/json-ld"
import { PageFrame, PageHeader } from "@/components/page-frame"
import { SiteFooter } from "@/components/site-footer"
import { TextLink } from "@/components/text-link"
import {
  AA_ATTRIBUTION,
  AA_BENCHMARKS_URL,
  CATALOG_URL,
  DEEPSEC_RESULTS_URL,
  LABS_LEADERBOARD_URL,
  MODELS_LEADERBOARD_URL,
  MODELS_PAGE_URL,
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
            <strong className="font-medium text-ink">Homepage picks</strong>{" "}
            are the unrestricted winners. ZDR is a badge on the card when the
            priced route qualifies, and a second price when a cheaper non-ZDR
            route won. The privacy lane still ranks only models where the
            catalog marks both ZDR and no-training as{" "}
            <code className="font-mono text-[12.5px]">all</code> or{" "}
            <code className="font-mono text-[12.5px]">some</code>, matching
            Vercel&apos;s <code className="font-mono text-[12.5px]">?zdr=true</code>{" "}
            and <code className="font-mono text-[12.5px]">?npt=true</code>{" "}
            filters, at the cheapest ZDR endpoint.
          </li>
          <li>
            <strong className="font-medium text-ink">Open lane</strong> ranks
            the full catalog, including models that train or skip ZDR, priced
            at list or the cheapest endpoint of any kind, whichever is lower.
          </li>
          <li>
            <strong className="font-medium text-ink">Capable</strong> means
            tool-use plus at least {RANKING_RULES.minContext.toLocaleString()}{" "}
            tokens of context. Vision is not required.
          </li>
          <li>
            <strong className="font-medium text-ink">Blended price</strong> is{" "}
            {RANKING_RULES.inputWeight}× input + {RANKING_RULES.outputWeight}×
            output, in $ / 1M tokens, at the endpoint each lane would actually
            route through.
          </li>
          <li>
            <strong className="font-medium text-ink">Value</strong> is{" "}
            {RANKING_RULES.lookbackDays}-day mean token share divided by blended
            $ / 1M. Days a model is absent from the leaderboard count as zero.
          </li>
          <li>
            <strong className="font-medium text-ink">Bang-for-buck</strong> is a
            DeepsecBench run&apos;s score divided by that same run&apos;s cost —
            runs are never mixed. Frontier is the highest single-run score among
            capable models, falling back to Artificial Analysis intelligence
            only when nobody in the pool has a Deepsec run. We ignore Deepsec
            runs scoring below {RANKING_RULES.minDeepsecScore} when ranking
            bang.
          </li>
          <li>
            <strong className="font-medium text-ink">Cheap router</strong> is
            the cheapest adopted capable model blending at or under $
            {RANKING_RULES.cheapBlendUsd.toFixed(2)} / 1M.{" "}
            <strong className="font-medium text-ink">Workhorse</strong> is the
            highest everyday-run Deepsec score among capable models holding at
            least {RANKING_RULES.workhorseMinTokenShare}% token share at or
            under ${RANKING_RULES.midBlendUsd.toFixed(2)} / 1M.{" "}
            <strong className="font-medium text-ink">Rising</strong> is the
            most-adopted capable model DeepsecBench has not benchmarked yet.
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
            <TextLink external href={MODELS_PAGE_URL}>
              AI Gateway models page
            </TextLink>{" "}
            — official list-vs-sale discounts
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
          <li>
            <TextLink external href={AA_BENCHMARKS_URL}>
              Artificial Analysis indices via OpenRouter
            </TextLink>{" "}
            — {AA_ATTRIBUTION}
          </li>
        </ul>
      </section>

      <FaqList faqs={STATIC_FAQS} />
      <SiteFooter attribution={snapshot.attribution} week={snapshot.window.to} />
    </PageFrame>
  )
}
