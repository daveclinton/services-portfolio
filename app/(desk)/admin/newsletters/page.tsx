import type { Metadata } from "next"
import { getPosts } from "@/lib/blog"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"

export const metadata: Metadata = { title: "Newsletters · Admin", robots: { index: false, follow: false } }

export default async function AdminNewslettersPage({ searchParams }: PageProps<"/admin/newsletters">) {
  const query = await searchParams
  return <NewsletterStudio section="newsletters" publishedPosts={(await getPosts()).filter((post) => !post.draft)} initialPost={typeof query.post === "string" ? query.post : undefined} />
}
