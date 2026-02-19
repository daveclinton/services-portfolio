import Link from 'next/link'
import type { Metadata } from 'next'
import { ThemeToggle } from 'app/components/theme-toggle'
import { getPublishedBlogPosts } from './blog/utils'
import { absoluteUrl } from './seo'

export const metadata: Metadata = {
  title: 'I Build Systems That Don’t Flinch',
  description:
    'I build platform, mobile, and infrastructure systems that hold up under pressure, not just in perfect demos.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'daveclintonn',
    description:
      'Platform, mobile, and infrastructure engineering by David Clinton.',
    url: absoluteUrl('/'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og?title=daveclintonn'),
        width: 1200,
        height: 630,
        alt: 'daveclintonn home preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'daveclintonn',
    description:
      'Platform, mobile, and infrastructure engineering by David Clinton.',
    images: [absoluteUrl('/og?title=daveclintonn')],
  },
}

function getReadTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes} min read`
}

const articles = getPublishedBlogPosts()
  .sort((a, b) => {
    if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
      return -1
    }
    return 1
  })
  .map((post) => ({
    title: post.metadata.title,
    description: post.metadata.summary,
    readTime: getReadTime(post.content),
    href: `/blog/${post.slug}`,
  }))

export default function Page() {
  return (
    <div className="portfolio-shell">
      <div className="portfolio-container">
        <header className="topbar" aria-label="Top navigation">
          <Link href="/" className="site-identity">
            <img src="/my-picture.jpg" alt="David Clinton" className="site-avatar" />
            <span className="site-name">daveclintonn</span>
          </Link>
          <nav className="top-nav" aria-label="Primary">
            <Link href="/blog">blog</Link>
            <Link href="/work">work</Link>
            <Link href="/contact">contact</Link>
            <ThemeToggle />
          </nav>
        </header>

        <section className="quote-strip" aria-label="Quote">
          <p>
            &ldquo;Build systems that survive contact with reality.&rdquo;
            <span> - David Clinton</span>
          </p>
        </section>

        <main className="main-layout">
          <section className="hero" aria-label="Hero">
            <h1>
              <span>PLATFORM, MOBILE &amp;</span>
              <span>INFRASTRUCTURE ENGINEERING</span>
            </h1>
            <p>
              I build infrastructure, developer tooling, and high-performance
              systems where software meets real-world constraints.
            </p>
          </section>

          <section className="article-grid" aria-label="Articles">
            {articles.map((article) => (
              <article key={article.title} className="article-item">
                <Link href={article.href}>
                  <h2>{article.title}</h2>
                </Link>
                <p>{article.description}</p>
                <small>{article.readTime}</small>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}
