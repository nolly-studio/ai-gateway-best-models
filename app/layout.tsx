import type { ReactNode } from "react"
import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import {
  GeistPixelCircle,
  GeistPixelGrid,
  GeistPixelLine,
  GeistPixelSquare,
  GeistPixelTriangle,
} from "geist/font/pixel"
import { GeistSans } from "geist/font/sans"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TITLE,
  SITE_TITLE_TEMPLATE,
} from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_TITLE,
    template: SITE_TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_ORIGIN,
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        GeistSans.variable,
        GeistMono.variable,
        GeistPixelSquare.variable,
        GeistPixelGrid.variable,
        GeistPixelCircle.variable,
        GeistPixelTriangle.variable,
        GeistPixelLine.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
