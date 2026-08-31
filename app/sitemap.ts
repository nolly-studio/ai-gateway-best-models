import type { MetadataRoute } from "next"

import { weekPagePath } from "@/lib/gateway-snapshot"
import { readHistory, readSnapshot } from "@/lib/read-snapshot"
import { siteUrl } from "@/lib/site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [snapshot, history] = await Promise.all([
    readSnapshot(),
    readHistory(),
  ])

  const weeks = history.weeks.map((week) => ({
    url: siteUrl(weekPagePath(week.week)),
    lastModified: week.generatedAt,
  }))

  return [
    {
      url: siteUrl("/"),
      lastModified: snapshot.generatedAt,
    },
    {
      url: siteUrl("/methodology"),
      lastModified: snapshot.generatedAt,
    },
    ...weeks,
  ]
}
