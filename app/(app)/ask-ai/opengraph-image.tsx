import { ogContentType, ogImageSize, renderOgImage } from "@/lib/og-image"
import { site } from "@/lib/portfolio-data"

export const alt = `Ask an AI about the work of ${site.name}`
export const size = ogImageSize
export const contentType = ogContentType

export default function Image() {
  return renderOgImage({ title: "Ask my AI about my work.", tone: 5, art: "letter", glyph: "?" })
}
