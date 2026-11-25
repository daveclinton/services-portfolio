import type { Metadata } from "next"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"

export const metadata: Metadata = { title: "Posts · Admin", robots: { index: false, follow: false } }

export default function AdminPostsPage() {
  return <NewsletterStudio key="posts" section="posts" />
}
