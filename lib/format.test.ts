import { describe, expect, it } from "vitest"

import { formatDay, formatWindow, money, pct } from "./format"

describe("format", () => {
  it("formats a same-month window", () => {
    expect(formatWindow("2026-08-25", "2026-08-31")).toBe("Aug 25–31, 2026")
  })

  it("formats a cross-month window", () => {
    expect(formatWindow("2026-07-28", "2026-08-03")).toBe("Jul 28–Aug 3, 2026")
  })

  it("formats money and percents", () => {
    expect(money(0.113)).toBe("$0.113")
    expect(money(11.25)).toBe("$11.25")
    expect(pct(22.271)).toBe("22.3%")
  })
})

describe("formatDay", () => {
  it("formats a date-only UTC day", () => {
    expect(formatDay("2026-08-31")).toBe("Aug 31, 2026")
  })

  it("formats an ISO timestamp in UTC", () => {
    expect(formatDay("2026-08-31T20:58:47.079Z")).toBe("Aug 31, 2026")
  })
})
