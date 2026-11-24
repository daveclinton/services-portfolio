import type { Metadata } from "next"
import { WritingList } from "@/components/portfolio/writing-list"
import { site } from "@/lib/portfolio-data"

const description = "Notes and guides on building software, payments, AI, and developer tooling."

export const metadata: Metadata = {
  title: "Writing",
  description,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: { type: "website", siteName: site.name, title: "Writing", description, url: "/blog" },
  twitter: { card: "summary_large_image", title: "Writing", description },
}

export default function BlogPage() {
  return <WritingList />
}
