import { describe, expect, it } from "vitest"

import type { SnapshotModel } from "./gateway-snapshot"
import { groupPicks, laneHeading, laneTitle, policyLabel } from "./picks"

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
    deepsecScore: null,
    deepsecEffort: null,
    deepsecCost: null,
    deepsecBang: null,
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
    expect(laneHeading("open")).toBe(
      "Best bang-for-buck models (including models that train)"
    )
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
  })
})
