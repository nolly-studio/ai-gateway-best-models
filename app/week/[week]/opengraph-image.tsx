import {
  ogContentType,
  ogSize,
  snapshotOgImage,
} from "@/lib/og-image"
import { readSnapshot, readWeekSnapshot } from "@/lib/read-snapshot"

export const alt = "Weekly AI Gateway model rankings on bestmodels.dev"
export const size = ogSize
export const contentType = ogContentType

export default async function Image({
  params,
}: {
  params: Promise<{ week: string }>
}) {
  const { week } = await params
  const snapshot = await readWeekSnapshot(week)
  if (snapshot == null) {
    return snapshotOgImage(await readSnapshot())
  }
  return snapshotOgImage(snapshot, `Best models for ${snapshot.window.to}`)
}
