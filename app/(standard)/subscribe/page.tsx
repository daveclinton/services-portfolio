import type { Metadata } from "next"
import { NewsletterSignup } from "@/components/portfolio/newsletter-signup"
import { newsletter } from "@/lib/portfolio-data"

export const metadata: Metadata = {
  title: "Follow along by email",
  description: newsletter.description,
  alternates: { canonical: newsletter.href },
}

export default function SubscribePage() {
  return (
    <article className="flex flex-col gap-6 pb-16">
      <header className="page-header"><h1>Follow along by email</h1></header>
      <NewsletterSignup showHeading={false} />
    </article>
  )
}
