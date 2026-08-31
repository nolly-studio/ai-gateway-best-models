import { describe, expect, it } from "vitest"

import type { SnapshotModel } from "./gateway-snapshot"
import {
  aaFootnote,
  differingPolicyLabel,
  groupPicks,
  laneHeading,
  ledgerBangMetric,
  ledgerBlendMetric,
  ledgerScoreMetric,
  pickMetrics,
  laneHint,
  lanePicksMatch,
  laneTitle,
  openPickDelta,
  policyLabel,
  routePolicyBadge,
  sameLaneNote,
  weeklyFeaturedPicks,
  weeklyPicksHint,
  weeklyPicksTitle,
  zdrAltRoute,
} from "./picks"

function model(id: string, name: string): SnapshotModel {
  return {
    id,
    name,
    href: `https://vercel.com/ai-gateway/models/${id.split("/").at(-1)}`,
    provider: null,
    tags: [],
    zdr: "some",
    noTraining: "some",
    contextWindow: 128000,
    inputPerMillion: 1,
    outputPerMillion: 1,
    blendedPerMillion: 1,
    zdrBlendedPerMillion: 1,
    zdrProvider: null,
    discounted: false,
    discountPercent: null,
    requestsShare: 0,
    tokensShare: 0,
    spendShare: 0,
    valueScore: null,
    overpay: null,
    deepsecBest: null,
    deepsecValue: null,
    deepsecEveryday: null,
    aa: null,
  }
}

describe("groupPicks", () => {
  it("collapses the same model into one card with stacked roles", () => {
    const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
    const sol = model("openai/gpt-5.6-sol", "GPT 5.6 Sol")
    const grouped = groupPicks({
      bangForBuck: flash,
      workhorse: flash,
      cheapRouter: flash,
      frontier: sol,
      rising: null,
    })

    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.roles.map((role) => role.key)).toEqual([
      "bangForBuck",
      "workhorse",
      "cheapRouter",
    ])
    expect(grouped[1]?.model.id).toBe(sol.id)
  })

  it("labels lanes and policy flags", () => {
    expect(laneTitle("privacy")).toBe("ZDR + no training")
    expect(laneTitle("open")).toBe("Best bang for buck")
    expect(laneHeading("privacy")).toBe(
      "Best ZDR + no-training models this week"
    )
    expect(laneHeading("open")).toBe("If you skip ZDR")
    expect(laneHint("privacy")).toBe(
      "Zero data retention and no training on prompts"
    )
    expect(laneHint("open")).toBe(
      "These beat the ZDR + no-training picks this week"
    )
    expect(sameLaneNote()).toBe(
      "Same winners this week. Nothing that trains or skips ZDR beat the picks above."
    )
    expect(weeklyPicksTitle()).toBe("This week's picks")
    expect(weeklyPicksHint()).toContain("ZDR is the priced route")
    expect(policyLabel({ zdr: "some", noTraining: "all" })).toBe(
      "ZDR + no training"
    )
    expect(policyLabel({ zdr: "some", noTraining: "none" })).toBe(
      "ZDR · trains"
    )
    expect(policyLabel({ zdr: "none", noTraining: "all" })).toBe("No training")
    expect(policyLabel({ zdr: "none", noTraining: "none" })).toBe(
      "No ZDR · trains"
    )
    expect(differingPolicyLabel({ zdr: "some", noTraining: "all" })).toBeNull()
    expect(differingPolicyLabel({ zdr: "none", noTraining: "none" })).toBe(
      "No ZDR · trains"
    )
  })
})

describe("pickMetrics", () => {
  it("keeps Deepsec runs role-specific and AA as a footnote", () => {
    const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
    flash.tokensShare = 22
    flash.deepsecBest = {
      score: 16.54,
      effort: "xhigh",
      costUsd: 5.94,
      bang: 2.78,
    }
    flash.deepsecValue = {
      score: 15.48,
      effort: "medium",
      costUsd: 5.06,
      bang: 3.06,
    }
    flash.deepsecEveryday = flash.deepsecValue
    flash.aa = { intelligence: 40, coding: 38, agentic: 32 }

    const metrics = pickMetrics(flash, [
      { key: "bangForBuck", label: "Bang" },
      { key: "workhorse", label: "Workhorse" },
      { key: "cheapRouter", label: "Cheap" },
    ])
    expect(metrics.map((metric) => [metric.kind, metric.value])).toEqual([
      ["bang", "3.06"],
      ["everyday", "15.5"],
      ["tokens", "22.0%"],
      ["aa", "40.0"],
    ])
    expect(metrics[0]?.hint).toContain("medium")
  })

  it("uses AA intelligence when frontier has no Deepsec run", () => {
    const rising = model("zai/glm-5.3-flash", "GLM 5.3 Flash")
    rising.tokensShare = 5
    rising.aa = { intelligence: 28, coding: 31, agentic: null }
    expect(
      pickMetrics(rising, [{ key: "frontier", label: "Frontier" }]).map(
        (metric) => [metric.kind, metric.value]
      )
    ).toEqual([
      ["missing", "—"],
      ["tokens", "5.0%"],
      ["aa", "28.0"],
    ])
    expect(aaFootnote(rising.aa)).toBe("AA intel 28.0")
  })

  it("marks rising as unbenchmarked", () => {
    const rising = model("deepseek/deepseek-v4-flash-0731", "Flash 0731")
    rising.tokensShare = 6.3
    expect(
      pickMetrics(rising, [{ key: "rising", label: "Rising" }]).map(
        (metric) => [metric.kind, metric.value]
      )
    ).toEqual([
      ["missing", "—"],
      ["tokens", "6.3%"],
    ])
  })
})

