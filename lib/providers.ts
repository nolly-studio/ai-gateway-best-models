export const PROVIDER_SLUGS = [
  "alibaba",
  "anthropic",
  "deepseek",
  "google",
  "meta",
  "minimax",
  "mistral",
  "moonshotai",
  "nvidia",
  "openai",
  "stepfun",
  "xiaomi",
  "zai",
] as const

export type ProviderSlug = (typeof PROVIDER_SLUGS)[number]

const ALIASES: Record<string, ProviderSlug> = {
  alibaba: "alibaba",
  qwen: "alibaba",
  anthropic: "anthropic",
  claude: "anthropic",
  deepseek: "deepseek",
  google: "google",
  gemini: "google",
  meta: "meta",
  llama: "meta",
  minimax: "minimax",
  mistral: "mistral",
  moonshotai: "moonshotai",
  moonshot: "moonshotai",
  kimi: "moonshotai",
  nvidia: "nvidia",
  openai: "openai",
  stepfun: "stepfun",
  xiaomi: "xiaomi",
  mimo: "xiaomi",
  zai: "zai",
  zhipu: "zai",
  glm: "zai",
}

export function resolveProviderSlug(
  provider: string | null
): ProviderSlug | null {
  if (provider == null || provider.length === 0) {
    return null
  }
  return ALIASES[provider.toLowerCase()] ?? null
}

export function sameLab(provider: string | null, lab: string): boolean {
  if (provider == null || provider.length === 0) {
    return false
  }
  if (provider.toLowerCase() === lab.toLowerCase()) {
    return true
  }
  const providerSlug = resolveProviderSlug(provider)
  const labSlug = resolveProviderSlug(lab)
  return providerSlug != null && providerSlug === labSlug
}
