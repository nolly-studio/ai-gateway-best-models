import {
  AA_BENCHMARKS_URL,
  AA_MODELS_URL,
  CATALOG_URL,
  DEEPSEC_RESULTS_URL,
  LABS_LEADERBOARD_URL,
  MODELS_LEADERBOARD_URL,
  MODELS_PAGE_URL,
} from "../../lib/gateway-snapshot"
import {
  blendedCost,
  hasAaIndex,
  MIN_DISCOUNT_PERCENT,
  perMillion,
  toNumber,
  type AaIndices,
  type DeepsecRow,
  type EndpointQuote,
  type GatewayModel,
  type LeaderboardMetric,
  type LeaderboardRow,
  type OfficialPromo,
} from "./rank"

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

export type DeepsecResultItem = {
  rank: number
  model: string
  reasoning: string
  modelId: string
  score: number
  recall: number
  precision: number
  issuesFound: number
  issuesTotal: number
  falsePositives: number
  cost: number
  totalTimeSeconds: number
  tokens: string
  harness: string
}

type DeepsecResultsResponse = {
  results?: DeepsecResultItem[]
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

const FLIGHT_UNDEFINED = "$undefined"
const FLIGHT_OBJECT_PREFIX = '{"providerScope":'

function flightNumber(value: unknown): number | null {
  if (value == null || value === FLIGHT_UNDEFINED) {
    return null
  }
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function firstListAmount(tiers: unknown): number | null {
  if (!Array.isArray(tiers)) {
    return null
  }
  const objects = tiers.filter(
    (tier): tier is Record<string, unknown> =>
      tier != null && typeof tier === "object" && !Array.isArray(tier)
  )
  if (objects.length === 0) {
    return null
  }
  const zero = objects.filter((tier) => (tier.minInclusive ?? 0) === 0)
  const pool = zero.length > 0 ? zero : objects
  const listed = pool.filter((tier) => tier.priceType === "list")
  const picked = listed[0] ?? pool[0]
  return flightNumber(picked?.amount)
}

function readJsonObject(
  text: string,
  start: number
): { value: unknown; end: number } | null {
  if (text[start] !== "{") {
    return null
  }
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
    } else if (char === "{") {
      depth += 1
    } else if (char === "}") {
      depth -= 1
      if (depth === 0) {
        try {
          return {
            value: JSON.parse(text.slice(start, index + 1)),
            end: index + 1,
          }
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function promoFromFlight(raw: unknown): OfficialPromo | null {
  if (raw == null || typeof raw !== "object") {
    return null
  }
  const model = raw as {
    copyString?: unknown
    inputCost?: unknown
    outputCost?: unknown
    inputListCostTiers?: unknown
    outputListCostTiers?: unknown
  }
  const id = typeof model.copyString === "string" ? model.copyString : null
  if (id == null || !id.includes("/")) {
    return null
  }

  const currentIn = flightNumber(model.inputCost)
  const currentOut = flightNumber(model.outputCost)
  const listIn = firstListAmount(model.inputListCostTiers)
  const listOut = firstListAmount(model.outputListCostTiers)
  if (
    currentIn == null ||
    currentOut == null ||
    currentIn <= 0 ||
    currentOut <= 0 ||
    listIn == null ||
    listOut == null ||
    listIn <= 0 ||
    listOut <= 0 ||
    currentIn >= listIn
  ) {
    return null
  }

  const discountPercent = Math.round((1 - currentIn / listIn) * 100)
  if (discountPercent < MIN_DISCOUNT_PERCENT) {
    return null
  }
  return {
    id,
    inputPerMillion: currentIn,
    outputPerMillion: currentOut,
    listInputPerMillion: listIn,
    listOutputPerMillion: listOut,
    discountPercent,
  }
}

/**
 * Official list-vs-sale promos from the AI Gateway models page RSC flight.
 * Skips flight-ref tiers, zero current prices, and models with no list tiers.
 */
export function parseModelsPageFlight(rsc: string): OfficialPromo[] {
  const promos: OfficialPromo[] = []
  const seen = new Set<string>()
  let from = 0
  while (from < rsc.length) {
    const start = rsc.indexOf(FLIGHT_OBJECT_PREFIX, from)
    if (start < 0) {
      break
    }
    const parsed = readJsonObject(rsc, start)
    if (parsed == null) {
      from = start + 1
      continue
    }
    const promo = promoFromFlight(parsed.value)
    if (promo != null && !seen.has(promo.id)) {
      seen.add(promo.id)
      promos.push(promo)
    }
    from = parsed.end
  }
  return promos
}

export async function fetchOfficialPromos(): Promise<Map<string, OfficialPromo>> {
  const response = await fetch(MODELS_PAGE_URL, {
    headers: {
      RSC: "1",
      Accept: "text/x-component",
      "User-Agent": "bestmodels.dev/1.0",
    },
  })
  if (!response.ok) {
    throw new Error(
      `Models page ${response.status}: ${await response.text()}`
    )
  }
  const promos = parseModelsPageFlight(await response.text())
  if (promos.length === 0) {
    console.warn("Models page parsed 0 official promos; On sale will be empty")
  }
  return new Map(promos.map((promo) => [promo.id, promo]))
}

function mapLeaderboardRows(rows: LeaderboardExportRow[]): LeaderboardRow[] {
  return rows
    .filter((row) => LEADERBOARD_METRICS.has(row.metric))
    .map((row) => ({
      date: row.date,
      name: row.name,
      metric: row.metric,
      share_percent: row.share_percent,
    }))
}

export async function fetchCatalog(): Promise<GatewayModel[]> {
  const body = await getJson<CatalogResponse>(CATALOG_URL, "Catalog")
  return body.data.filter((model) => model.type === "language")
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const body = await getJson<LeaderboardResponse>(
    MODELS_LEADERBOARD_URL,
    "Models leaderboard"
  )
  return mapLeaderboardRows(body.rows)
}

export async function fetchLabsLeaderboard(): Promise<LeaderboardRow[]> {
  const body = await getJson<LeaderboardResponse>(
    LABS_LEADERBOARD_URL,
    "Labs leaderboard"
  )
  return mapLeaderboardRows(body.rows)
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return ""
  }
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function parseDeepsecResults(
  body: DeepsecResultsResponse
): DeepsecRow[] {
  const rows: DeepsecRow[] = []
  for (const item of body.results ?? []) {
    if (
      !item.modelId?.includes("/") ||
      !Number.isFinite(item.score) ||
      !Number.isFinite(item.cost)
    ) {
      continue
    }
    rows.push({
      rank: item.rank,
      name: item.model,
      effort: item.reasoning,
      id: item.modelId,
      score: item.score,
      recall: item.recall,
      precision: item.precision,
      issues: item.issuesFound,
      total: item.issuesTotal,
      falsePositives: item.falsePositives,
      costUsd: item.cost,
      time: formatDuration(item.totalTimeSeconds),
      tokens: item.tokens,
      harness: item.harness,
    })
  }
  return rows
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
  try {
    const body = await getJson<DeepsecResultsResponse>(
      DEEPSEC_RESULTS_URL,
      "DeepsecBench results"
    )
    const rows = parseDeepsecResults(body)
    if (rows.length > 0) {
      return rows
    }
  } catch {
    // Fall through to the HTML table if the JSON export is down.
  }

  const html = await getText(DEEPSEC_PAGE_URL, "DeepsecBench")
  const rows = parseDeepsecHtml(html)
  if (rows.length === 0) {
    throw new Error("DeepsecBench parsed 0 rows")
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

type OpenRouterAaBlock = {
  intelligence_index?: number | null
  coding_index?: number | null
  agentic_index?: number | null
}

type OpenRouterModelItem = {
  id?: string
  canonical_slug?: string
  benchmarks?: {
    artificial_analysis?: OpenRouterAaBlock | null
  }
}

type OpenRouterModelsResponse = {
  data?: OpenRouterModelItem[]
}

type OpenRouterBenchmarkItem = {
  source?: string
  model_permaslug?: string
  intelligence_index?: number | null
  coding_index?: number | null
  agentic_index?: number | null
}

type OpenRouterBenchmarksResponse = {
  data?: OpenRouterBenchmarkItem[]
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function indicesFromAaBlock(block: OpenRouterAaBlock | null | undefined): AaIndices {
  return {
    intelligence: finiteOrNull(block?.intelligence_index),
    coding: finiteOrNull(block?.coding_index),
    agentic: finiteOrNull(block?.agentic_index),
  }
}

function setAa(
  byId: Map<string, AaIndices>,
  id: string | undefined,
  indices: AaIndices
) {
  if (id == null || id === "" || !hasAaIndex(indices)) {
    return
  }
  byId.set(id, indices)
}

export function parseOpenRouterModels(
  body: OpenRouterModelsResponse
): Map<string, AaIndices> {
  const byId = new Map<string, AaIndices>()
  for (const item of body.data ?? []) {
    setAa(
      byId,
      item.id ?? item.canonical_slug,
      indicesFromAaBlock(item.benchmarks?.artificial_analysis)
    )
  }
  return byId
}

export function parseOpenRouterBenchmarks(
  body: OpenRouterBenchmarksResponse
): Map<string, AaIndices> {
  const byId = new Map<string, AaIndices>()
  for (const item of body.data ?? []) {
    if (item.source != null && item.source !== "artificial-analysis") {
      continue
    }
    setAa(byId, item.model_permaslug, indicesFromAaBlock(item))
  }
  return byId
}

async function fetchAaFromModels(): Promise<Map<string, AaIndices>> {
  try {
    const body = await getJson<OpenRouterModelsResponse>(
      AA_MODELS_URL,
      "OpenRouter models"
    )
    return parseOpenRouterModels(body)
  } catch {
    return new Map()
  }
}

async function fetchAaFromBenchmarks(): Promise<Map<string, AaIndices>> {
  const key = process.env.OPENROUTER_API_KEY
  if (key == null || key === "") {
    return new Map()
  }
  try {
    const response = await fetch(AA_BENCHMARKS_URL, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!response.ok) {
      return new Map()
    }
    return parseOpenRouterBenchmarks(
      (await response.json()) as OpenRouterBenchmarksResponse
    )
  } catch {
    return new Map()
  }
}

/**
 * Artificial Analysis headline indices via OpenRouter.
 * The public models list is tried first (no key). The benches endpoint
 * needs OPENROUTER_API_KEY and fills gaps. Failures are empty, not fatal.
 */
export async function fetchAaIndices(): Promise<Map<string, AaIndices>> {
  const fromModels = await fetchAaFromModels()
  if (fromModels.size > 0) {
    return fromModels
  }
  return fetchAaFromBenchmarks()
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
