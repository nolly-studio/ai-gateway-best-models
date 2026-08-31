import { readFile } from "node:fs/promises"
import { join } from "node:path"

import {
  HISTORY_RELATIVE_PATH,
  SNAPSHOT_RELATIVE_PATH,
  emptyHistory,
  weekSnapshotRelativePath,
  type GatewayHistory,
  type GatewaySnapshot,
} from "@/lib/gateway-snapshot"

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

export async function readSnapshot(): Promise<GatewaySnapshot> {
  const raw = await readFile(
    join(process.cwd(), SNAPSHOT_RELATIVE_PATH),
    "utf8"
  )
  return JSON.parse(raw) as GatewaySnapshot
}

export async function readHistory(): Promise<GatewayHistory> {
  try {
    const raw = await readFile(
      join(process.cwd(), HISTORY_RELATIVE_PATH),
      "utf8"
    )
    return JSON.parse(raw) as GatewayHistory
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return emptyHistory()
    }
    throw error
  }
}

export async function readWeekSnapshot(
  week: string
): Promise<GatewaySnapshot | null> {
  try {
    const raw = await readFile(
      join(process.cwd(), weekSnapshotRelativePath(week)),
      "utf8"
    )
    return JSON.parse(raw) as GatewaySnapshot
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return null
    }
    throw error
  }
}
