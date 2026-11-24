import { ogContentType, ogImageSize, renderOgImage } from "@/lib/og-image"
import { backgroundItems, formatRoleDates, site } from "@/lib/portfolio-data"
import { roleTitle } from "@/lib/section"

export const alt = `Work experience of ${site.name}`
export const size = ogImageSize
export const contentType = ogContentType

export function generateStaticParams() {
  return backgroundItems.map((item) => ({ role: item.slug }))
}

export default async function Image({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const index = Math.max(0, backgroundItems.findIndex((item) => item.slug === role))
  const item = backgroundItems[index]
  return renderOgImage({ title: roleTitle(item.company), tone: index, note: formatRoleDates(item), art: "letter", glyph: String(index).padStart(2, "0") })
}
