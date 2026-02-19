import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ThemeToggle } from 'app/components/theme-toggle'
import { CustomMDX } from 'app/components/mdx'
import { TableOfContents } from 'app/components/toc'
import { ShareDialog } from 'app/components/share-dialog'
import {
  formatDate,
  getPublishedBlogPosts,
  type BlogPost,
} from 'app/blog/utils'
import { extractHeadingsFromMdx } from 'app/blog/heading-utils'
import { absoluteUrl, siteConfig } from 'app/seo'

const quote = {
  text: 'Indeed the business of the universe is to make such a fool out of you that you will know yourself for one, and begin to be wise.',
  author: 'George MacDonald',
}

function getReadTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes} min read`
}

function byNewest(a: BlogPost, b: BlogPost) {
  if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
    return -1
  }
  return 1
}

function resolveOriginalPlatformName(
  originalUrl?: string,
  originalPlatform?: string
) {
  if (originalPlatform) {
    return originalPlatform
  }

  if (!originalUrl) {
    return null
  }

  try {
    const host = new URL(originalUrl).hostname.replace(/^www\./, '')
    return host
  } catch {
    return 'external platform'
  }
}

export function generateStaticParams() {
  const posts = getPublishedBlogPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPublishedBlogPosts().find((entry) => entry.slug === slug)

  if (!post) {
    return
  }

  const pageUrl = absoluteUrl(`/blog/${post.slug}`)
  const ogImage = post.metadata.image
    ? absoluteUrl(post.metadata.image)
    : absoluteUrl(`/og?title=${encodeURIComponent(post.metadata.title)}`)

  return {
    title: post.metadata.title,
    description: post.metadata.summary,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    authors: [{ name: siteConfig.owner }],
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.summary,
      type: 'article',
      publishedTime: post.metadata.publishedAt,
      url: pageUrl,
      authors: [siteConfig.owner],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${post.metadata.title} social preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metadata.title,
      description: post.metadata.summary,
      creator: siteConfig.twitterHandle,
      images: [ogImage],
    },
  }
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const allPosts = getPublishedBlogPosts().sort(byNewest)
  const post = allPosts.find((entry) => entry.slug === slug)

  if (!post) {
    notFound()
  }

  const enhancement = {
    audioSrc: post.metadata.audioSrc,
    audioDuration: post.metadata.audioDuration,
    transcriptUrl: post.metadata.transcriptUrl,
    originalUrl: post.metadata.originalUrl || post.metadata.substackUrl,
    originalPlatform: resolveOriginalPlatformName(
      post.metadata.originalUrl || post.metadata.substackUrl,
      post.metadata.originalPlatform
    ),
  }
  const postUrl = absoluteUrl(`/blog/${post.slug}`)
  const previewImageUrl = post.metadata.image
    ? absoluteUrl(post.metadata.image)
    : absoluteUrl(`/og?title=${encodeURIComponent(post.metadata.title)}`)

  const recentArticles = allPosts
    .filter((entry) => entry.slug !== post.slug)
    .slice(0, 4)
    .map((entry) => ({
      title: entry.metadata.title,
      description: entry.metadata.summary,
      readTime: getReadTime(entry.content),
      href: `/blog/${entry.slug}`,
    }))

  const tocHeadings = extractHeadingsFromMdx(post.content)

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
            <ShareDialog
              title={post.metadata.title}
              summary={post.metadata.summary}
              url={postUrl}
              imageUrl={previewImageUrl}
            />
            <TableOfContents headings={tocHeadings} />
          </aside>

          <article className="post-article">
            {enhancement.audioSrc ? (
              <>
                <audio controls preload="none" className="post-audio">
                  <source src={enhancement.audioSrc} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                {enhancement.audioDuration || enhancement.transcriptUrl ? (
                  <p className="post-audio-meta">
                    {enhancement.audioDuration ? (
                      <span>Duration: {enhancement.audioDuration}</span>
                    ) : null}
                    {enhancement.audioDuration && enhancement.transcriptUrl ? (
                      <span> · </span>
                    ) : null}
                    {enhancement.transcriptUrl ? (
                      <a href={enhancement.transcriptUrl} target="_blank" rel="noreferrer">
                        Transcript
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="post-audio-pending">Audio version coming soon.</p>
            )}

            {enhancement.originalUrl ? (
              <p className="post-origin">
                Originally published on{' '}
                <a href={enhancement.originalUrl} target="_blank" rel="noreferrer">
                  {enhancement.originalPlatform}
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
