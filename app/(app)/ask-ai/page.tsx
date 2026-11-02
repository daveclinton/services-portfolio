import type { Metadata } from "next"
import { AskAiChat } from "@/components/portfolio/ask-ai-chat"
import { askAi } from "@/lib/portfolio-data"

export const metadata: Metadata = {
  title: askAi.label,
  description: askAi.description,
  alternates: { canonical: askAi.href },
}

export default function AskAiAboutMePage() {
  return <AskAiChat />
}
