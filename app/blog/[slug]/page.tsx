import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ThemeToggle } from 'app/components/theme-toggle'
import { CustomMDX } from 'app/components/mdx'
import { ReaderModeToggle } from 'app/components/reader-mode-toggle'
import {
  formatDate,
  getPublishedBlogPosts,
  type BlogPost,
} from 'app/blog/utils'
import { absoluteUrl, siteConfig } from 'app/seo'

function byNewest(a: BlogPost, b: BlogPost) {
  if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
    return -1
  }
  return 1
}

function hasValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

type RecommendedRead = {
  title: string
  href: string
  source?: string
  note?: string
  isInternal: boolean
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

  const postUrl = absoluteUrl(`/blog/${post.slug}`)
  const previewImageUrl = post.metadata.image
    ? absoluteUrl(post.metadata.image)
    : absoluteUrl(`/og?title=${encodeURIComponent(post.metadata.title)}`)

  const recommendedReads: RecommendedRead[] = (post.metadata.recommendedReads || [])
    .map((item) => {
      const href = item.href || item.url
      return {
        ...item,
        href,
        isInternal: hasValue(href) && href.startsWith('/'),
      }
    })
    .filter((item): item is RecommendedRead => hasValue(item.href))
    .sort((a, b) => Number(b.isInternal) - Number(a.isInternal))
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
            <Link href="/blog" aria-current="page">blog</Link>
            <Link href="/work">work</Link>
            <Link href="/contact">contact</Link>
            <ReaderModeToggle iconOnly />
            <ThemeToggle />
          </nav>
        </header>

        <main className="post-layout" id="main-content">
          <article className="post-article">
            <header className="post-header">
              <h1>{post.metadata.title}</h1>
              <Link href="/blog">{formatDate(post.metadata.publishedAt)} - David Clinton</Link>
              <p className="post-subheading">{post.metadata.summary}</p>
            </header>

            <CustomMDX source={post.content} />

            {recommendedReads.length ? (
              <section className="recommended-reads" aria-label="Personal Reccomendations">
                <h3>Personal Reccomendations</h3>
                <div className="recommended-list">
                  {recommendedReads.map((item) => (
                    item.isInternal ? (
                      <Link
                        key={`${item.title}-${item.href}`}
                        className="recommended-item"
                        href={item.href}
                      >
                        <span className="recommended-item-title">
                          <span>{item.title}</span>
                        </span>
                        {item.source ? <small>{item.source}</small> : null}
                        {item.note ? <p>{item.note}</p> : null}
                      </Link>
                    ) : (
                      <a
                        key={`${item.title}-${item.href}`}
                        className="recommended-item"
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="recommended-item-title">
                          <span>{item.title}</span>
                        </span>
                        {item.source ? <small>{item.source}</small> : null}
                        {item.note ? <p>{item.note}</p> : null}
                      </a>
                    )
                  ))}
                </div>
              </section>
            ) : null}
          </article>
        </main>
      </div>
    </div>
  )
}
