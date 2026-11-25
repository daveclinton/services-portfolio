import type { Metadata } from "next"
import { getPosts } from "@/lib/blog"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"

export const metadata: Metadata = { title: "Posts · Admin", robots: { index: false, follow: false } }

export default async function AdminPostsPage() {
  return <NewsletterStudio section="posts" publishedPosts={(await getPosts()).filter((post) => !post.draft)} />
}