describe("weekly featured picks", () => {
  it("shows open winners once, with a route-aware ZDR badge", () => {
    const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
    flash.zdrBlendedPerMillion = 0.1125
    flash.zdrProvider = "deepinfra"
    const cheap = model("deepseek/deepseek-v4-flash-0731", "Flash 0731")
    cheap.zdrBlendedPerMillion = 0.0625
    cheap.zdrProvider = "relace"
    const cheapZdr = model("deepseek/deepseek-v4-flash-0731", "Flash 0731")
    cheapZdr.zdrBlendedPerMillion = 0.1125
    cheapZdr.zdrProvider = "deepinfra"
    const sol = model("openai/gpt-5.6-sol", "GPT 5.6 Sol")
    sol.zdrBlendedPerMillion = null
    sol.zdrProvider = null
    sol.blendedPerMillion = 4
    const solZdr = model("openai/gpt-5.6-sol", "GPT 5.6 Sol")
    solZdr.zdrBlendedPerMillion = 11.25
    solZdr.zdrProvider = "azure"
    const step = model("stepfun/step-3.7-flash", "Step 3.7 Flash")
    step.zdr = "none"
    step.noTraining = "none"
    step.zdrBlendedPerMillion = null
    step.zdrProvider = null

    const featured = weeklyFeaturedPicks({
      privacy: {
        bangForBuck: flash,
        workhorse: flash,
        cheapRouter: flash,
        frontier: solZdr,
        rising: cheapZdr,
      },
      open: {
        bangForBuck: flash,
        workhorse: flash,
        cheapRouter: cheap,
        frontier: sol,
        rising: step,
      },
    })

    expect(featured.map((pick) => pick.model.id)).toEqual([
      flash.id,
      cheap.id,
      sol.id,
      step.id,
    ])
    expect(routePolicyBadge(flash, flash)).toBe("ZDR")
    expect(zdrAltRoute(flash, flash)).toBeNull()
    expect(routePolicyBadge(cheap, cheapZdr)).toBeNull()
    expect(zdrAltRoute(cheap, cheapZdr)).toEqual({
      blend: 0.1125,
      provider: "deepinfra",
    })
    expect(routePolicyBadge(sol, solZdr)).toBeNull()
    expect(zdrAltRoute(sol, solZdr)).toEqual({
      blend: 11.25,
      provider: "azure",
    })
    expect(routePolicyBadge(step, null)).toBe("Trains")
    expect(zdrAltRoute(step, null)).toBeNull()
  })
})

describe("ledger metrics", () => {
  it("pairs blend with the routed provider", () => {
    const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
    flash.zdrBlendedPerMillion = 0.1125
    flash.zdrProvider = "deepinfra"
    expect(ledgerBlendMetric(flash)).toEqual({
      value: "$0.113",
      note: "deepinfra",
    })
  })

  it("pairs Deepsec score and bang with their own effort", () => {
    const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
    flash.deepsecBest = {
      score: 16.54,
      effort: "xhigh",
      costUsd: 5.94,
      bang: 2.78,
    }
    flash.deepsecValue = {
      score: 15.48,
      effort: "medium",
      costUsd: 5.06,
      bang: 3.06,
    }
    flash.aa = { intelligence: 40, coding: 38, agentic: 32 }

    expect(ledgerScoreMetric(flash)).toEqual({
      value: "16.5",
      note: "xhigh",
    })
    expect(ledgerBangMetric(flash)).toEqual({
      value: "3.06",
      note: "medium",
    })
  })

  it("labels AA on unbenchmarked rows instead of inventing a Deepsec score", () => {
    const rising = model("zai/glm-5.3-flash", "GLM 5.3 Flash")
    rising.aa = { intelligence: 28, coding: 31, agentic: null }

    expect(ledgerScoreMetric(rising)).toEqual({ value: "28.0", note: "AA" })
    expect(ledgerBangMetric(rising)).toEqual({ value: "—", note: null })
  })
})

describe("lane pick overlap", () => {
  it("treats matching role winners as the same lane", () => {
    const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
    const sol = model("openai/gpt-5.6-sol", "GPT 5.6 Sol")
    const privacy = {
      bangForBuck: flash,
      workhorse: flash,
      cheapRouter: flash,
      frontier: sol,
      rising: null,
    }

    expect(lanePicksMatch(privacy, privacy)).toBe(true)
    expect(openPickDelta(privacy, privacy)).toEqual([])
  })

  it("keeps only open winners that change the answer", () => {
    const flash = model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash")
    const sol = model("openai/gpt-5.6-sol", "GPT 5.6 Sol")
    const kimi = model("moonshotai/kimi-k2.5", "Kimi K2.5")
    const privacy = {
      bangForBuck: flash,
      workhorse: flash,
      cheapRouter: flash,
      frontier: sol,
      rising: null,
    }
    const open = {
      bangForBuck: kimi,
      workhorse: flash,
      cheapRouter: flash,
      frontier: sol,
      rising: null,
    }

    expect(lanePicksMatch(privacy, open)).toBe(false)
    const delta = openPickDelta(privacy, open)
    expect(delta).toHaveLength(1)
    expect(delta[0]?.model.id).toBe(kimi.id)
    expect(delta[0]?.roles.map((role) => role.key)).toEqual(["bangForBuck"])
  })
})
