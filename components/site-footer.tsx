import { TextLink } from "@/components/text-link"
import type { GatewaySnapshot } from "@/lib/gateway-snapshot"
import { weekPagePath } from "@/lib/gateway-snapshot"

export function SiteFooter({
  attribution,
  week,
}: {
  attribution: GatewaySnapshot["attribution"]
  week?: string
}) {
  return (
    <footer className="flex flex-col gap-2 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-3">
      <p className="text-pretty">
        Independent weekly ranking. Not affiliated with Vercel.{" "}
        {attribution.text}{" "}
        <TextLink external href={attribution.licenseUrl}>
          License
        </TextLink>
        {" · "}
        <TextLink href="/methodology">Methodology</TextLink>
        {" · "}
        <TextLink href="/data/gateway.json">JSON</TextLink>
        {" · "}
        <TextLink href="/data/history.json">History</TextLink>
        {week ? (
          <>
            {" · "}
            <TextLink href={weekPagePath(week)}>This week</TextLink>
          </>
        ) : null}
      </p>
      <p className="font-mono text-[11px]">
        Press{" "}
        <kbd className="rounded-[4px] bg-inset px-1 py-px shadow-hairline">
          d
        </kbd>{" "}
        to toggle dark mode
      </p>
    </footer>
  )
}
