import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import { site } from "@/lib/portfolio-data"

export const ogImageSize = { width: 1200, height: 630 }

const avatar = readFile(path.join(process.cwd(), "assets", "og-avatar.jpg"), "base64")

export async function renderOgImage({ title, subtitle }: { title: string; subtitle: string }) {
  const avatarSrc = `data:image/jpeg;base64,${await avatar}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#12100e",
          color: "#e9e6e0",
          borderTop: "12px solid #91c3f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={avatarSrc} width={112} height={112} style={{ borderRadius: 56 }} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 600 }}>{site.name}</div>
            <div style={{ fontSize: 28, color: "#b1ada7" }}>
              {`${site.jobTitle} · ${site.location.country}`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.01em" }}>{title}</div>
          <div style={{ fontSize: 30, color: "#b1ada7" }}>{subtitle}</div>
        </div>
      </div>
    ),
    ogImageSize,
  )
}
