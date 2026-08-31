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
        padding: "28px 32px",
        background: "#ffffff",
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.06)",
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: "#6b6b6b",
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
          color: "#171717",
          lineHeight: 1.15,
        }}
      >
        {name}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#525252" }}>
        {blend}
      </div>
    </div>
  )
}

export function snapshotOgImage(
  snapshot: GatewaySnapshot,
  title = "Best AI Gateway models"
) {
  const window = formatWindow(snapshot.window.from, snapshot.window.to)
  const value = featuredValuePick(snapshot)
  const frontier = featuredFrontierPick(snapshot)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#f7f7f7",
          color: "#171717",
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
                color: "#6b6b6b",
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
              color: "#525252",
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
    { ...ogSize }
  )
}
