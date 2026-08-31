import { describe, expect, it } from "vitest"

import { SNAPSHOT_SCHEMA_VERSION } from "../../lib/gateway-snapshot"
import { formatDuration, parseDeepsecHtml, parseDeepsecResults } from "./fetch"
import {
  attachDeepsec,
  attachEndpoints,
  averageAdoption,
  blendedCost,
  hasNoTraining,
  hasPrivacy,
  hasZdr,
  indexCatalog,
  isCapable,
  lookbackWindow,
  matchCatalog,
  matchModelId,
  pickBangForBuck,
  pickCheapRouter,
  pickDefaultWorkhorse,
  pickFrontier,
  rankFromBoard,
  rankFromCatalog,
  spendOverpay,
  tokenValueScore,
  type DeepsecRow,
  type GatewayModel,
  type LeaderboardRow,
  type RankedModel,
} from "./rank"
import { buildLists, buildSnapshot, toSnapshotLabs } from "./snapshot"

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

  it("picks workhorse, cheap router, and frontier", () => {
    const cheap = ranked(capableModel, { tokens: 22.5, requests: 13 })
    const frontier = ranked(expensiveModel, { tokens: 3.77, spend: 16.61 })
    expect(isCapable(cheap)).toBe(true)
    expect(pickDefaultWorkhorse([cheap, frontier])?.id).toBe(capableModel.id)
    expect(pickCheapRouter([cheap, frontier])?.id).toBe(capableModel.id)
    expect(pickFrontier([cheap, frontier])?.id).toBe(expensiveModel.id)
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
    expect(pickCheapRouter([trains])?.id).toBe(trainsOnPrompts.id)
    expect(pickCheapRouter([trains].filter(hasPrivacy))).toBeNull()
  })

  it("aliases DeepsecBench xai ids onto the catalog", () => {
    const index = indexCatalog([noZdrModel])
    expect(matchModelId("xai/grok-4.5", index)?.id).toBe(noZdrModel.id)
    expect(matchModelId("spacexai/grok-4.5", index)?.id).toBe(noZdrModel.id)
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

    expect(cheap.deepsecBang).toBeCloseTo(15.48 / 5.06, 2)
    expect(pickBangForBuck([cheap, expensive, blocked])?.id).toBe(
      capableModel.id
    )
    expect(pickFrontier([cheap, expensive])?.id).toBe(expensiveModel.id)
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

  it("flags a cheaper ZDR endpoint as a discount", () => {
    const model = attachEndpoints(ranked(capableModel, {}), [
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
    ])
    expect(model.discounted).toBe(true)
    expect(model.zdrProvider).toBe("sale")
    expect(model.discountPercent).toBeGreaterThan(20)
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
      picks: {
        privacy: {
          bangForBuck: cheap,
          workhorse: cheap,
          cheapRouter: cheap,
          frontier: null,
        },
        open: {
          bangForBuck: cheap,
          workhorse: cheap,
          cheapRouter: cheap,
          frontier: null,
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
      unmatched: { leaderboard: ["Mystery"], deepsec: ["xai/missing (xhigh)"] },
    })

    expect(snapshot.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION)
    expect(snapshot.picks.privacy.bangForBuck?.id).toBe(capableModel.id)
    expect(snapshot.picks.privacy.bangForBuck?.noTraining).toBe("some")
    expect(snapshot.stats.privacyModels).toBe(72)
    expect(snapshot.picks.open.bangForBuck?.href).toContain("deepseek-v4-flash")
    expect(snapshot.picks.privacy.frontier).toBeNull()
    expect(snapshot.analysis).toBeNull()
    expect(snapshot.labs[0]?.name).toBe("anthropic")
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
  })
})
