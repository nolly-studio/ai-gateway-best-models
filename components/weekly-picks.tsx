import { PickCards } from "@/components/pick-cards"
import type { GatewaySnapshot, SnapshotCadence } from "@/lib/gateway-snapshot"
import {
  weeklyFeaturedPicks,
  weeklyPicksHint,
  weeklyPicksTitle,
} from "@/lib/picks"

export function WeeklyPicks({
  cadence = "week",
  picks,
}: {
  cadence?: SnapshotCadence
  picks: GatewaySnapshot["picks"]
}) {
  return (
    <PickCards
      cadence={cadence}
      hint={weeklyPicksHint(cadence)}
      picks={weeklyFeaturedPicks(picks)}
      title={weeklyPicksTitle(cadence)}
    />
  )
}
