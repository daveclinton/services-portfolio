import Link from 'next/link'
import type { Metadata } from 'next'
import { ThemeToggle } from 'app/components/theme-toggle'
import { absoluteUrl } from 'app/seo'

const post = {
  title: 'DESIGNING SYSTEMS THAT SCALE WITH PEOPLE',
  publishedAt: 'January 12, 2026',
  quote:
    'Indeed the business of the universe is to make such a fool out of you that you will know yourself for one, and begin to be wise.',
  quoteAuthor: 'George MacDonald',
  audioSrc: '/audio/designing-systems.mp3',
  paragraphs: [
    'Every durable system starts with a social design, not a software design. Architecture choices matter, but the first-order effect usually comes from how information flows between people, how decisions are made, and how accountability is distributed.',
    'When teams grow, the initial instinct is often to add process everywhere. In practice, that creates procedural drag long before it creates clarity. A better approach is to introduce constraints only where failure modes are recurring, then make those constraints visible and lightweight.',
    'Systems become resilient when they are legible. Documentation that no one reads is not legibility. Interfaces, defaults, and naming conventions are. If a new teammate can predict behavior from the shape of the system, the system is doing part of the training work on its own.',
    'The objective is not maximal control. The objective is repeatable outcomes with room for judgment. That balance is where teams move quickly without breaking trust with users, partners, or each other.',
  ],
}

const recentArticles = [
  {
    title: 'AI is the New Medium',
    description:
      'New creative and technical workflows emerge when intelligence becomes a material, not just a tool.',
    readTime: '7 min read',
    href: '#',
  },
  {
    title: 'Art of Abstraction',
    description:
      'Abstraction as a craft decision: where to hide complexity and where to expose useful truth.',
    readTime: '3 min read',
    href: '#',
  },
  {
    title: 'Cost of Consensus',
    description:
      'The hidden drag of alignment-heavy organizations and how decision structures shape execution speed.',
    readTime: '15 min read',
    href: '#',
  },
  {
    title: 'Lessons from Lean Manufacturing',
    description:
      'Applying flow, constraint analysis, and iteration rhythm from factory floors to digital product teams.',
    readTime: '6 min read',
    href: '#',
  },
]

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Editorial writing on engineering, systems, and execution.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog | daveclintonn',
    description: 'Editorial writing on engineering, systems, and execution.',
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
    description: 'Editorial writing on engineering, systems, and execution.',
    images: [absoluteUrl('/og?title=Blog')],
  },
}

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

        <section className="quote-strip quote-strip-centered" aria-label="Quote">
          <p>
            &ldquo;{post.quote}&rdquo;
            <span> - {post.quoteAuthor}</span>
          </p>
        </section>

        <main className="post-layout">
          <aside className="post-rail">
            <h1>{post.title}</h1>
            <p>{post.publishedAt}</p>
          </aside>

          <article className="post-article">
            <audio controls preload="none" className="post-audio">
              <source src={post.audioSrc} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>

            {post.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        </main>

        <section className="recent-articles" aria-label="Recent Articles">
          <h2>Recent Articles</h2>
          <div className="article-grid recent-articles-grid">
            {recentArticles.map((article) => (
              <article key={article.title} className="article-item">
                <a href={article.href}>
                  <h3>{article.title}</h3>
                </a>
                <p>{article.description}</p>
                <small>{article.readTime}</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
