import type { Metadata } from "next"
import { AskAiChat } from "@/components/portfolio/ask-ai-chat"
import { askAi, site } from "@/lib/portfolio-data"

export const metadata: Metadata = {
  title: askAi.label,
  description: askAi.description,
  alternates: { canonical: askAi.href },
  openGraph: { type: "website", siteName: site.name, title: askAi.label, description: askAi.description, url: askAi.href },
  twitter: { card: "summary_large_image", title: askAi.label, description: askAi.description },
}

export default function AskAiAboutMePage() {
  return <AskAiChat />
}
