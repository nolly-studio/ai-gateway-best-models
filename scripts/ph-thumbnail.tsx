import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"

const SIZE = 720
const canvas = "#000000"
const ink = "#ffffff"

async function loadFonts() {
  const dir = join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans")
  const medium = await readFile(join(dir, "Geist-Medium.ttf"))
  return [
    {
      name: "Geist",
      data: medium,
      style: "normal" as const,
      weight: 500 as const,
    },
  ]
}

async function render() {
  const fonts = await loadFonts()
  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: canvas,
        }}
      >
        <div
          style={{
            display: "flex",
            marginTop: -18,
            fontSize: 380,
            fontWeight: 500,
            color: ink,
            lineHeight: 1,
            letterSpacing: -16,
            fontFamily: "Geist",
          }}
        >
          b
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE, fonts }
  )

  const dir = join(process.cwd(), "public")
  await mkdir(dir, { recursive: true })
  const path = join(dir, "product-hunt-thumbnail.png")
  await writeFile(path, Buffer.from(await response.arrayBuffer()))
  return path
}

console.log(await render())
