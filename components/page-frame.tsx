import type { ReactNode } from "react";
import Link from "next/link";

export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col gap-8 px-5 py-10">
      {children}
    </main>
  );
}

const navLinkClass =
  "relative inline-flex items-center text-sm text-ink-3 transition-colors duration-150 select-none after:absolute after:-inset-x-1.5 after:-inset-y-3 after:content-[''] hover:text-ink aria-[current=page]:text-ink";

export function SiteNav({ current }: { current: "picks" | "methodology" }) {
  return (
    <nav aria-label="Site" className="flex items-center gap-4">
      <Link
        aria-current={current === "picks" ? "page" : undefined}
        className={navLinkClass}
        href="/"
      >
        Picks
      </Link>
      <Link
        aria-current={current === "methodology" ? "page" : undefined}
        className={navLinkClass}
        href="/methodology"
      >
        Methodology
      </Link>
    </nav>
  );
}

export function PageHeader({
  children,
  current,
  meta,
  title,
}: {
  children: ReactNode;
  current: "picks" | "methodology";
  meta: ReactNode;
  title: string;
}) {
  return (
    <header className="flex flex-col">
      <SiteNav current={current} />
      <p className="mt-8 font-mono text-xs leading-relaxed text-pretty text-ink-2 tabular-nums">
        {meta}
      </p>
      <h1 className="mt-3 text-2xl leading-[1.1] font-semibold tracking-tight text-balance text-ink">
        {title}
      </h1>
      <div className="mt-4 flex max-w-[65ch] flex-col gap-2 text-base leading-[1.6] text-pretty text-ink-2">
        {children}
      </div>
    </header>
  );
}
