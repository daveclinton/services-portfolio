import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import { MARK } from "@/lib/mark"
import { site } from "@/lib/portfolio-data"
import { TONE_COLORS } from "@/lib/tone"

// After 37signals.com's share images, which are one sentence in the site's own
// type on one flat color. The giant "d" is the site's mark, cut by the edges.

export const ogImageSize = { width: 1200, height: 630 }
export const ogContentType = "image/png"

const asset = (name: string) => readFile(path.join(process.cwd(), "assets", name))
const font = asset("HankenGrotesk-Bold.ttf")
const portrait = asset("og-portrait.jpg").then((file) => `data:image/jpeg;base64,${file.toString("base64")}`)

// The portrait's own backdrop, so the photo and the letter become one shape.
const PAPER = "#f9f8fd"

const { bowl, stem } = MARK

function Mark({ size, color, photo, glyph, ink }: { size: number; color: string; photo?: string; glyph?: string; ink?: string }) {
  const u = size / 64
  return (
    <div style={{ position: "relative", display: "flex", width: size, height: size }}>
      <div style={{ position: "absolute", left: stem.x * u, top: stem.y * u, width: stem.width * u, height: stem.height * u, background: color }} />
      <div
        style={{
          position: "absolute",
          display: "flex",
          left: (bowl.cx - bowl.r) * u,
          top: (bowl.cy - bowl.r) * u,
          width: bowl.r * 2 * u,
          height: bowl.r * 2 * u,
          borderRadius: bowl.r * u,
          background: color,
          overflow: "hidden",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            width={bowl.r * 2 * u}
            height={bowl.r * 2 * u}
            style={{ borderRadius: bowl.r * u }}
          />
        ) : null}
        {glyph ? (
          <div style={{ display: "flex", width: "100%", justifyContent: "center", alignItems: "center", color: ink, fontSize: 18 * u }}>{glyph}</div>
        ) : null}
      </div>
    </div>
  )
}

type OgImage = {
  title: string
  /** Index into the site's colors. */
  tone: number
  /** Shown at the bottom left. */
  note?: string
  /** "portrait" puts the photo inside the giant letter. "article" keeps the letter in the background. */
  art: "portrait" | "letter" | "article"
  /** One character inside the letter. */
  glyph?: string
}

// One solid shade, because see-through shapes show a seam where they overlap.
function darken(hex: string) {
  return `#${[1, 3, 5].map((at) => Math.round(parseInt(hex.slice(at, at + 2), 16) * 0.86).toString(16).padStart(2, "0")).join("")}`
}

function titleSize(title: string, article: boolean) {
  if (!article) return title.length > 45 ? 76 : 84
  return title.length > 60 ? 80 : title.length > 36 ? 92 : 112
}

export async function renderOgImage({ title, tone, note = site.url.replace("https://www.", ""), art, glyph }: OgImage) {
  const background = TONE_COLORS[tone % TONE_COLORS.length]
  const article = art === "article"

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          background,
          color: "#fff",
          fontFamily: "Hanken Grotesk",
          letterSpacing: "-0.025em",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", display: "flex", left: article ? 600 : 500, top: article ? 0 : -70 }}>
          <Mark
            size={article ? 900 : 860}
            color={article ? darken(background) : PAPER}
            glyph={glyph}
            ink={background}
            photo={art === "portrait" ? await portrait : undefined}
          />
        </div>
        <div
          style={{
            position: "absolute",
            display: "flex",
            left: 64,
            top: 56,
            width: article ? 1050 : 580,
            fontSize: titleSize(title, article),
            lineHeight: 1.06,
          }}
        >
          {title}
        </div>
        <div style={{ position: "absolute", display: "flex", left: 64, right: 64, bottom: 52, justifyContent: "space-between", alignItems: "center", fontSize: 32, letterSpacing: "-0.01em" }}>
          <div style={{ display: "flex" }}>{note}</div>
          {article ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex" }}>{site.name}</div>
              <Mark size={72} color="#fff" />
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      ...ogImageSize,
      fonts: [{ name: "Hanken Grotesk", data: await font, weight: 700, style: "normal" }],
    },
  )
}
