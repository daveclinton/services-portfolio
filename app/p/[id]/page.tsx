import type { Metadata } from "next"
import { DraftPreview } from "@/components/portfolio/draft-preview"

// Ghost-style draft preview: the public article layout, at its own address.
// Access is checked by the API on every load; search engines are kept out.
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } }

export default async function DraftPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DraftPreview id={id} />
}
