"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const RESET_MS = 1600
const ICON_EASE = "cubic-bezier(0.2, 0, 0, 1)"

export type CopyStatus = "idle" | "copied" | "failed"

export function useCopyText() {
  const [status, setStatus] = useState<CopyStatus>("idle")
  const timerRef = useRef<ReturnType<typeof setTimeout> | 0>(0)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const copy = useCallback(async (text: string) => {
    const ok = await writeClipboard(text)
    setStatus(ok ? "copied" : "failed")
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setStatus("idle"), RESET_MS)
    return ok
  }, [])

  return {
    copied: status === "copied",
    failed: status === "failed",
    status,
    copy,
  }
}

async function writeClipboard(text: string): Promise<boolean> {
  if (copyWithExecCommand(text)) {
    return true
  }

  if (!navigator.clipboard?.writeText) {
    return false
  }

  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("clipboard-timeout")), 400)
      }),
    ])
    return true
  } catch {
    return false
  }
}

function copyWithExecCommand(text: string): boolean {
  const onCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData("text/plain", text)
    event.preventDefault()
  }

  document.addEventListener("copy", onCopy)
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    document.removeEventListener("copy", onCopy)
  }
}

function CopyGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
    >
      <rect height="13" rx="2" width="13" x="8" y="8" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

function StatusIcon({
  copied,
  className,
}: {
  copied: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex size-3 shrink-0", className)}
    >
      <span
        className={cn(
          "absolute inset-0 transition-[opacity,transform,filter] duration-200",
          copied
            ? "scale-[0.25] opacity-0 blur-[4px]"
            : "blur-0 scale-100 opacity-100"
        )}
        style={{ transitionTimingFunction: ICON_EASE }}
      >
        <CopyGlyph />
      </span>
      <span
        className={cn(
          "absolute inset-0 text-green transition-[opacity,transform,filter] duration-200",
          copied
            ? "blur-0 scale-100 opacity-100"
            : "scale-[0.25] opacity-0 blur-[4px]"
        )}
        style={{ transitionTimingFunction: ICON_EASE }}
      >
        <CheckGlyph />
      </span>
    </span>
  )
}

type CopyVariant = "chip" | "inline" | "button"

export function CopyModelId({
  id,
  variant = "chip",
  status: statusProp,
  onCopy,
  className,
}: {
  id: string
  variant?: CopyVariant
  status?: CopyStatus
  onCopy?: () => void | Promise<void | boolean>
  className?: string
}) {
  const internal = useCopyText()
  const status = statusProp ?? internal.status
  const copied = status === "copied"
  const failed = status === "failed"

  async function handleClick() {
    if (onCopy) {
      await onCopy()
      return
    }
    await internal.copy(id)
  }

  const label = failed
    ? `Couldn't copy ${id}`
    : copied
      ? `Copied ${id}`
      : `Copy ${id}`

  switch (variant) {
    case "chip":
      return (
        <button
          aria-label={label}
          className={cn(
            "relative inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[12px] text-ink transition-[background-color,color,transform] duration-150 ease-out before:absolute before:-inset-x-0.5 before:-inset-y-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.96]",
            copied
              ? "bg-green-tint"
              : failed
                ? "bg-field text-destructive"
                : "bg-field hover:bg-hover",
            className
          )}
          data-state={status}
          onClick={handleClick}
          title={label}
          type="button"
        >
          <span className="min-w-0 text-left break-all">{id}</span>
          <StatusIcon copied={copied} />
          <StatusLive failed={failed} copied={copied} id={id} />
        </button>
      )
    case "inline":
      return (
        <button
          aria-label={label}
          className={cn(
            "relative inline-flex max-w-full min-w-0 items-center gap-1 rounded-sm font-mono text-[11px] transition-[color,transform] duration-150 ease-out before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.96]",
            copied
              ? "text-ink"
              : failed
                ? "text-destructive"
                : "text-ink-3 hover:text-ink",
            className
          )}
          data-state={status}
          onClick={handleClick}
          title={label}
          type="button"
        >
          <span className="min-w-0 truncate">{id}</span>
          <StatusIcon copied={copied} />
          <StatusLive failed={failed} copied={copied} id={id} />
        </button>
      )
    case "button":
      return (
        <button
          aria-label={label}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-control bg-surface px-2.5 text-[12.5px] font-medium shadow-btn transition-[background-color,color,transform] duration-100 hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.96]",
            failed ? "text-destructive" : "text-ink",
            className
          )}
          data-state={status}
          onClick={handleClick}
          type="button"
        >
          <StatusIcon copied={copied} />
          {failed ? "Retry" : copied ? "Copied" : "Copy"}
          <StatusLive failed={failed} copied={copied} id={id} />
        </button>
      )
    default: {
      const _exhaustive: never = variant
      return _exhaustive
    }
  }
}

function StatusLive({
  copied,
  failed,
  id,
}: {
  copied: boolean
  failed: boolean
  id: string
}) {
  return (
    <span aria-live="polite" className="sr-only">
      {failed ? `Couldn't copy ${id}` : copied ? `Copied ${id}` : ""}
    </span>
  )
}
