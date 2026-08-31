export const SITE_ORIGIN = "https://www.bestmodels.dev"
export const SITE_HOST = "www.bestmodels.dev"
export const SITE_NAME = "bestmodels.dev"
export const PUBLISHER_NAME = "Nolly Studio"
export const GITHUB_REPO_URL =
  "https://github.com/nolly-studio/ai-gateway-best-models"

export const SITE_TITLE = "Best AI Gateway models this week"
export const SITE_TITLE_TEMPLATE = `%s · ${SITE_NAME}`
export const SITE_DESCRIPTION =
  "Weekly picks for the best Vercel AI Gateway models, ranked from the live catalog, 7-day adoption, and DeepsecBench. ZDR is a route badge, not a separate list."

export function siteUrl(path = "/"): string {
  if (path === "/") {
    return SITE_ORIGIN
  }
  const pathname = path.startsWith("/") ? path : `/${path}`
  return `${SITE_ORIGIN}${pathname}`
}
