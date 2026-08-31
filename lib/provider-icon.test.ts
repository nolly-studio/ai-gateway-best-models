import { describe, expect, it } from "vitest"

import { resolveProviderSlug } from "./providers"

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
