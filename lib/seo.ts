import { blendOf, formatDay, formatWindow, money } from "@/lib/format"
import type { GatewaySnapshot, SnapshotModel } from "@/lib/gateway-snapshot"
import { weekPagePath } from "@/lib/gateway-snapshot"
import { STATIC_FAQS, type SiteFaq } from "@/lib/methodology"
import { weeklyFeaturedPicks } from "@/lib/picks"
import {
  GITHUB_REPO_URL,
  PUBLISHER_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  siteUrl,
} from "@/lib/site"

export function featuredValuePick(
  snapshot: GatewaySnapshot
): SnapshotModel | null {
  return snapshot.picks.open.bangForBuck ?? snapshot.picks.privacy.bangForBuck
}

export function featuredFrontierPick(
  snapshot: GatewaySnapshot
): SnapshotModel | null {
  return snapshot.picks.open.frontier ?? snapshot.picks.privacy.frontier
}

export function homeTitle(): string {
  return "Best AI Gateway models this week"
}

export function homeDescription(snapshot: GatewaySnapshot): string {
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)
  if (value && frontier && value.id !== frontier.id) {
    return `This week’s best Vercel AI Gateway models (${window}): ${value.name} for value, ${frontier.name} for frontier. Ranked from catalog, adoption, and DeepsecBench.`
  }
  if (value) {
    return `This week’s best Vercel AI Gateway model (${window}): ${value.name}. Weekly picks from catalog, adoption, and DeepsecBench.`
  }
  return `${SITE_DESCRIPTION} Week of ${window}.`
}

export function homeLead(snapshot: GatewaySnapshot): string {
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)
  if (value == null) {
    return `This week (${window}), bestmodels.dev ranks Vercel AI Gateway models from the live catalog, adoption, and DeepsecBench.`
  }

  const blend = money(blendOf(value))
  const provider = value.zdrProvider ? ` on ${value.zdrProvider}` : ""
  const discount =
    value.discountPercent != null
      ? ` (${Math.round(value.discountPercent)}% off)`
      : ""
  const valueClause = `the best pick on AI Gateway is ${value.name} at ${blend} / 1M blended${provider}${discount}`

  if (frontier && frontier.id !== value.id) {
    return `This week (${window}), ${valueClause}. The frontier pick is ${frontier.name}.`
  }
  return `This week (${window}), ${valueClause}.`
}

export function siteFaqs(snapshot: GatewaySnapshot): SiteFaq[] {
  return [
    {
      question: "What is the best AI Gateway model this week?",
      answer: homeLead(snapshot),
    },
    ...STATIC_FAQS,
  ]
}

function listItems(models: SnapshotModel[]) {
  return models.map((model, index) => ({
    "@type": "ListItem" as const,
    position: index + 1,
    name: model.name,
    url: model.href,
  }))
}

export function homeJsonLd(snapshot: GatewaySnapshot) {
  const weekly = weeklyFeaturedPicks(snapshot.picks).map((pick) => pick.model)
  const faqs = siteFaqs(snapshot)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: PUBLISHER_NAME,
        url: SITE_ORIGIN,
        sameAs: [GITHUB_REPO_URL],
      },
      {
        "@type": "Dataset",
        "@id": `${SITE_ORIGIN}/#dataset`,
        name: "Weekly Vercel AI Gateway model rankings",
        description: SITE_DESCRIPTION,
        url: SITE_ORIGIN,
        license: snapshot.attribution.licenseUrl,
        creator: {
          "@type": "Organization",
          name: "Vercel",
        },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        dateModified: snapshot.generatedAt,
        temporalCoverage: `${snapshot.window.from}/${snapshot.window.to}`,
        isAccessibleForFree: true,
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl: siteUrl("/data/gateway.json"),
          },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_ORIGIN}/#weekly-picks`,
        name: "This week's AI Gateway picks",
        itemListElement: listItems(weekly),
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_ORIGIN}/#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  }
}

export function methodologyJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": siteUrl("/methodology"),
        url: siteUrl("/methodology"),
        name: "How we rank AI Gateway models",
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl("/methodology")}#faq`,
        mainEntity: STATIC_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  }
}

export function weekJsonLd(snapshot: GatewaySnapshot) {
  const path = weekPagePath(snapshot.window.to)
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `AI Gateway model rankings for ${formatWindow(snapshot.window.from, snapshot.window.to)}`,
    url: siteUrl(path),
    dateModified: snapshot.generatedAt,
    license: snapshot.attribution.licenseUrl,
    temporalCoverage: `${snapshot.window.from}/${snapshot.window.to}`,
    isAccessibleForFree: true,
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: siteUrl(`/data/weeks/${snapshot.window.to}.json`),
    },
  }
}

export function updatedLabel(snapshot: GatewaySnapshot): string {
  return `Updated ${formatDay(snapshot.generatedAt)}`
}
