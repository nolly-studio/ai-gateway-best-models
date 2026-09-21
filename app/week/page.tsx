import type { Metadata } from "next"

import { SnapshotPage, gatewayTitle } from "@/components/snapshot-page"
import { TextLink } from "@/components/text-link"
import { readHistory, readWeeklySnapshot } from "@/lib/read-snapshot"
import {
  weekIndexDescription,
  weekIndexJsonLd,
  weekIndexTitle,
} from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const snapshot = await readWeeklySnapshot()
  const title = weekIndexTitle()
  const description = weekIndexDescription(snapshot)

  return {
    title,
    description,
    alternates: { canonical: "/week" },
    openGraph: {
      title,
      description,
      url: "/week",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function WeekIndexPage() {
  const [snapshot, history] = await Promise.all([
    readWeeklySnapshot(),
    readHistory(),
  ])

  return (
    <SnapshotPage
      current="week"
      history={history}
      jsonLd={weekIndexJsonLd(snapshot)}
      note={
        <>
          {" "}
          The citable 7-day ranking.{" "}
          <TextLink href="/">See today</TextLink>.
        </>
      }
      showArchives
      snapshot={snapshot}
      title={gatewayTitle("AI Gateway this week")}
    />
  )
}
