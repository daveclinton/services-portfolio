import { ogContentType, ogImageSize, renderOgImage } from "@/lib/og-image"
import { site } from "@/lib/portfolio-data"

export const alt = `Work experience by ${site.name}`
export const size = ogImageSize
export const contentType = ogContentType

export default function Image() {
  return renderOgImage({ title: "Where I have worked and what I built.", tone: 1, art: "portrait" })
}
