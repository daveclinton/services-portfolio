import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { formatPostDate, getPostContent, getPosts } from "@/lib/blog"
import { site } from "@/lib/portfolio-data"

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const post = (await getPosts()).find((candidate) => candidate.slug === slug)
  if (!post) redirect("/blog")

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${slug}`,
      siteName: site.name,
      publishedTime: post.date,
      authors: [site.name],
    },
    twitter: {
      title: post.title,
      description: post.description,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params
  const post = (await getPosts()).find((candidate) => candidate.slug === slug)
  if (!post) redirect("/blog")
  const { default: Content } = await getPostContent(slug)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: `${site.url}/blog/${slug}`,
    image: `${site.url}/blog/${slug}/opengraph-image`,
    mainEntityOfPage: `${site.url}/blog/${slug}`,
    author: { "@type": "Person", "@id": `${site.url}/#person`, name: site.name, url: site.url },
  }

  return (
    <main className="home-story">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav className="blog-nav" aria-label="Breadcrumb">
        <Link href="/blog">← All writing</Link>
      </nav>

      <article className="blog-post">
        <header className="blog-post-header">
          <time dateTime={post.date}>
            {formatPostDate(post.date)} · {post.readingMinutes} min read
          </time>
          <h1>{post.title}</h1>
        </header>

        <div className="blog-prose">
          <Content />
        </div>

        <footer className="blog-post-footer">
          <p>
            Written by <Link href="/">{site.name}</Link>. If this was useful, you can{" "}
            <Link href="/blog">read more of my writing</Link>.
          </p>
        </footer>
      </article>
    </main>
  )
}
