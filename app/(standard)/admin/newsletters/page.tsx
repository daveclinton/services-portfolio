import type { Metadata } from "next"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"

export const metadata: Metadata = {
  title: "Newsletter desk",
  robots: { index: false, follow: false },
}

export default function NewsletterStudioPage() {
  return <NewsletterStudio />
}
