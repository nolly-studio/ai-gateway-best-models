import {
  ogContentType,
  ogSize,
  snapshotOgImage,
} from "@/lib/og-image"
import { readSnapshot } from "@/lib/read-snapshot"

export const alt = "This week's best AI Gateway models on bestmodels.dev"
export const size = ogSize
export const contentType = ogContentType

export default async function Image() {
  const snapshot = await readSnapshot()
  return snapshotOgImage(snapshot)
}
