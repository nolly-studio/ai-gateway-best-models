import { describe, expect, it } from "vitest"

import {
  emptyHistory,
  HISTORY_SCHEMA_VERSION,
  priorWeekTokenShares,
  SNAPSHOT_SCHEMA_VERSION,
  toHistoryWeek,
  tokenSharesFromModels,
  upsertHistory,
  weekSnapshotPublicPath,
  type GatewaySnapshot,
  type SnapshotModel,
} from "./gateway-snapshot"

function model(
  id: string,
  metrics: {
    tokensShare?: number
    zdrBlendedPerMillion?: number | null
    deepsecBang?: number | null
    valueScore?: number | null
  } = {}
): SnapshotModel {
  return {
    id,
    name: id,
    href: `https://vercel.com/ai-gateway/models/${id.split("/").at(-1)}`,
    provider: null,
    tags: [],
    zdr: "some",
    noTraining: "some",
    contextWindow: 128000,
    inputPerMillion: 1,
    outputPerMillion: 1,
    blendedPerMillion: 1,
    zdrBlendedPerMillion: metrics.zdrBlendedPerMillion ?? 1,
    zdrProvider: null,
    discounted: false,
    discountPercent: null,
    requestsShare: 0,
    tokensShare: metrics.tokensShare ?? 0,
    spendShare: 0,
    valueScore: metrics.valueScore ?? null,
    overpay: null,
    deepsecBest: null,
    deepsecValue:
      metrics.deepsecBang != null
        ? {
            score: 15.48,
            effort: "medium",
            costUsd: 5.06,
            bang: metrics.deepsecBang,
          }
        : null,
    deepsecEveryday: null,
    aa: null,
  }
}

function snapshot(overrides: Partial<GatewaySnapshot> = {}): GatewaySnapshot {
  const flash = model("deepseek/deepseek-v4-flash", {
    tokensShare: 22.27,
    zdrBlendedPerMillion: 0.1125,
    deepsecBang: 3.06,
    valueScore: 197.97,
  })

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: "2026-08-31T19:00:00.000Z",
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
        frontier: model("openai/gpt-5.6-sol", {
          tokensShare: 0,
          zdrBlendedPerMillion: 11.25,
          deepsecBang: 1.4,
          valueScore: null,
        }),
        rising: null,
      },
      open: {
        bangForBuck: flash,
        workhorse: flash,
        cheapRouter: flash,
        frontier: model("openai/gpt-5.6-sol", {
          tokensShare: 0,
          zdrBlendedPerMillion: 11.25,
          deepsecBang: 1.4,
          valueScore: null,
        }),
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
    ...overrides,
  }
}

describe("toHistoryWeek", () => {
  it("indexes picks by window.to and keeps chart metrics", () => {
    const week = toHistoryWeek(snapshot())

    expect(week.week).toBe("2026-08-31")
    expect(week.from).toBe("2026-08-25")
    expect(week.generatedAt).toBe("2026-08-31T19:00:00.000Z")
    expect(week.href).toBe(weekSnapshotPublicPath("2026-08-31"))
    expect(week.stats.privacyModels).toBe(176)
    expect(week.picks.privacy).toEqual({
      bangForBuck: "deepseek/deepseek-v4-flash",
      workhorse: "deepseek/deepseek-v4-flash",
      cheapRouter: "deepseek/deepseek-v4-flash",
      frontier: "openai/gpt-5.6-sol",
      rising: null,
    })
    expect(week.picks.open.bangForBuck).toBe("deepseek/deepseek-v4-flash")
    expect(week.pickMetrics.privacy.bangForBuck).toEqual({
      tokensShare: 22.27,
      zdrBlendedPerMillion: 0.1125,
      deepsecBang: 3.06,
      valueScore: 197.97,
    })
    expect(week.pickMetrics.privacy.frontier?.valueScore).toBeNull()
    expect(week.tokenShares).toBeUndefined()
  })

  it("stores token shares for the next week's rising sort", () => {
    const week = toHistoryWeek(snapshot(), {
      "deepseek/deepseek-v4-flash": 22.27,
      "stepfun/step-3.7-flash": 10.1,
    })

    expect(week.tokenShares).toEqual({
      "deepseek/deepseek-v4-flash": 22.27,
      "stepfun/step-3.7-flash": 10.1,
    })
    expect(
      priorWeekTokenShares(
        { schemaVersion: HISTORY_SCHEMA_VERSION, weeks: [week] },
        "2026-09-07"
      )
    ).toEqual(week.tokenShares)
    expect(
      priorWeekTokenShares(
        { schemaVersion: HISTORY_SCHEMA_VERSION, weeks: [week] },
        "2026-08-31"
      )
    ).toBeUndefined()
    expect(
      tokenSharesFromModels([
        { id: "deepseek/deepseek-v4-flash", tokensShare: 22.27 },
        { id: "openai/gpt-5.6-sol", tokensShare: 0 },
      ])
    ).toEqual({ "deepseek/deepseek-v4-flash": 22.27 })
  })

  it("omits metrics for a missing pick", () => {
    const week = toHistoryWeek(
      snapshot({
        picks: {
          privacy: {
            bangForBuck: model("deepseek/deepseek-v4-flash"),
            workhorse: null,
            cheapRouter: null,
            frontier: null,
            rising: null,
          },
          open: {
            bangForBuck: model("deepseek/deepseek-v4-flash"),
            workhorse: null,
            cheapRouter: null,
            frontier: null,
            rising: null,
          },
        },
      })
    )

    expect(week.picks.privacy.workhorse).toBeNull()
    expect(week.pickMetrics.privacy.workhorse).toBeUndefined()
    expect(week.pickMetrics.privacy.bangForBuck).toBeDefined()
  })
})

describe("upsertHistory", () => {
  it("inserts weeks in chronological order", () => {
    const later = toHistoryWeek(snapshot())
    const earlier = toHistoryWeek(
      snapshot({
        generatedAt: "2026-08-24T12:00:00.000Z",
        window: { from: "2026-08-18", to: "2026-08-24", lookbackDays: 7 },
      })
    )

    const history = upsertHistory(upsertHistory(emptyHistory(), later), earlier)

    expect(history.schemaVersion).toBe(HISTORY_SCHEMA_VERSION)
    expect(history.weeks.map((row) => row.week)).toEqual([
      "2026-08-24",
      "2026-08-31",
    ])
  })

  it("replaces the same week instead of duplicating it", () => {
    const first = toHistoryWeek(snapshot())
    const updated = toHistoryWeek(
      snapshot({
        generatedAt: "2026-08-31T21:00:00.000Z",
        picks: {
          privacy: {
            bangForBuck: model("alibaba/qwen3.8-max"),
            workhorse: model("deepseek/deepseek-v4-flash"),
            cheapRouter: model("deepseek/deepseek-v4-flash"),
            frontier: model("openai/gpt-5.6-sol"),
            rising: null,
          },
          open: {
            bangForBuck: model("alibaba/qwen3.8-max"),
            workhorse: model("deepseek/deepseek-v4-flash"),
            cheapRouter: model("deepseek/deepseek-v4-flash"),
            frontier: model("openai/gpt-5.6-sol"),
            rising: null,
          },
        },
      })
    )

    const history = upsertHistory(upsertHistory(emptyHistory(), first), updated)

    expect(history.weeks).toHaveLength(1)
    expect(history.weeks[0]?.generatedAt).toBe("2026-08-31T21:00:00.000Z")
    expect(history.weeks[0]?.picks.privacy.bangForBuck).toBe(
      "alibaba/qwen3.8-max"
    )
  })
})
