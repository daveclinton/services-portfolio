import { ogImageSize, renderOgImage } from "@/lib/og-image"
import { site } from "@/lib/portfolio-data"

export const alt = site.title
export const size = ogImageSize
export const contentType = "image/png"

export default function Image() {
  return renderOgImage({
    title: "I build software and write about what happens after it ships.",
    subtitle: site.url.replace("https://", ""),
  })
}
