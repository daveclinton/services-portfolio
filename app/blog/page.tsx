import type { Metadata } from "next"
import Link from "next/link"
import { SiteNav } from "@/components/portfolio/site-nav"
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
    <div className="page">
      <SiteNav />
      <main id="content">
        <header className="page-header">
          <h1>Writing</h1>
          <p>
            Notes on building software, payments, AI, and developer tooling. Follow along with{" "}
            <a href="/feed.xml">the RSS feed</a>.
          </p>
        </header>

        <div className="blog-index">
          {posts.length === 0 ? (
            <p className="blog-empty">Nothing published yet. Check back soon.</p>
          ) : (
            <ol className="blog-list">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="blog-entry">
                    <h2>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    <p className="post-meta">
                      <time dateTime={post.date}>{formatPostDate(post.date, "short")}</time> ·{" "}
                      {post.readingMinutes} min read
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  )
}
