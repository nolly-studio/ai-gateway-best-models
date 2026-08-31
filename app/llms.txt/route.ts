import { formatWindow } from "@/lib/format"
import { weekPagePath } from "@/lib/gateway-snapshot"
import { readSnapshot } from "@/lib/read-snapshot"
import { featuredFrontierPick, featuredValuePick } from "@/lib/seo"
import { siteUrl } from "@/lib/site"

export async function GET() {
  const snapshot = await readSnapshot()
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)
  const weekPath = weekPagePath(snapshot.window.to)
  const picks = [
    value ? `- ZDR + no-training value: ${value.name} (${value.id})` : null,
    frontier ? `- Frontier: ${frontier.name} (${frontier.id})` : null,
  ]
    .filter((line): line is string => line != null)
    .join("\n")

  const body = `# bestmodels.dev

Weekly ranked picks for Vercel AI Gateway models. Independent. Not affiliated with Vercel.

This week (${window}):
${picks}

## Pages

- [This week's picks](${siteUrl("/")}): Current ZDR + no-training and bang-for-buck defaults
- [Methodology](${siteUrl("/methodology")}): How value, bang, ZDR, and capable-model filters work
- [This week archive](${siteUrl(weekPath)}): Snapshot for ${window}

## Machine-readable data

- [This week's snapshot](${siteUrl("/data/gateway.json")}): Full ranked picks, lists, and lab shares
- [History](${siteUrl("/data/history.json")}): Week-by-week pick IDs
- [Week file](${siteUrl(`/data/weeks/${snapshot.window.to}.json`)}): Archived snapshot for ${snapshot.window.to}

## Sources

- Catalog: ${snapshot.sources.catalog}
- DeepsecBench: ${snapshot.sources.deepsec}
- ${snapshot.attribution.text}
- License: ${snapshot.attribution.licenseUrl}
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
