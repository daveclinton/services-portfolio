import { formatPostDate, getPosts } from "@/lib/blog"
import { ogContentType, ogImageSize, renderOgImage } from "@/lib/og-image"
import { site } from "@/lib/portfolio-data"

export const alt = `Article by ${site.name}`
export const size = ogImageSize
export const contentType = ogContentType

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const posts = await getPosts()
  const index = posts.findIndex((candidate) => candidate.slug === slug)
  const post = posts[index]
  if (!post) return renderOgImage({ title: site.name, tone: 0, art: "article" })

  return renderOgImage({
    title: post.title,
    // Counted from the oldest, so an article keeps its color as new ones arrive.
    tone: posts.length - 1 - index,
    note: formatPostDate(post.date),
    art: "article",
  })
}
