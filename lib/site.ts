export const SITE_ORIGIN = "https://www.bestmodels.dev"
export const SITE_HOST = "www.bestmodels.dev"
export const SITE_NAME = "bestmodels.dev"
export const PUBLISHER_NAME = "Nolly Studio"
export const GITHUB_REPO_URL =
  "https://github.com/nolly-studio/ai-gateway-best-models"

export const SITE_TITLE = "Best AI Gateway models this week (ZDR + value)"
export const SITE_TITLE_TEMPLATE = `%s · ${SITE_NAME}`
export const SITE_DESCRIPTION =
  "Weekly picks for the best Vercel AI Gateway models: ZDR + no-training defaults, and unrestricted bang-for-buck from live catalog, adoption, and DeepsecBench."

export function siteUrl(path = "/"): string {
  if (path === "/") {
    return SITE_ORIGIN
  }
  const pathname = path.startsWith("/") ? path : `/${path}`
  return `${SITE_ORIGIN}${pathname}`
}
