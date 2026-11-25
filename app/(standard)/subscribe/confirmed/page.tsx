import type { Metadata } from "next"
import { NewsletterConfirmation } from "@/components/portfolio/newsletter-signup"

export const metadata: Metadata = { title: "You’re in", robots: { index: false, follow: true } }

export default function ConfirmedPage() {
  return <article className="pb-16"><NewsletterConfirmation /></article>
}
