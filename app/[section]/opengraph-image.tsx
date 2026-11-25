import { ogContentType, ogImageSize, renderOgImage } from "@/lib/og-image"
import { site } from "@/lib/portfolio-data"
import { signals } from "@/lib/signals"

export const alt = `From the home page of ${site.name}`
export const size = ogImageSize
export const contentType = ogContentType

export function generateStaticParams() {
  return signals.map((item) => ({ section: item.slug }))
}

export default async function Image({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  const index = Math.max(0, signals.findIndex((item) => item.slug === section))
  return renderOgImage({ title: signals[index].title, tone: index, art: "letter", glyph: String(index).padStart(2, "0") })
}
