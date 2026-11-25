import type { Metadata } from "next"
import { Suspense } from "react"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"
import { NewslettersDesk } from "@/components/portfolio/newsletters-desk"

export const metadata: Metadata = { title: "Newsletters · Admin", robots: { index: false, follow: false } }

export default function AdminNewslettersPage() {
  return <Suspense fallback={<NewsletterStudio section="newsletters" />}><NewslettersDesk /></Suspense>
}
