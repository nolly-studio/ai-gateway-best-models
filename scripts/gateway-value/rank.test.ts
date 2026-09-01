import { describe, expect, it } from "vitest"

import { SNAPSHOT_SCHEMA_VERSION } from "../../lib/gateway-snapshot"
import {
  formatDuration,
  parseAaFreeModels,
  parseDeepsecHtml,
  parseDeepsecResults,
  parseModelsPageFlight,
  parseOpenRouterBenchmarks,
  parseOpenRouterModels,
} from "./fetch"
import {
  attachAa,
  attachDeepsec,
  attachEndpoints,
  attachPromo,
  averageAdoption,
  blendedCost,
  everydayDeepsecRun,
  hasNoTraining,
  hasPrivacy,
  hasQualityFloor,
  hasZdr,
  indexCatalog,
  isCapable,
  lookbackWindow,
  matchAaRecord,
  matchCatalog,
  matchModelId,
  modelFamily,
  pickBangForBuck,
  pickCheapRouter,
  pickDefaultWorkhorse,
  pickFrontier,
  pickRising,
  rankFromBoard,
  rankFromCatalog,
  spendOverpay,
  tokenValueScore,
  type DeepsecRow,
  type GatewayModel,
  type LeaderboardRow,
  type RankedModel,
} from "./rank"
import {
  buildLabBang,
  buildLists,
  buildSnapshot,
  toSnapshotLabs,
} from "./snapshot"

const capableModel: GatewayModel = {
  id: "deepseek/deepseek-v4-flash",
  name: "DeepSeek V4 Flash",
  owned_by: "deepseek",
  type: "language",
  context_window: 1_000_000,
  tags: ["tool-use", "reasoning"],
  zdr: "some",
  no_training: "some",
  pricing: { input: "0.00000013", output: "0.00000026" },
}

const expensiveModel: GatewayModel = {
  id: "anthropic/claude-opus-5",
  name: "Claude Opus 5",
  owned_by: "anthropic",
  type: "language",
  context_window: 1_000_000,
  tags: ["tool-use", "reasoning"],
  zdr: "all",
  no_training: "all",
  pricing: { input: "0.000005", output: "0.000025" },
}

const noZdrModel: GatewayModel = {
  id: "spacexai/grok-4.5",
  name: "Grok 4.5",
  owned_by: "xai",
  type: "language",
  context_window: 1_000_000,
  tags: ["tool-use"],
  zdr: "none",
  no_training: "none",
  pricing: { input: "0.000002", output: "0.000006" },
}

const trainsOnPrompts: GatewayModel = {
  id: "bytedance/seed-1.8",
  name: "Bytedance Seed 1.8",
  owned_by: "bytedance",
  type: "language",
  context_window: 256_000,
  tags: ["tool-use", "reasoning"],
  zdr: "some",
  no_training: "none",
  pricing: { input: "0.00000025", output: "0.000002" },
}

const dirtCheapModel: GatewayModel = {
  id: "acme/free-router",
  name: "Free Router",
  owned_by: "acme",
  type: "language",
  context_window: 256_000,
  tags: ["tool-use"],
  zdr: "none",
  no_training: "none",
  pricing: { input: "0.00000005", output: "0.0000001" },
}

const lunaModel: GatewayModel = {
  id: "openai/gpt-5.6-luna",
  name: "GPT 5.6 Luna",
  owned_by: "openai",
  type: "language",
  context_window: 1_050_000,
  tags: ["tool-use", "reasoning"],
  zdr: "some",
  no_training: "all",
  pricing: { input: "0.0000002", output: "0.0000012" },
}

const solModel: GatewayModel = {
  id: "openai/gpt-5.6-sol",
  name: "GPT 5.6 Sol",
  owned_by: "openai",
  type: "language",
  context_window: 1_050_000,
  tags: ["tool-use", "reasoning"],
  zdr: "some",
  no_training: "all",
  pricing: { input: "0.000002", output: "0.00001" },
}

const datedFlash: GatewayModel = {
  id: "deepseek/deepseek-v4-flash-0731",
  name: "DeepSeek V4 Flash 0731",
  owned_by: "deepseek",
  type: "language",
  context_window: 1_000_000,
  tags: ["tool-use", "reasoning"],
  zdr: "some",
  no_training: "some",
  pricing: { input: "0.000000076", output: "0.000000153" },
}

function ranked(
  model: GatewayModel,
  adoption: { requests?: number; tokens?: number; spend?: number }
): RankedModel {
  const result = rankFromCatalog(model, {
    requests: adoption.requests ?? 0,
    tokens: adoption.tokens ?? 0,
    spend: adoption.spend ?? 0,
  })
  if (!result) {
    throw new Error(`expected ${model.id} to rank`)
  }
  return result
}

function run(
  id: string,
  effort: string,
  scoreValue: number,
  costUsd: number
): DeepsecRow {
  return {
    rank: 1,
    name: id,
    effort,
    id,
    score: scoreValue,
    recall: 0,
    precision: 0,
    issues: 0,
    total: 0,
    falsePositives: 0,
    costUsd,
    time: "",
    tokens: "",
    harness: "",
  }
}

