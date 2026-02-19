import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ThemeToggle } from 'app/components/theme-toggle'
import { CustomMDX } from 'app/components/mdx'
import { TableOfContents } from 'app/components/toc'
import { ShareDialog } from 'app/components/share-dialog'
import { PostCta } from 'app/components/post-cta'
import { ExternalLinkIcon } from 'app/components/icons/external-link-icon'
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

function tokens(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
}

function relevanceScore(base: BlogPost, candidate: BlogPost) {
  const baseSet = new Set(tokens(`${base.metadata.title} ${base.metadata.summary}`))
  const candidateTokens = tokens(
    `${candidate.metadata.title} ${candidate.metadata.summary}`
  )
  let score = 0
  for (const token of candidateTokens) {
    if (baseSet.has(token)) {
      score += 1
    }
  }
  return score
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
  }
  const postUrl = absoluteUrl(`/blog/${post.slug}`)
  const previewImageUrl = post.metadata.image
    ? absoluteUrl(post.metadata.image)
    : absoluteUrl(`/og?title=${encodeURIComponent(post.metadata.title)}`)
  const storyImageUrl = absoluteUrl(
    `/og/story?title=${encodeURIComponent(post.metadata.title)}&url=${encodeURIComponent(
      postUrl
    )}`
  )

  const recentArticles = allPosts
    .filter((entry) => entry.slug !== post.slug)
    .slice(0, 4)
    .map((entry) => ({
      title: entry.metadata.title,
      description: entry.metadata.summary,
      readTime: getReadTime(entry.content),
      href: `/blog/${entry.slug}`,
    }))

  const relatedArticles = allPosts
    .filter((entry) => entry.slug !== post.slug)
    .map((entry) => ({
      title: entry.metadata.title,
      description: entry.metadata.summary,
      href: `/blog/${entry.slug}`,
      readTime: getReadTime(entry.content),
      score: relevanceScore(post, entry),
      publishedAt: entry.metadata.publishedAt,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    .slice(0, 3)

  const tocHeadings = extractHeadingsFromMdx(post.content)
  const recommendedReads = post.metadata.recommendedReads || []
  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.metadata.title,
    description: post.metadata.summary,
    author: {
      '@type': 'Person',
      name: siteConfig.owner,
      url: siteConfig.url,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.owner,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/my-picture.jpg'),
      },
    },
    datePublished: post.metadata.publishedAt,
    dateModified: post.metadata.publishedAt,
    mainEntityOfPage: postUrl,
    image: [previewImageUrl],
    wordCount,
    articleSection: 'Engineering',
    inLanguage: 'en-US',
    audio: enhancement.audioSrc
      ? {
          '@type': 'AudioObject',
          contentUrl: enhancement.audioSrc,
          duration: enhancement.audioDuration || undefined,
          transcript: enhancement.transcriptUrl || undefined,
        }
      : undefined,
  }

  return (
    <div className="portfolio-shell">
      <div className="portfolio-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
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
            <p className="post-subheading">{post.metadata.summary}</p>
            <ShareDialog
              title={post.metadata.title}
              summary={post.metadata.summary}
              url={postUrl}
              imageUrl={previewImageUrl}
              storyImageUrl={storyImageUrl}
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

            <CustomMDX source={post.content} />

            {recommendedReads.length ? (
              <section className="recommended-reads" aria-label="Personal Reccomendations">
                <h3>Personal Reccomendations</h3>
                <div className="recommended-list">
                  {recommendedReads.map((item) => (
                    <a
                      key={`${item.title}-${item.url}`}
                      className="recommended-item"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="recommended-item-title">
                        <span>{item.title}</span>
                        <ExternalLinkIcon />
                      </span>
                      {item.source ? <small>{item.source}</small> : null}
                      {item.note ? <p>{item.note}</p> : null}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedArticles.length ? (
              <section className="related-posts" aria-label="Related posts">
                <h3>Related Posts</h3>
                <div className="related-post-list">
                  {relatedArticles.map((item) => (
                    <article key={item.href} className="related-post-item">
                      <Link href={item.href}>{item.title}</Link>
                      <p>{item.description}</p>
                      <small>{item.readTime}</small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <PostCta />
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
