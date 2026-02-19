import Link from 'next/link'
import type { Metadata } from 'next'
import { ThemeToggle } from 'app/components/theme-toggle'
import { absoluteUrl } from 'app/seo'
import { formatDate, getPublishedBlogPosts } from './utils'

function getReadTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes} min read`
}

const posts = getPublishedBlogPosts()
  .sort((a, b) => {
    if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
      return -1
    }
    return 1
  })
  .map((post) => ({
    title: post.metadata.title,
    summary: post.metadata.summary,
    date: formatDate(post.metadata.publishedAt),
    readTime: getReadTime(post.content),
    href: `/blog/${post.slug}`,
  }))

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Published posts by David Clinton.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog | daveclintonn',
    description: 'Published posts by David Clinton.',
    url: absoluteUrl('/blog'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og?title=Blog'),
        width: 1200,
        height: 630,
        alt: 'daveclintonn blog preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | daveclintonn',
    description: 'Published posts by David Clinton.',
    images: [absoluteUrl('/og?title=Blog')],
  },
}

export default function BlogIndexPage() {
  return (
    <div className="portfolio-shell">
      <div className="portfolio-container">
        <header className="topbar" aria-label="Top navigation">
          <Link href="/" className="site-identity">
            <img src="/my-picture.jpg" alt="David Clinton" className="site-avatar" />
            <span className="site-name">daveclintonn</span>
          </Link>
          <nav className="top-nav" aria-label="Primary">
            <Link href="/blog" aria-current="page">blog</Link>
            <Link href="/work">work</Link>
            <Link href="/contact">contact</Link>
            <ThemeToggle />
          </nav>
        </header>

        <section className="quote-strip quote-strip-centered" aria-label="Quote">
          <p>
            &ldquo;Build systems that survive contact with reality.&rdquo;
            <span> - David Clinton</span>
          </p>
        </section>

        <main className="main-layout" id="main-content">
          <section className="hero" aria-label="Blog intro">
            <h1>
              <span>PUBLISHED</span>
              <span>ARTICLES</span>
            </h1>
            <p>
              Essays and practical notes on platform, mobile, and infrastructure
              engineering.
            </p>
          </section>

          <section className="article-grid" aria-label="Published posts">
            {posts.length ? (
              posts.map((post) => (
                <article key={post.title} className="article-item">
                  <Link href={post.href}>
                    <h2>{post.title}</h2>
                  </Link>
                  <p>{post.summary}</p>
                  <small>
                    {post.date} · {post.readTime}
                  </small>
                </article>
              ))
            ) : (
              <article className="article-item">
                <h2>No published posts yet</h2>
                <p>Mark a post with `published: true` in frontmatter to show it here.</p>
              </article>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
