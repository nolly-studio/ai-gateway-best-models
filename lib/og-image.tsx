import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"

import { blendOf, formatWindow, money } from "@/lib/format"
import type { GatewaySnapshot } from "@/lib/gateway-snapshot"
import { featuredFrontierPick, featuredValuePick } from "@/lib/seo"
import { SITE_NAME } from "@/lib/site"

export const ogSize = {
  width: 1200,
  height: 630,
}

export const ogContentType = "image/png"

const canvas = "#0a0a0a"
const surface = "#171717"
const ink = "#fafafa"
const ink2 = "#c7c7c7"
const ink3 = "#a3a3a3"
const line = "rgba(255,255,255,0.1)"

export function snapshotOgAlt(snapshot: GatewaySnapshot): string {
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  if (value && frontier && value.id !== frontier.id) {
    return `${SITE_NAME}: ${value.name} and ${frontier.name} for ${window}`
  }
  if (value) {
    return `${SITE_NAME}: ${value.name} for ${window}`
  }
  return `${SITE_NAME}: best AI Gateway models for ${window}`
}

async function loadGeistFonts() {
  const dir = join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans")
  const [regular, semiBold] = await Promise.all([
    readFile(join(dir, "Geist-Regular.ttf")),
    readFile(join(dir, "Geist-SemiBold.ttf")),
  ])

  return [
    {
      name: "Geist",
      data: regular,
      style: "normal" as const,
      weight: 400 as const,
    },
    {
      name: "Geist",
      data: semiBold,
      style: "normal" as const,
      weight: 600 as const,
    },
  ]
}

function PickRow({
  label,
  name,
  blend,
}: {
  label: string
  name: string
  blend: string
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "28px 32px 52px",
        background: surface,
        borderRadius: 16,
        border: `1px solid ${line}`,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: ink3,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 40,
          fontWeight: 600,
          color: ink,
          lineHeight: 1.15,
        }}
      >
        {name}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: ink2 }}>
        {blend}
      </div>
    </div>
  )
}

export async function snapshotOgImage(
  snapshot: GatewaySnapshot,
  title = "Best AI Gateway models"
) {
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)
  const fonts = await loadGeistFonts()

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 64px 80px",
          background: canvas,
          color: ink,
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: ink3,
                letterSpacing: 0.4,
              }}
            >
              {SITE_NAME}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 600,
                lineHeight: 1.1,
                maxWidth: 820,
              }}
            >
              {title}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: ink2,
            }}
          >
            {window}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <PickRow
            blend={
              value
                ? `${money(blendOf(value))} / 1M${value.zdrProvider ? ` · ${value.zdrProvider}` : ""}`
                : "No pick"
            }
            label="ZDR + no training"
            name={value?.name ?? "—"}
          />
          <PickRow
            blend={
              frontier
                ? `${money(blendOf(frontier))} / 1M`
                : "No pick"
            }
            label="Frontier"
            name={frontier?.name ?? "—"}
          />
        </div>
      </div>
    ),
    { ...ogSize, fonts }
  )
}
