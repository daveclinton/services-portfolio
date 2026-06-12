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

const articles = getPublishedBlogPosts()
  .sort((a, b) => {
    if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
      return -1
    }
    return 1
  })
  .map((post) => ({
    title: post.metadata.title,
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

        <main className="home-page" id="main-content">
          <section aria-label="Introduction">
            <h1>David Clinton</h1>
            <p>
              I&apos;m a software engineer who builds platform, mobile, and
              infrastructure systems. I care about practical architecture,
              developer experience, and software that keeps working when real
              users, real data, and real constraints show up.
            </p>

            <p>
              This site is where I collect the things I&apos;m learning and
              building across Backend systems, Mobile Applications, UI libraries and frameworks, Automations,
              Databases, and AI-assisted engineering. I try to write in a way
              that makes hard ideas feel easier to hold.
            </p>
          </section>

          <section aria-label="Favorite writing">
            <p>Some of my recent writing includes:</p>
            <ul>
              {articles.slice(0, 6).map((article) => (
                <li key={article.title}>
                  <Link href={article.href}>{article.title}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Site links">
            <p>
              You can <Link href="/blog">read my writing</Link>, see my{' '}
              <Link href="/work">work</Link>, or <Link href="/contact">reach out</Link>.
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}
