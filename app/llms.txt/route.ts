import { formatWindow } from "@/lib/format"
import { weekPagePath } from "@/lib/gateway-snapshot"
import { readSnapshot, readWeeklySnapshot } from "@/lib/read-snapshot"
import { featuredFrontierPick, featuredValuePick } from "@/lib/seo"
import { siteUrl } from "@/lib/site"

function pickLines(snapshot: Awaited<ReturnType<typeof readSnapshot>>) {
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)
  const open = snapshot.picks.open
  return [
    value ? `- Bang: ${value.name} (${value.id})` : null,
    open.workhorse
      ? `- Workhorse: ${open.workhorse.name} (${open.workhorse.id})`
      : null,
    open.cheapRouter
      ? `- Cheap: ${open.cheapRouter.name} (${open.cheapRouter.id})`
      : null,
    frontier ? `- Frontier: ${frontier.name} (${frontier.id})` : null,
    open.rising
      ? `- Rising: ${open.rising.name} (${open.rising.id})`
      : null,
  ]
    .filter((line): line is string => line != null)
    .join("\n")
}

export async function GET() {
  const [daily, weekly] = await Promise.all([
    readSnapshot(),
    readWeeklySnapshot(),
  ])
  const dayWindow = formatWindow(daily.window.from, daily.window.to)
  const weekWindow = formatWindow(weekly.window.from, weekly.window.to)
  const weekPath = weekPagePath(weekly.window.to)

  const body = `# bestmodels.dev

Daily and weekly ranked picks for Vercel AI Gateway models. Independent. Not affiliated with Vercel.

Today (as of ${dayWindow}):
${pickLines(daily)}

This week (${weekWindow}):
${pickLines(weekly)}

## Pages

- [Today's picks](${siteUrl("/")}): Current daily picks on AI Gateway
- [This week's picks](${siteUrl("/week")}): Citable 7-day ranking
- [Methodology](${siteUrl("/methodology")}): How value, bang, ZDR, and capable-model filters work
- [This week archive](${siteUrl(weekPath)}): Snapshot for ${weekWindow}

## Machine-readable data

- [Today's snapshot](${siteUrl("/data/gateway.json")}): Daily ranked picks (tokensShare is one complete day)
- [This week's snapshot](${siteUrl("/data/weekly.json")}): 7-day ranked picks, lists, and lab shares
- [History](${siteUrl("/data/history.json")}): Week-by-week pick IDs
- [Week file](${siteUrl(`/data/weeks/${weekly.window.to}.json`)}): Archived snapshot for ${weekly.window.to}

## Sources

- Catalog: ${daily.sources.catalog}
- DeepsecBench: ${daily.sources.deepsec}
- Artificial Analysis: ${daily.sources.aa}
- ${daily.attribution.text}
- License: ${daily.attribution.licenseUrl}
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
