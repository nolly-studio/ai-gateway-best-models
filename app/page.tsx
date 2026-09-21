import type { Metadata } from "next"

import { SnapshotPage, gatewayTitle } from "@/components/snapshot-page"
import { WhatChanged } from "@/components/what-changed"
import { TextLink } from "@/components/text-link"
import { readSnapshot } from "@/lib/read-snapshot"
import { homeDescription, homeJsonLd, homeTitle } from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const snapshot = await readSnapshot()
  const title = homeTitle()
  const description = homeDescription(snapshot)

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: "/",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function Page() {
  const snapshot = await readSnapshot()

  return (
    <SnapshotPage
      current="today"
      jsonLd={homeJsonLd(snapshot)}
      note={
        <>
          {" "}
          <TextLink href="/week">See this week</TextLink>.
        </>
      }
      snapshot={snapshot}
      title={gatewayTitle("Vercel AI Gateway")}
      whatChanged={<WhatChanged snapshot={snapshot} />}
    />
  )
}
