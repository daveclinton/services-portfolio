import type { Metadata } from "next"
import Link from "next/link"
import { NumberedPage } from "@/components/portfolio/numbered-page"
import { formatPostDate, getPosts } from "@/lib/blog"
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

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <NumberedPage
      id="writing"
      heading="Writing"
      items={[
        ...posts.map((post) => ({
          key: post.slug,
          title: post.title,
          body: (
            <>
              <p className="signal-meta">
                <time dateTime={post.date}>{formatPostDate(post.date, "short")}</time> · {post.readingMinutes} min read
              </p>
              <p>{post.description}</p>
              <p><Link href={`/blog/${post.slug}`}>Read the article</Link></p>
            </>
          ),
        })),
        {
          key: "rss",
          title: "Follow along",
          body: <p>You can follow new articles with <a href="/feed.xml">the RSS feed</a>.</p>,
        },
      ]}
    />
  )
}
