import { ogContentType, ogImageSize, renderOgImage } from "@/lib/og-image"
import { intro, site } from "@/lib/portfolio-data"

export const alt = `${site.name}. ${intro.headline}`
export const size = ogImageSize
export const contentType = ogContentType

export default function Image() {
  return renderOgImage({ title: intro.headline, tone: 0, art: "portrait" })
}
