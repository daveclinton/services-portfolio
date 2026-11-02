import type { Metadata } from "next"
import Link from "next/link"
import { SiteNav } from "@/components/portfolio/site-nav"
import { formatPostDate, getPosts, type Post } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes and guides on building software, payments, AI, and developer tooling.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/feed.xml" },
  },
}

function groupByYear(posts: Post[]) {
  const years = new Map<string, Post[]>()
  for (const post of posts) {
    const year = post.date.slice(0, 4)
    years.set(year, [...(years.get(year) ?? []), post])
  }
  return [...years]
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
            groupByYear(posts).map(([year, yearPosts]) => (
              <section key={year} className="blog-year" aria-labelledby={`year-${year}`}>
                <h2 id={`year-${year}`} className="blog-year-label">
                  {year}
                </h2>
                <ol className="blog-list">
                  {yearPosts.map((post) => (
                    <li key={post.slug}>
                      <article className="blog-entry">
                        <h3>
                          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                        </h3>
                        <p className="post-meta">
                          <time dateTime={post.date}>{formatPostDate(post.date, "short")}</time> ·{" "}
                          {post.readingMinutes} min read
                        </p>
                      </article>
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
