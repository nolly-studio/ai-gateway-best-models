import { cn } from "@/lib/utils"

export function Meter({
  signal,
  className,
}: {
  signal: number
  className?: string
}) {
  return (
    <span className={cn("flex items-end gap-0.5", className)} aria-hidden>
      {[0, 1, 2].map((bar) => (
        <span
          className={cn(
            "w-1 rounded-full",
            bar < signal ? "h-2.5 bg-ink" : "h-1.5 bg-line-strong"
          )}
          key={bar}
        />
      ))}
    </span>
  )
}
