import type { ReactNode } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

const textLinkClass =
  "underline decoration-transparent underline-offset-2 transition-colors duration-100 hover:text-ink-2 hover:decoration-current"

export function TextLink({
  href,
  children,
  external = false,
  className,
}: {
  href: string
  children: ReactNode
  external?: boolean
  className?: string
}) {
  if (external) {
    return (
      <a
        className={cn(textLinkClass, className)}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    )
  }

  return (
    <Link className={cn(textLinkClass, className)} href={href}>
      {children}
    </Link>
  )
}
