import { PickCards } from "@/components/pick-cards"
import type { GatewaySnapshot } from "@/lib/gateway-snapshot"
import {
  weeklyFeaturedPicks,
  weeklyPicksHint,
  weeklyPicksTitle,
} from "@/lib/picks"

export function WeeklyPicks({ picks }: { picks: GatewaySnapshot["picks"] }) {
  return (
    <PickCards
      hint={weeklyPicksHint()}
      picks={weeklyFeaturedPicks(picks)}
      title={weeklyPicksTitle()}
    />
  )
}
