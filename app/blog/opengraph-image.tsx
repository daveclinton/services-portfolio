import { ogContentType, ogImageSize, renderOgImage } from "@/lib/og-image"
import { site } from "@/lib/portfolio-data"

export const alt = `Writing by ${site.name}`
export const size = ogImageSize
export const contentType = ogContentType

export default function Image() {
  return renderOgImage({ title: "Things I write about building software.", tone: 3, art: "letter", glyph: "¶" })
}
