import { describe, expect, it } from "vitest"

import {
  CHEAP_BLEND_USD,
  INPUT_WEIGHT,
  LOOKBACK_DAYS,
  MID_BLEND_USD,
  MIN_AA_QUALITY,
  MIN_CONTEXT,
  MIN_DEEPSEC_SCORE,
  OUTPUT_WEIGHT,
  WORKHORSE_MIN_BLEND_USD,
  WORKHORSE_MIN_TOKEN_SHARE,
} from "../scripts/gateway-value/rank"
import { SNAPSHOT_LIST_LIMIT } from "./gateway-snapshot"
import { RANKING_RULES, STATIC_FAQS } from "./methodology"

describe("methodology", () => {
  it("stays aligned with the ranking script", () => {
    expect(RANKING_RULES.lookbackDays).toBe(LOOKBACK_DAYS)
    expect(RANKING_RULES.inputWeight).toBe(INPUT_WEIGHT)
    expect(RANKING_RULES.outputWeight).toBe(OUTPUT_WEIGHT)
    expect(RANKING_RULES.cheapBlendUsd).toBe(CHEAP_BLEND_USD)
    expect(RANKING_RULES.workhorseMinBlendUsd).toBe(WORKHORSE_MIN_BLEND_USD)
    expect(RANKING_RULES.midBlendUsd).toBe(MID_BLEND_USD)
    expect(RANKING_RULES.minContext).toBe(MIN_CONTEXT)
    expect(RANKING_RULES.minDeepsecScore).toBe(MIN_DEEPSEC_SCORE)
    expect(RANKING_RULES.minAaQuality).toBe(MIN_AA_QUALITY)
    expect(RANKING_RULES.workhorseMinTokenShare).toBe(WORKHORSE_MIN_TOKEN_SHARE)
    expect(RANKING_RULES.listLimit).toBe(SNAPSHOT_LIST_LIMIT)
  })

  it("answers the core ranking questions in plain language", () => {
    expect(STATIC_FAQS.map((faq) => faq.question)).toEqual([
      "What does ZDR + no training mean?",
      "How is bang-for-buck calculated?",
      "Which models count as capable?",
      "What does the AA number mean?",
      "Is this an official Vercel product?",
    ])
  })
})
