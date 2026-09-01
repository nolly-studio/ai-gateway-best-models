import { describe, expect, it } from "vitest"

import type { GatewaySnapshot, SnapshotModel } from "./gateway-snapshot"
import { SNAPSHOT_SCHEMA_VERSION } from "./gateway-snapshot"
import { homeDescription, homeJsonLd, homeLead, siteFaqs } from "./seo"

function model(
  id: string,
  name: string,
  extras: Partial<SnapshotModel> = {}
): SnapshotModel {
  return {
    id,
    name,
    href: `https://vercel.com/ai-gateway/models/${id.split("/").at(-1)}`,
    provider: null,
    tags: [],
    zdr: "some",
    noTraining: "some",
    contextWindow: 128000,
    inputPerMillion: 0.13,
    outputPerMillion: 0.26,
    blendedPerMillion: 0.1625,
    zdrBlendedPerMillion: 0.1125,
    zdrProvider: "deepinfra",
    discounted: true,
    discountPercent: 31,
    requestsShare: 0,
    tokensShare: 0,
    spendShare: 0,
    valueScore: null,
    overpay: null,
    deepsecBest: null,
    deepsecValue: null,
    deepsecEveryday: null,
    aa: null,
    ...extras,
  }
}

function snapshot(): GatewaySnapshot {
  const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
  const sol = model("openai/gpt-5.6-sol", "GPT 5.6 Sol", {
    zdrBlendedPerMillion: 11.25,
    blendedPerMillion: 11.25,
    zdrProvider: "azure",
    discounted: false,
    discountPercent: null,
  })

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: "2026-08-31T20:58:47.079Z",
    window: { from: "2026-08-25", to: "2026-08-31", lookbackDays: 7 },
    sources: {
      catalog: "https://ai-gateway.vercel.sh/v1/models",
      models: "https://vercel.com/api/ai/leaderboard-export",
      labs: "https://vercel.com/api/ai/leaderboard-export",
      deepsec: "https://vercel.com/ai-gateway/leaderboards/deepsecbench",
      aa: "https://openrouter.ai/api/v1/benchmarks",
    },
    attribution: {
      text: "© 2026 Vercel.",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
    stats: {
      languageModels: 240,
      zdrModels: 176,
      privacyModels: 176,
      deepsecRuns: 35,
      aaModels: 0,
    },
    picks: {
      privacy: {
        bangForBuck: flash,
        workhorse: flash,
        cheapRouter: flash,
        frontier: sol,
        rising: null,
      },
      open: {
        bangForBuck: flash,
        workhorse: flash,
        cheapRouter: flash,
        frontier: sol,
        rising: null,
      },
    },
    lists: {
      privacy: {
        aaIntelligence: [],
        aaCoding: [],
        deepsecBang: [],
        deepsecScore: [],
        discounted: [],
        cheapCapable: [],
        tokenShare: [],
        spendShare: [],
      },
      open: {
        aaIntelligence: [],
        aaCoding: [],
        deepsecBang: [],
        deepsecScore: [],
        discounted: [],
        cheapCapable: [],
        tokenShare: [],
        spendShare: [],
      },
    },
    labs: [],
    unmatched: { leaderboard: [], deepsec: [], aa: [] },
    analysis: null,
  }
}

describe("seo copy", () => {
  it("names this week's value and frontier picks in the lead", () => {
    expect(homeLead(snapshot())).toContain(
      "the best pick on AI Gateway is DeepSeek V4 Flash at $0.113 / 1M blended on deepinfra (31% off)"
    )
    expect(homeLead(snapshot())).toContain("The frontier pick is GPT 5.6 Sol")
  })

  it("keeps the meta description under 170 characters", () => {
    const description = homeDescription(snapshot())
    expect(description.length).toBeGreaterThan(140)
    expect(description.length).toBeLessThan(170)
    expect(description).toContain("DeepSeek V4 Flash")
    expect(description).toContain("GPT 5.6 Sol")
  })

  it("builds FAQ and dataset JSON-LD from the snapshot", () => {
    const data = homeJsonLd(snapshot())
    const types = data["@graph"].map((node) => node["@type"])
    expect(types).toEqual([
      "WebSite",
      "Organization",
      "Dataset",
      "ItemList",
      "FAQPage",
    ])
    expect(siteFaqs(snapshot())[0]?.question).toBe(
      "What is the best AI Gateway model this week?"
    )
  })
})
