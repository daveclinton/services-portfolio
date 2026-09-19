import { notFound } from "next/navigation"
import { AskAiChat } from "@/components/portfolio/ask-ai-chat"
import { backgroundItems } from "@/lib/portfolio-data"

export function generateStaticParams() {
  return backgroundItems.map((item) => ({ id: item.id }))
}

export default async function AskAiPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const entry = backgroundItems.find((item) => item.id === decodeURIComponent(id))

  if (!entry) {
    notFound()
  }

  return <AskAiChat entry={entry} />
}
