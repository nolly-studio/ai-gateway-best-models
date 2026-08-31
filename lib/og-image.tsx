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

const canvas = "#000000"
const surface = "#111111"
const ink = "#ffffff"
const ink2 = "#a3a3a3"
const ink3 = "#737373"
const line = "rgba(255,255,255,0.12)"

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
  const [regular, medium] = await Promise.all([
    readFile(join(dir, "Geist-Regular.ttf")),
    readFile(join(dir, "Geist-Medium.ttf")),
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
      data: medium,
      style: "normal" as const,
      weight: 500 as const,
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
        gap: 6,
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
          fontSize: 18,
          fontWeight: 400,
          color: ink3,
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 36,
          fontWeight: 500,
          color: ink,
          lineHeight: 1.05,
          letterSpacing: -1.1,
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          fontWeight: 400,
          color: ink2,
          lineHeight: 1.2,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {blend}
      </div>
    </div>
  )
}

export async function snapshotOgImage(
  snapshot: GatewaySnapshot,
  title = "Best AI Gateway models."
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 400,
                color: ink3,
                lineHeight: 1.2,
              }}
            >
              {SITE_NAME}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                width: 560,
                fontSize: 64,
                fontWeight: 500,
                lineHeight: 1.02,
                letterSpacing: -2.4,
                color: ink,
              }}
            >
              {title}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 400,
              color: ink3,
              lineHeight: 1.2,
              fontVariantNumeric: "tabular-nums",
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
            label="Bang"
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
