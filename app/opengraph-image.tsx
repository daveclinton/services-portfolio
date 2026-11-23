import { ogImageSize, renderOgImage } from "@/lib/og-image"
import { intro, site } from "@/lib/portfolio-data"

export const alt = site.title
export const size = ogImageSize
export const contentType = "image/png"

export default function Image() {
  return renderOgImage({
    title: intro.headline,
    subtitle: site.url.replace("https://", ""),
  })
}