describe("gateway-value rank", () => {
  it("blends input heavier than output", () => {
    expect(blendedCost(0.13, 0.26)).toBeCloseTo(0.1625)
    expect(blendedCost(5, 25)).toBe(10)
  })

  it("scores value as token share per blended dollar", () => {
    expect(tokenValueScore(22.5, 0.1625)).toBeCloseTo(138.46, 1)
    expect(tokenValueScore(0, 0.16)).toBeNull()
    expect(tokenValueScore(5, null)).toBeNull()
  })

  it("scores overpay as spend share over token share", () => {
    expect(spendOverpay(16.61, 3.77)).toBeCloseTo(4.41, 2)
    expect(spendOverpay(0, 5)).toBeNull()
  })

  it("matches leaderboard names to catalog ids", () => {
    const index = indexCatalog([capableModel, expensiveModel])
    expect(matchCatalog("DeepSeek V4 Flash", index)?.id).toBe(capableModel.id)
    expect(matchCatalog("deepseek-v4-flash", index)?.id).toBe(capableModel.id)
  })

  it("averages adoption inside the lookback window", () => {
    const rows: LeaderboardRow[] = [
      {
        date: "2026-08-24",
        name: "DeepSeek V4 Flash",
        metric: "tokens",
        share_percent: 99,
      },
      {
        date: "2026-08-30",
        name: "DeepSeek V4 Flash",
        metric: "tokens",
        share_percent: 20,
      },
      {
        date: "2026-08-31",
        name: "DeepSeek V4 Flash",
        metric: "tokens",
        share_percent: 24,
      },
      {
        date: "2026-08-31",
        name: "Other",
        metric: "tokens",
        share_percent: 50,
      },
    ]
    const { from, to, window } = lookbackWindow(
      ["2026-08-24", "2026-08-30", "2026-08-31"],
      2
    )
    expect(from).toBe("2026-08-30")
    expect(to).toBe("2026-08-31")
    const adoption = averageAdoption(rows, window)
    expect(adoption.get("DeepSeek V4 Flash")?.tokens).toBe(22)
  })

  it("counts missing days as zero share", () => {
    const rows: LeaderboardRow[] = [
      {
        date: "2026-08-31",
        name: "Spiky Model",
        metric: "tokens",
        share_percent: 20,
      },
      {
        date: "2026-08-30",
        name: "Steady Model",
        metric: "tokens",
        share_percent: 10,
      },
      {
        date: "2026-08-31",
        name: "Steady Model",
        metric: "tokens",
        share_percent: 10,
      },
    ]
    const window = new Set(["2026-08-30", "2026-08-31"])
    const adoption = averageAdoption(rows, window)
    expect(adoption.get("Spiky Model")?.tokens).toBe(10)
    expect(adoption.get("Steady Model")?.tokens).toBe(10)
  })

  it("limits the window to calendar days, not exported rows", () => {
    const { from, to, window } = lookbackWindow(
      ["2026-08-01", "2026-08-29", "2026-08-31"],
      7
    )
    expect(to).toBe("2026-08-31")
    expect(from).toBe("2026-08-29")
    expect(window.has("2026-08-01")).toBe(false)
    expect(window.size).toBe(2)
  })

  it("picks workhorse, cheap router, and frontier", () => {
    const cheap = ranked(capableModel, { tokens: 22.5, requests: 13 })
    const mid = attachAa(ranked(noZdrModel, { tokens: 6 }), {
      intelligence: 55,
      coding: 72,
      agentic: null,
    })
    const expensive = attachAa(ranked(expensiveModel, { tokens: 3.77, spend: 16.61 }), {
      intelligence: 63,
      coding: 78,
      agentic: null,
    })
    expect(isCapable(cheap)).toBe(true)
    expect(pickDefaultWorkhorse([cheap, mid, expensive])?.id).toBe(noZdrModel.id)
    expect(pickCheapRouter([cheap, mid, expensive])?.id).toBe(capableModel.id)
    expect(pickFrontier([cheap, mid, expensive])?.id).toBe(noZdrModel.id)
  })

  it("keeps unmatched board rows out of capable", () => {
    const unmatched = rankFromBoard("Mystery Model", undefined, {
      requests: 1,
      tokens: 1,
      spend: 1,
    })
    expect(unmatched.unmatched).toBe(true)
    expect(isCapable(unmatched)).toBe(false)
  })

  it("treats catalog all|some as ZDR-eligible", () => {
    expect(hasZdr(ranked(capableModel, {}))).toBe(true)
    expect(hasZdr(ranked(expensiveModel, {}))).toBe(true)
    expect(hasZdr(ranked(noZdrModel, {}))).toBe(false)
  })

  it("marks ZDR + no-training as privacy, but pickers rank any given pool", () => {
    const trains = ranked(trainsOnPrompts, { tokens: 8 })
    expect(hasNoTraining(ranked(capableModel, {}))).toBe(true)
    expect(hasPrivacy(ranked(capableModel, {}))).toBe(true)
    expect(hasZdr(trains)).toBe(true)
    expect(hasNoTraining(trains)).toBe(false)
    expect(hasPrivacy(trains)).toBe(false)
    expect(pickCheapRouter([ranked(capableModel, { tokens: 8 })])?.id).toBe(
      capableModel.id
    )
    expect(pickCheapRouter([trains])).toBeNull()
    expect(pickCheapRouter([trains].filter(hasPrivacy))).toBeNull()
  })

  it("aliases DeepsecBench xai ids onto the catalog", () => {
    const index = indexCatalog([noZdrModel])
    expect(matchModelId("xai/grok-4.5", index)?.id).toBe(noZdrModel.id)
    expect(matchModelId("spacexai/grok-4.5", index)?.id).toBe(noZdrModel.id)
    expect(matchModelId("x-ai/grok-4.5:batch", index)?.id).toBe(noZdrModel.id)
  })

  it("joins punctuation and -preview variants onto catalog ids", () => {
    const dotted: GatewayModel = {
      ...noZdrModel,
      id: "mistral/mistral-medium-3.5",
      name: "Mistral Medium 3.5",
    }
    const preview: GatewayModel = {
      ...capableModel,
      id: "google/gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash Lite",
    }
    const index = indexCatalog([dotted, preview])
    expect(matchModelId("mistral/mistral-medium-3-5", index)?.id).toBe(dotted.id)
    expect(
      matchModelId("google/gemini-3.1-flash-lite-preview", index)?.id
    ).toBe(preview.id)
  })

  it("joins Artificial Analysis free-list rows onto catalog ids", () => {
    const index = indexCatalog([capableModel, noZdrModel])
    expect(
      matchAaRecord(
        {
          slug: "deepseek-v4-flash",
          name: "DeepSeek V4 Flash",
          creator: "DeepSeek",
        },
        index
      )?.id
    ).toBe(capableModel.id)
    expect(
      matchAaRecord(
        { slug: "grok-4.5", name: "Grok 4.5", creator: "xAI" },
        index
      )?.id
    ).toBe(noZdrModel.id)
    expect(
      matchAaRecord(
        { slug: "missing-model", name: "Missing", creator: "Acme" },
        index
      )
    ).toBeUndefined()
  })

  it("treats dated SKUs as the same family", () => {
    expect(modelFamily(capableModel.id)).toBe("deepseek/deepseek-v4-flash")
    expect(modelFamily(datedFlash.id)).toBe("deepseek/deepseek-v4-flash")
    expect(modelFamily("openai/gpt-5.6-sol")).not.toBe(
      modelFamily("openai/gpt-5.6-luna")
    )
  })

  it("picks bang-for-buck from DeepsecBench score per run dollar", () => {
    const cheapRun: DeepsecRow = {
      rank: 18,
      name: "DeepSeek V4 Flash",
      effort: "medium",
      id: capableModel.id,
      score: 15.48,
      recall: 13,
      precision: 66.7,
      issues: 30,
      total: 231,
      falsePositives: 16,
      costUsd: 5.06,
      time: "1h 21m",
      tokens: "1.4M",
      harness: "pi",
    }
    const priceyRun: DeepsecRow = {
      rank: 2,
      name: "Claude Opus 5",
      effort: "max",
      id: expensiveModel.id,
      score: 32.57,
      recall: 28.1,
      precision: 88,
      issues: 65,
      total: 231,
      falsePositives: 10,
      costUsd: 127.93,
      time: "2h 34m",
      tokens: "4.5M",
      harness: "claude",
    }
    const cheap = attachDeepsec(ranked(capableModel, { tokens: 22.5 }), [
      cheapRun,
    ])
    const expensive = attachDeepsec(ranked(expensiveModel, { spend: 16 }), [
      priceyRun,
    ])
    const blocked = attachDeepsec(ranked(noZdrModel, {}), [priceyRun])

    expect(cheap.deepsecValue?.bang).toBeCloseTo(15.48 / 5.06, 2)
    expect(pickBangForBuck([cheap, expensive, blocked])?.id).toBe(
      capableModel.id
    )
    expect(pickFrontier([cheap, expensive])?.id).toBe(capableModel.id)
  })

  it("keeps each DeepsecBench run intact", () => {
    const xhigh = run(capableModel.id, "xhigh", 35.58, 55.98)
    const medium = run(capableModel.id, "medium", 25.1, 17.95)
    const model = attachDeepsec(ranked(capableModel, {}), [xhigh, medium])

    expect(model.deepsecBest?.score).toBeCloseTo(35.58)
    expect(model.deepsecBest?.effort).toBe("xhigh")
    expect(model.deepsecBest?.costUsd).toBeCloseTo(55.98)
    expect(model.deepsecBest?.bang).toBeCloseTo(35.58 / 55.98, 3)
    expect(model.deepsecValue?.effort).toBe("medium")
    expect(model.deepsecValue?.score).toBeCloseTo(25.1)
    expect(model.deepsecValue?.bang).toBeCloseTo(25.1 / 17.95, 3)
    expect(model.deepsecEveryday?.effort).toBe("medium")
  })

  it("prefers the lowest published effort for the everyday run", () => {
    const rows = [
      run(capableModel.id, "xhigh", 30, 10),
      run(capableModel.id, "high", 20, 5),
      run(capableModel.id, "default", 15, 6),
    ]
    expect(everydayDeepsecRun(rows)?.effort).toBe("default")
    expect(everydayDeepsecRun([])).toBeNull()
  })

  it("picks workhorse on everyday quality among adopted mid-price models", () => {
    const volume = attachDeepsec(ranked(capableModel, { tokens: 22 }), [
      run(capableModel.id, "medium", 15.48, 5.06),
    ])
    const quality = attachDeepsec(ranked(noZdrModel, { tokens: 6 }), [
      run(noZdrModel.id, "medium", 20, 8),
    ])
    const underFloor = attachDeepsec(ranked(trainsOnPrompts, { tokens: 1 }), [
      run(trainsOnPrompts.id, "medium", 30, 4),
    ])

    expect(pickDefaultWorkhorse([volume, quality, underFloor])?.id).toBe(
      noZdrModel.id
    )
  })

  it("picks frontier on AA intelligence even when Deepsec is present", () => {
    const withAa = attachAa(ranked(capableModel, { tokens: 4 }), {
      intelligence: 41,
      coding: 38,
      agentic: null,
    })
    const weaker = attachAa(ranked(noZdrModel, { tokens: 3 }), {
      intelligence: 30,
      coding: 44,
      agentic: null,
    })
    const benched = attachDeepsec(ranked(expensiveModel, { tokens: 1 }), [
      run(expensiveModel.id, "medium", 28, 32),
    ])

    expect(pickFrontier([withAa, weaker])?.id).toBe(capableModel.id)
    expect(pickFrontier([withAa, weaker, benched])?.id).toBe(capableModel.id)
  })

  it("picks frontier from the full catalog, not only adopted models", () => {
    const unadopted = attachAa(ranked(solModel, { tokens: 0 }), {
      intelligence: 61,
      coding: 77,
      agentic: null,
    })
    const adopted = attachAa(ranked(noZdrModel, { tokens: 8 }), {
      intelligence: 50,
      coding: 48,
      agentic: null,
    })

    expect(pickFrontier([unadopted, adopted])?.id).toBe(solModel.id)
  })

  it("keeps a $10 frontier out of the usable-price slot", () => {
    const sol = attachAa(ranked(solModel, { tokens: 0, spend: 10 }), {
      intelligence: 60.9,
      coding: 77.4,
      agentic: null,
    })
    const grok = attachAa(ranked(noZdrModel, {}), {
      intelligence: 60.9,
      coding: 76.8,
      agentic: null,
    })
    const opus = attachAa(ranked(expensiveModel, { tokens: 5 }), {
      intelligence: 63.1,
      coding: 78,
      agentic: null,
    })

    expect(pickFrontier([opus, sol, grok])?.id).toBe(solModel.id)
    expect(
      pickRising([opus, sol, grok], { exclude: [sol] })?.id
    ).toBe(noZdrModel.id)
  })

  it("picks workhorse from cheap-band models the cheap router did not take", () => {
    const flash = attachDeepsec(ranked(capableModel, { tokens: 22 }), [
      run(capableModel.id, "medium", 15.48, 5.06),
    ])
    const luna = attachDeepsec(ranked(lunaModel, { tokens: 6 }), [
      run(lunaModel.id, "medium", 12.1, 5.23),
    ])
    const mid = attachDeepsec(ranked(noZdrModel, { tokens: 3 }), [
      run(noZdrModel.id, "medium", 10.5, 8),
    ])
    const spendOnly = attachDeepsec(ranked(solModel, { spend: 10 }), [
      run(solModel.id, "medium", 25.1, 18),
    ])

    expect(pickCheapRouter([flash, luna, mid, spendOnly])?.id).toBe(
      capableModel.id
    )
    expect(pickDefaultWorkhorse([flash, luna, mid, spendOnly])?.id).toBe(
      lunaModel.id
    )
  })

  it("picks rising from adopted models the bench has not caught", () => {
    const benched = attachDeepsec(ranked(capableModel, { tokens: 22 }), [
      run(capableModel.id, "medium", 15.48, 5.06),
    ])
    const newcomer = ranked(trainsOnPrompts, { tokens: 5 })
    const tooExpensive = ranked(expensiveModel, { tokens: 9 })

    expect(pickRising([benched, newcomer, tooExpensive])?.id).toBe(
      trainsOnPrompts.id
    )
    expect(pickRising([benched])).toBeNull()
  })

  it("keeps the cheap-band volume winner out of the workhorse slot", () => {
    const volume = attachDeepsec(ranked(capableModel, { tokens: 22 }), [
      run(capableModel.id, "medium", 15.48, 5.06),
    ])
    const mid = attachDeepsec(ranked(noZdrModel, { tokens: 6 }), [
      run(noZdrModel.id, "medium", 12, 8),
    ])

    expect(pickDefaultWorkhorse([volume, mid])?.id).toBe(noZdrModel.id)
    expect(pickCheapRouter([volume, mid])?.id).toBe(capableModel.id)
  })

  it("falls workhorse back to AA when the mid band has no Deepsec run", () => {
    const stronger = attachAa(ranked(noZdrModel, { tokens: 4 }), {
      intelligence: 57,
      coding: 71,
      agentic: null,
    })
    const weaker = attachAa(ranked(trainsOnPrompts, { tokens: 8 }), {
      intelligence: 45,
      coding: 50,
      agentic: null,
    })

    expect(pickDefaultWorkhorse([stronger, weaker])?.id).toBe(noZdrModel.id)
  })

  it("prefers a quality-floor cheap model over a cheaper unbenchmarked one", () => {
    const bare = ranked(dirtCheapModel, { tokens: 9 })
    const qualified = attachAa(ranked(capableModel, { tokens: 5 }), {
      intelligence: 42,
      coding: 56,
      agentic: null,
    })

    expect(hasQualityFloor(bare)).toBe(false)
    expect(hasQualityFloor(qualified)).toBe(true)
    expect(pickCheapRouter([bare, qualified])?.id).toBe(capableModel.id)
  })

  it("keeps unadopted catalog rows from taking bang-for-buck", () => {
    const ghost = attachDeepsec(ranked(noZdrModel, {}), [
      run(noZdrModel.id, "medium", 20, 2),
    ])
    const adopted = attachDeepsec(ranked(capableModel, { tokens: 8 }), [
      run(capableModel.id, "medium", 15.48, 5.06),
    ])

    expect(ghost.deepsecValue?.bang ?? 0).toBeGreaterThan(
      adopted.deepsecValue?.bang ?? 0
    )
    expect(pickBangForBuck([ghost, adopted])?.id).toBe(capableModel.id)
  })

  it("skips rising siblings of models that already hold a pick", () => {
    const sibling = ranked(datedFlash, { tokens: 10 })
    const other = ranked(trainsOnPrompts, { tokens: 5 })

    expect(pickRising([sibling, other])?.id).toBe(datedFlash.id)
    expect(
      pickRising([sibling, other], { exclude: [capableModel.id] })?.id
    ).toBe(trainsOnPrompts.id)
  })

  it("ranks rising by week-over-week token growth when a prior week exists", () => {
    const steady = ranked(datedFlash, { tokens: 10 })
    const climber = ranked(trainsOnPrompts, { tokens: 6 })

    expect(pickRising([steady, climber])?.id).toBe(datedFlash.id)
    expect(
      pickRising([steady, climber], {
        priorTokens: {
          [datedFlash.id]: 9,
          [trainsOnPrompts.id]: 1,
        },
      })?.id
    ).toBe(trainsOnPrompts.id)
  })

  it("falls frontier back to spend share, not overpay", () => {
    const highOverpay = ranked(capableModel, { tokens: 1, spend: 8 })
    const highSpend = ranked(noZdrModel, { tokens: 10, spend: 12 })

    expect(highOverpay.overpay ?? 0).toBeGreaterThan(highSpend.overpay ?? 0)
    expect(pickFrontier([highOverpay, highSpend])?.id).toBe(noZdrModel.id)
  })

  it("lets the open pool pick a no-ZDR model with better bang", () => {
    const privacy = attachDeepsec(ranked(capableModel, {}), [
      {
        rank: 18,
        name: "DeepSeek V4 Flash",
        effort: "medium",
        id: capableModel.id,
        score: 15.48,
        recall: 13,
        precision: 66.7,
        issues: 30,
        total: 231,
        falsePositives: 16,
        costUsd: 5.06,
        time: "1h 21m",
        tokens: "1.4M",
        harness: "pi",
      },
    ])
    const openWinner = attachDeepsec(ranked(noZdrModel, {}), [
      {
        rank: 4,
        name: "Grok 4.5",
        effort: "high",
        id: noZdrModel.id,
        score: 20,
        recall: 18,
        precision: 80,
        issues: 40,
        total: 231,
        falsePositives: 8,
        costUsd: 2,
        time: "40m",
        tokens: "800K",
        harness: "pi",
      },
    ])

    expect(pickBangForBuck([privacy])?.id).toBe(capableModel.id)
    expect(pickBangForBuck([privacy, openWinner])?.id).toBe(noZdrModel.id)
  })

  it("routes to a cheaper ZDR endpoint without calling it a sale", () => {
    const model = attachEndpoints(
      ranked(capableModel, {}),
      [
        {
          provider: "list",
          hasZdr: true,
          discount: 0,
          inputPerMillion: 0.2,
          outputPerMillion: 0.4,
          blendedPerMillion: 0.25,
        },
        {
          provider: "sale",
          hasZdr: true,
          discount: 0,
          inputPerMillion: 0.1,
          outputPerMillion: 0.2,
          blendedPerMillion: 0.125,
        },
      ],
      true
    )
    expect(model.endpointProvider).toBe("sale")
    expect(model.endpointBlendedPerMillion).toBe(0.125)
    expect(model.discounted).toBe(false)
    expect(model.discountPercent).toBeNull()
  })

  it("badges a sale only from the official list-vs-current promo", () => {
    const routed = attachEndpoints(
      ranked(capableModel, {}),
      [
        {
          provider: "deepinfra",
          hasZdr: true,
          discount: 0,
          inputPerMillion: 0.075,
          outputPerMillion: 0.25,
          blendedPerMillion: 0.11875,
        },
      ],
      true
    )
    const onSale = attachPromo(routed, {
      id: capableModel.id,
      inputPerMillion: 0.07125,
      outputPerMillion: 0.2375,
      listInputPerMillion: 0.15,
      listOutputPerMillion: 0.5,
      discountPercent: 53,
    })
    expect(onSale.discounted).toBe(true)
    expect(onSale.discountPercent).toBe(53)
    expect(onSale.endpointProvider).toBe("deepinfra")
    expect(attachPromo(routed, undefined).discounted).toBe(false)
  })

  it("prices the privacy lane at the ZDR endpoint even above list", () => {
    // capableModel lists at 0.1625 blended; its only ZDR endpoint is pricier.
    const quotes = [
      {
        provider: "zdr-only",
        hasZdr: true,
        discount: 0,
        inputPerMillion: 0.2,
        outputPerMillion: 0.4,
        blendedPerMillion: 0.25,
      },
      {
        provider: "cheap-no-zdr",
        hasZdr: false,
        discount: 0,
        inputPerMillion: 0.05,
        outputPerMillion: 0.1,
        blendedPerMillion: 0.0625,
      },
    ]
    const privacy = attachEndpoints(ranked(capableModel, {}), quotes, true)
    expect(privacy.endpointBlendedPerMillion).toBe(0.25)
    expect(privacy.endpointProvider).toBe("zdr-only")
    expect(privacy.discounted).toBe(false)

    const open = attachEndpoints(ranked(capableModel, {}), quotes, false)
    expect(open.endpointBlendedPerMillion).toBe(0.0625)
    expect(open.endpointProvider).toBe("cheap-no-zdr")
    expect(open.discounted).toBe(false)
  })

  it("keeps list price for the open lane when endpoints cost more", () => {
    const model = attachEndpoints(
      ranked(capableModel, { tokens: 10 }),
      [
        {
          provider: "pricier",
          hasZdr: true,
          discount: 0,
          inputPerMillion: 0.2,
          outputPerMillion: 0.4,
          blendedPerMillion: 0.25,
        },
      ],
      false
    )
    expect(model.endpointBlendedPerMillion).toBeNull()
    expect(model.discounted).toBe(false)
    // valueScore stays priced at the 0.1625 list blend.
    expect(model.valueScore).toBeCloseTo(10 / 0.1625, 4)
  })

  it("treats zero-priced endpoint quotes as unpriced placeholders", () => {
    const model = attachEndpoints(
      ranked(capableModel, { tokens: 10 }),
      [
        {
          provider: "placeholder",
          hasZdr: true,
          discount: 0,
          inputPerMillion: 0,
          outputPerMillion: 0,
          blendedPerMillion: 0,
        },
      ],
      false
    )
    expect(model.endpointBlendedPerMillion).toBeNull()
    expect(model.discounted).toBe(false)
    expect(model.valueScore).toBeCloseTo(10 / 0.1625, 4)
  })

  it("ignores official promos below the discount threshold", () => {
    const model = attachPromo(ranked(capableModel, {}), {
      id: capableModel.id,
      inputPerMillion: 0.16,
      outputPerMillion: 0.32,
      listInputPerMillion: 0.1625,
      listOutputPerMillion: 0.325,
      discountPercent: 1.5,
    })
    expect(model.discountPercent).toBeNull()
    expect(model.discounted).toBe(false)
  })

  it("reads official list-vs-sale promos from the models-page flight", () => {
    const rsc = `
1:"$Sreact.fragment"
2:[{"providerScope":"$undefined","slug":"glm-5.3-flash","copyString":"zai/glm-5.3-flash","inputCost":"0.07125","outputCost":"0.2375","inputListCostTiers":[{"amount":"0.15","minInclusive":0,"priceType":"list"}],"outputListCostTiers":[{"amount":"0.5","minInclusive":0,"priceType":"list"}]},{"providerScope":"$undefined","slug":"gemini-3.7-flash","copyString":"google/gemini-3.7-flash","inputCost":"0.75","outputCost":"3.75","inputListCostTiers":[{"amount":"1.50","minInclusive":0,"priceType":"list"}],"outputListCostTiers":[{"amount":"7.5","minInclusive":0,"priceType":"list"}]},{"providerScope":"$undefined","slug":"llama-3.1-8b","copyString":"meta/llama-3.1-8b","inputCost":"0.02","outputCost":"0.05","inputListCostTiers":"$undefined","outputListCostTiers":"$undefined"},{"providerScope":"$undefined","slug":"gpt-5.6-sol-fast","copyString":"openai/gpt-5.6-sol-fast","inputCost":"4","outputCost":"20","inputListCostTiers":["$116:props:models:13:serviceTierPricing:priority:inputCostTiers:1"],"outputListCostTiers":["$116:props:models:13:serviceTierPricing:priority:outputCostTiers:1"]},{"providerScope":"$undefined","slug":"minimax-m3","copyString":"minimax/minimax-m3","inputCost":"0","outputCost":"0","inputListCostTiers":[{"amount":"0.6","minInclusive":0,"priceType":"list"}],"outputListCostTiers":[{"amount":"2.4","minInclusive":0,"priceType":"list"}]}]
`
    const promos = parseModelsPageFlight(rsc)
    expect(promos.map((promo) => promo.id)).toEqual([
      "zai/glm-5.3-flash",
      "google/gemini-3.7-flash",
    ])
    expect(promos[0]?.discountPercent).toBe(53)
    expect(promos[0]?.inputPerMillion).toBeCloseTo(0.07125)
    expect(promos[0]?.listInputPerMillion).toBeCloseTo(0.15)
    expect(promos[1]?.discountPercent).toBe(50)
  })

  it("picks the cheapest router over a discounted pricier one", () => {
    const cheapest = ranked(capableModel, { tokens: 5 })
    const discountedPricier = {
      ...ranked(trainsOnPrompts, { tokens: 5 }),
      discounted: true,
      discountPercent: 40,
      endpointBlendedPerMillion: 0.41,
    }
    expect(pickCheapRouter([discountedPricier, cheapest])?.id).toBe(
      capableModel.id
    )
  })

  it("parses the DeepsecBench ranked table", () => {
    const html = `
      <tr data-slot="table-row"><th>#</th></tr>
      <tr data-slot="table-row">
        <td>1</td><td>GPT-5.6 Sol</td><td>xhigh</td><td>openai/gpt-5.6-sol</td>
        <td>35.58</td><td>30.7</td><td>%</td><td>96.3</td><td>%</td>
        <td>71</td><td>/</td><td>231</td><td>3</td>
        <td>$55.98</td><td>3h 39m</td><td>2.3M</td><td>codex</td>
      </tr>`
    const rows = parseDeepsecHtml(html)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe("openai/gpt-5.6-sol")
    expect(rows[0]?.score).toBe(35.58)
    expect(rows[0]?.costUsd).toBe(55.98)
  })

  it("parses DeepsecBench results.json", () => {
    const rows = parseDeepsecResults({
      results: [
        {
          rank: 1,
          model: "gpt-5.6-sol",
          reasoning: "xhigh",
          modelId: "openai/gpt-5.6-sol",
          score: 35.579,
          recall: 30.7,
          precision: 96.25,
          issuesFound: 71,
          issuesTotal: 231,
          falsePositives: 3,
          cost: 55.977,
          totalTimeSeconds: 13142.174,
          tokens: "2.3M",
          harness: "codex",
        },
      ],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe("openai/gpt-5.6-sol")
    expect(rows[0]?.effort).toBe("xhigh")
    expect(rows[0]?.score).toBeCloseTo(35.579)
    expect(rows[0]?.costUsd).toBeCloseTo(55.977)
    expect(rows[0]?.time).toBe("3h 39m")
  })

  it("formats Deepsec run duration", () => {
    expect(formatDuration(13142.174)).toBe("3h 39m")
    expect(formatDuration(795.22)).toBe("13m 15s")
    expect(formatDuration(67.116)).toBe("1m 7s")
  })

  it("parses Artificial Analysis indices from OpenRouter payloads", () => {
    const fromModels = parseOpenRouterModels({
      data: [
        {
          id: "openai/gpt-5.6-sol",
          benchmarks: {
            artificial_analysis: {
              intelligence_index: 71.2,
              coding_index: 65.8,
              agentic_index: 58.3,
            },
          },
        },
        { id: "openai/gpt-5.6-luna" },
      ],
    })
    expect(fromModels.get("openai/gpt-5.6-sol")?.intelligence).toBeCloseTo(71.2)
    expect(fromModels.has("openai/gpt-5.6-luna")).toBe(false)

    const fromBenches = parseOpenRouterBenchmarks({
      data: [
        {
          source: "artificial-analysis",
          model_permaslug: "deepseek/deepseek-v4-flash",
          intelligence_index: 40,
          coding_index: 38,
          agentic_index: null,
        },
        {
          source: "design-arena",
          model_permaslug: "openai/gpt-5.6-sol",
          intelligence_index: 99,
        },
      ],
    })
    expect(fromBenches.get("deepseek/deepseek-v4-flash")?.coding).toBe(38)
    expect(fromBenches.has("openai/gpt-5.6-sol")).toBe(false)
  })

  it("parses Artificial Analysis Free API rows", () => {
    const records = parseAaFreeModels({
      data: [
        {
          slug: "deepseek-v4-flash",
          name: "DeepSeek V4 Flash",
          model_creator: { name: "DeepSeek" },
          evaluations: {
            artificial_analysis_intelligence_index: 42.1,
            artificial_analysis_coding_index: 56.2,
            artificial_analysis_agentic_index: 33.7,
          },
        },
        {
          slug: "unscored",
          name: "Unscored",
          evaluations: {
            artificial_analysis_intelligence_index: null,
            artificial_analysis_coding_index: null,
            artificial_analysis_agentic_index: null,
          },
        },
      ],
    })
    expect(records).toHaveLength(1)
    expect(records[0]?.slug).toBe("deepseek-v4-flash")
    expect(records[0]?.creator).toBe("DeepSeek")
    expect(records[0]?.source).toBe("aa")
    expect(records[0]?.indices.intelligence).toBeCloseTo(42.1)
  })
})

describe("gateway-value snapshot", () => {
  it("builds a versioned snapshot the app can render", () => {
    const cheap = attachDeepsec(ranked(capableModel, { tokens: 22.5 }), [
      {
        rank: 18,
        name: "DeepSeek V4 Flash",
        effort: "medium",
        id: capableModel.id,
        score: 15.48,
        recall: 13,
        precision: 66.7,
        issues: 30,
        total: 231,
        falsePositives: 16,
        costUsd: 5.06,
        time: "1h 21m",
        tokens: "1.4M",
        harness: "pi",
      },
    ])
    const lists = buildLists([cheap], [cheap])
    const snapshot = buildSnapshot({
      generatedAt: "2026-08-31T19:00:00.000Z",
      window: { from: "2026-08-24", to: "2026-08-30" },
      languageModels: 200,
      zdrModels: 80,
      privacyModels: 72,
      deepsecRuns: 35,
      aaModels: 0,
      picks: {
        privacy: {
          bangForBuck: cheap,
          workhorse: cheap,
          cheapRouter: cheap,
          frontier: null,
          rising: null,
        },
        open: {
          bangForBuck: cheap,
          workhorse: cheap,
          cheapRouter: cheap,
          frontier: null,
          rising: null,
        },
      },
      lists: {
        privacy: lists,
        open: lists,
      },
      labs: new Map([
        ["deepseek", { requests: 20, tokens: 28, spend: 2 }],
        ["anthropic", { requests: 18, tokens: 32, spend: 64 }],
      ]),
      labBang: {
        privacy: { deepseek: [cheap], anthropic: [] },
        open: { deepseek: [cheap], anthropic: [] },
      },
      unmatched: {
        leaderboard: ["Mystery"],
        deepsec: ["xai/missing (xhigh)"],
        aa: [],
      },
    })

    expect(snapshot.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION)
    expect(snapshot.lists.privacy.aaIntelligence).toEqual([])
    expect(snapshot.lists.privacy.aaCoding).toEqual([])
    expect(snapshot.picks.privacy.bangForBuck?.id).toBe(capableModel.id)
    expect(snapshot.picks.privacy.bangForBuck?.noTraining).toBe("some")
    expect(snapshot.stats.privacyModels).toBe(72)
    expect(snapshot.picks.open.bangForBuck?.href).toContain("deepseek-v4-flash")
    expect(snapshot.picks.privacy.frontier).toBeNull()
    expect(snapshot.analysis).toBeNull()
    expect(snapshot.labs[0]?.name).toBe("anthropic")
    expect(snapshot.labs[1]?.bang.privacy.map((model) => model.id)).toEqual([
      capableModel.id,
    ])
    expect(snapshot.unmatched.leaderboard).toEqual(["Mystery"])
  })

  it("ranks labs by token share", () => {
    const labs = toSnapshotLabs(
      new Map([
        ["zai", { requests: 3, tokens: 6, spend: 5 }],
        ["google", { requests: 25, tokens: 12, spend: 10 }],
      ])
    )
    expect(labs.map((lab) => lab.name)).toEqual(["google", "zai"])
    expect(labs[0]?.bang.privacy).toEqual([])
  })

  it("groups unsliced Deepsec bang lists per lab", () => {
    const flash = attachDeepsec(ranked(capableModel, { tokens: 22 }), [
      run(capableModel.id, "medium", 15.48, 5.06),
    ])
    const opus = attachDeepsec(ranked(expensiveModel, { tokens: 5 }), [
      run(expensiveModel.id, "xhigh", 32.5, 36),
    ])
    const byLab = buildLabBang([flash, opus], [
      "deepseek",
      "anthropic",
      "google",
    ])

    expect(byLab.deepseek?.map((model) => model.id)).toEqual([capableModel.id])
    expect(byLab.anthropic?.map((model) => model.id)).toEqual([
      expensiveModel.id,
    ])
    expect(byLab.google).toEqual([])
  })
})
