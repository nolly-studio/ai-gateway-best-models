import type { ReactNode } from "react"
import Link from "next/link"

export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-8 px-5 py-10">
      {children}
    </main>
  )
}

export function SiteNav() {
  return (
    <nav className="flex items-center gap-3 font-mono text-[11.5px] text-ink-3">
      <Link
        className="transition-colors duration-100 hover:text-ink-2"
        href="/"
      >
        Picks
      </Link>
      <Link
        className="transition-colors duration-100 hover:text-ink-2"
        href="/methodology"
      >
        Methodology
      </Link>
    </nav>
  )
}
