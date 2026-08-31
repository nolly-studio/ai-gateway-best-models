import {
  blendedCost,
  perMillion,
  toNumber,
  type DeepsecRow,
  type EndpointQuote,
  type GatewayModel,
  type LeaderboardMetric,
  type LeaderboardRow,
} from "./rank"

const CATALOG_URL = "https://ai-gateway.vercel.sh/v1/models"
const LEADERBOARD_URL =
  "https://vercel.com/api/ai/leaderboard-export?dataset=models&modality=text"
const DEEPSEC_PAGE_URL =
  "https://vercel.com/ai-gateway/leaderboards/deepsecbench"
const ENDPOINTS_CONCURRENCY = 16

const LEADERBOARD_METRICS = new Set<LeaderboardMetric>([
  "requests",
  "tokens",
  "spend",
])

type CatalogResponse = {
  data: GatewayModel[]
}

type LeaderboardExportRow = LeaderboardRow & {
  group?: string
  modality?: string
}

type LeaderboardResponse = {
  rows: LeaderboardExportRow[]
}

type EndpointPricing = {
  prompt?: string
  completion?: string
  discount?: number
}

type EndpointItem = {
  provider_name?: string
  has_zdr?: boolean | null
  pricing?: EndpointPricing
}

type EndpointsResponse = {
  data?: {
    id?: string
    endpoints?: EndpointItem[]
  }
}

async function getJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${label} ${response.status}: ${await response.text()}`)
  }
  return (await response.json()) as T
}

async function getText(url: string, label: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${label} ${response.status}: ${await response.text()}`)
  }
  return response.text()
}

export async function fetchCatalog(): Promise<GatewayModel[]> {
  const body = await getJson<CatalogResponse>(CATALOG_URL, "Catalog")
  return body.data.filter((model) => model.type === "language")
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const body = await getJson<LeaderboardResponse>(
    LEADERBOARD_URL,
    "Leaderboard"
  )
  return body.rows
    .filter((row) => LEADERBOARD_METRICS.has(row.metric))
    .map((row) => ({
      date: row.date,
      name: row.name,
      metric: row.metric,
      share_percent: row.share_percent,
    }))
}

function cellTexts(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/>([^<]+)</g)]
    .map((match) => match[1]?.replace(/\s+/g, " ").trim() ?? "")
    .filter((text) => text.length > 0)
}

function parseMoney(value: string): number | null {
  const parsed = Number(value.replaceAll("$", "").replaceAll(",", ""))
  return Number.isFinite(parsed) ? parsed : null
}

export function parseDeepsecHtml(html: string): DeepsecRow[] {
  const chunks = html.split('data-slot="table-row"')
  const rows: DeepsecRow[] = []

  for (const chunk of chunks.slice(1)) {
    const texts = cellTexts(chunk)
    if (texts.length < 17 || texts[0] === "#") {
      continue
    }

    const rank = Number(texts[0])
    const score = Number(texts[4])
    const recall = Number(texts[5])
    const precision = Number(texts[7])
    const issues = Number(texts[9])
    const total = Number(texts[11])
    const falsePositives = Number(texts[12])
    const costUsd = texts[13] ? parseMoney(texts[13]) : null
    const id = texts[3]

    if (
      !Number.isInteger(rank) ||
      !id?.includes("/") ||
      !Number.isFinite(score) ||
      costUsd == null
    ) {
      continue
    }

    rows.push({
      rank,
      name: texts[1] ?? id,
      effort: texts[2] ?? "",
      id,
      score,
      recall,
      precision,
      issues,
      total,
      falsePositives,
      costUsd,
      time: texts[14] ?? "",
      tokens: texts[15] ?? "",
      harness: texts[16] ?? "",
    })
  }

  return rows
}

export async function fetchDeepsecBench(): Promise<DeepsecRow[]> {
  const html = await getText(DEEPSEC_PAGE_URL, "DeepsecBench")
  const rows = parseDeepsecHtml(html)
  if (rows.length === 0) {
    throw new Error("DeepsecBench table parsed 0 rows")
  }
  return rows
}

function quoteFromEndpoint(endpoint: EndpointItem): EndpointQuote | null {
  const provider = endpoint.provider_name
  if (!provider) {
    return null
  }
  const input = toNumber(endpoint.pricing?.prompt)
  const output = toNumber(endpoint.pricing?.completion)
  const inputPerMillion = input == null ? null : perMillion(input)
  const outputPerMillion = output == null ? null : perMillion(output)
  return {
    provider,
    hasZdr: endpoint.has_zdr === true,
    discount: endpoint.pricing?.discount ?? 0,
    inputPerMillion,
    outputPerMillion,
    blendedPerMillion:
      inputPerMillion == null || outputPerMillion == null
        ? null
        : blendedCost(inputPerMillion, outputPerMillion),
  }
}

export async function fetchModelEndpoints(
  modelId: string
): Promise<EndpointQuote[]> {
  const response = await fetch(
    `https://ai-gateway.vercel.sh/v1/models/${modelId}/endpoints`
  )
  if (!response.ok) {
    return []
  }
  const body = (await response.json()) as EndpointsResponse
  return (body.data?.endpoints ?? [])
    .map(quoteFromEndpoint)
    .filter((quote): quote is EndpointQuote => quote != null)
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      const item = items[index]
      if (item === undefined) {
        return
      }
      results[index] = await fn(item)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  )
  return results
}

export async function fetchEndpointQuotes(
  modelIds: string[]
): Promise<Map<string, EndpointQuote[]>> {
  const unique = [...new Set(modelIds)]
  const quotes = await mapPool(
    unique,
    ENDPOINTS_CONCURRENCY,
    fetchModelEndpoints
  )
  return new Map(unique.map((id, index) => [id, quotes[index] ?? []]))
}
