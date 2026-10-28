import type { Metadata } from "next"
import Link from "next/link"
import { formatPostDate, getPosts, type Post } from "@/lib/blog"

export const metadata: Metadata = {
  title: "My thoughts",
  description: "Notes and guides on building software, payments, AI, and developer tooling.",
  alternates: { canonical: "/blog" },
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
    <main className="home-story">
      <nav className="blog-nav" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
      </nav>

      <header className="home-story-header">
        <h1>
          <span className="home-story-initial">M</span>y{" "}
          <span className="home-story-initial">T</span>houghts
        </h1>
      </header>

      <div className="home-story-article">
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
                      <time dateTime={post.date}>
                        {formatPostDate(post.date, "short")} · {post.readingMinutes} min read
                      </time>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </main>
  )
}
