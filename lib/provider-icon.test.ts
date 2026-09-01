import { describe, expect, it } from "vitest"

import { resolveProviderSlug, sameLab } from "./providers"

describe("resolveProviderSlug", () => {
  it("maps catalog slugs and aliases", () => {
    expect(resolveProviderSlug("openai")).toBe("openai")
    expect(resolveProviderSlug("moonshotai")).toBe("moonshotai")
    expect(resolveProviderSlug("qwen")).toBe("alibaba")
    expect(resolveProviderSlug("zhipu")).toBe("zai")
    expect(resolveProviderSlug("gemini")).toBe("google")
    expect(resolveProviderSlug("Claude")).toBe("anthropic")
  })

  it("returns null for an unknown lab", () => {
    expect(resolveProviderSlug(null)).toBeNull()
    expect(resolveProviderSlug("unknown-lab")).toBeNull()
  })
})

describe("sameLab", () => {
  it("matches owned_by to the labs leaderboard name", () => {
    expect(sameLab("openai", "openai")).toBe(true)
    expect(sameLab("qwen", "alibaba")).toBe(true)
    expect(sameLab("anthropic", "openai")).toBe(false)
    expect(sameLab(null, "openai")).toBe(false)
  })
})
