export function money(value: number | null): string {
  if (value == null) {
    return "—"
  }
  if (value < 1) {
    return `$${value.toFixed(3)}`
  }
  return `$${value.toFixed(2)}`
}

export function pct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

export function score(value: number | null, digits = 1): string {
  if (value == null) {
    return "—"
  }
  return value.toFixed(digits)
}

export function blendOf(model: {
  zdrBlendedPerMillion: number | null
  blendedPerMillion: number | null
}): number | null {
  return model.zdrBlendedPerMillion ?? model.blendedPerMillion
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function formatWindow(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const startMonth = MONTHS[start.getUTCMonth()]
  const endMonth = MONTHS[end.getUTCMonth()]
  const startDay = start.getUTCDate()
  const endDay = end.getUTCDate()
  const year = end.getUTCFullYear()

  if (startMonth == null || endMonth == null) {
    return `${from} → ${to}`
  }

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${year}`
  }

  return `${startMonth} ${startDay}–${endMonth} ${endDay}, ${year}`
}

export function formatDay(isoDate: string): string {
  const date = isoDate.includes("T")
    ? new Date(isoDate)
    : new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return isoDate
  }
  const month = MONTHS[date.getUTCMonth()]
  if (month == null) {
    return isoDate
  }
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}
