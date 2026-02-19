import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ThemeToggle } from 'app/components/theme-toggle'
import { CustomMDX } from 'app/components/mdx'
import { formatDate, getBlogPosts } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'

const quote = {
  text: 'Indeed the business of the universe is to make such a fool out of you that you will know yourself for one, and begin to be wise.',
  author: 'George MacDonald',
}

const postEnhancements: Record<
  string,
  { audioSrc: string; substackUrl?: string }
> = {
  'things-i-learned-writing-gpu-infrastructure': {
    audioSrc: '/audio/things-i-learned-writing-gpu-infrastructure.mp3',
    substackUrl:
      'https://daveclintonn.substack.com/p/things-i-learned-writing-gpu-infrastructure',
  },
  'redo-plan': {
    audioSrc: '/audio/designing-systems.mp3',
  },
}

const recentArticles = [
  {
    title: 'What To Expect Here In 2026',
    description:
      'This space will hold articles on practical engineering and developer experience.',
    readTime: '2 min read',
    href: '/blog/redo-plan',
  },
  {
    title: 'Things I Learned Writing GPU Infrastructure Tutorials',
    description:
      'How I learned to stop guessing, start measuring, and actually earn performance.',
    readTime: '14 min read',
    href: '/blog/things-i-learned-writing-gpu-infrastructure',
  },
]

export function generateStaticParams() {
  const posts = getBlogPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPosts().find((entry) => entry.slug === slug)

  if (!post) {
    return
  }

  return {
    title: post.metadata.title,
    description: post.metadata.summary,
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.summary,
      type: 'article',
      publishedTime: post.metadata.publishedAt,
      url: `${baseUrl}/blog/${post.slug}`,
    },
  }
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPosts().find((entry) => entry.slug === slug)

  if (!post) {
    notFound()
  }

  const enhancement = postEnhancements[post.slug] ?? {
    audioSrc: '/audio/designing-systems.mp3',
  }

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
            &ldquo;{quote.text}&rdquo;
            <span> - {quote.author}</span>
          </p>
        </section>

        <main className="post-layout">
          <aside className="post-rail">
            <h1>{post.metadata.title}</h1>
            <p>{formatDate(post.metadata.publishedAt)}</p>
          </aside>

          <article className="post-article">
            <audio controls preload="none" className="post-audio">
              <source src={enhancement.audioSrc} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>

            {enhancement.substackUrl ? (
              <p className="post-origin">
                Originally published on{' '}
                <a href={enhancement.substackUrl} target="_blank" rel="noreferrer">
                  Substack
                </a>
                .
              </p>
            ) : null}

            <CustomMDX source={post.content} />
          </article>
        </main>

        <section className="recent-articles" aria-label="Recent Articles">
          <h2>Recent Articles</h2>
          <div className="article-grid recent-articles-grid">
            {recentArticles
              .filter((article) => article.href !== `/blog/${post.slug}`)
              .map((article) => (
                <article key={article.title} className="article-item">
                  <Link href={article.href}>
                    <h3>{article.title}</h3>
                  </Link>
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
