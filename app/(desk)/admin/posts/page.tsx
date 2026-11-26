import type { Metadata } from "next"
import { Suspense } from "react"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"
import { PostsDesk } from "@/components/portfolio/newsletters-desk"

export const metadata: Metadata = { title: "Posts · Admin", robots: { index: false, follow: false } }

export default function AdminPostsPage() {
  return <Suspense fallback={<NewsletterStudio section="posts" />}><PostsDesk /></Suspense>
}
