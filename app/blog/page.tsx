import type { Metadata } from "next"
import Link from "next/link"
import { NumberedPage } from "@/components/portfolio/numbered-page"
import { formatPostDate, getPosts } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes and guides on building software, payments, AI, and developer tooling.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/feed.xml" },
  },
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
