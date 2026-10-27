import type { Metadata } from "next"
import Link from "next/link"
import { formatPostDate, getPost, getPostContent, getPosts } from "@/lib/blog"
import { site } from "@/lib/portfolio-data"

// Only the posts in content/blog exist; anything else is a 404 rather than a runtime render.
export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
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
  const [post, { default: Content }] = await Promise.all([getPost(slug), getPostContent(slug)])

  return (
    <main className="home-story">
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
