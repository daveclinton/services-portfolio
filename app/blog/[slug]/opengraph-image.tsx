import { getPosts } from "@/lib/blog"
import { ogImageSize, renderOgImage } from "@/lib/og-image"
import { site } from "@/lib/portfolio-data"

export const alt = `Blog post by ${site.name}`
export const size = ogImageSize
export const contentType = "image/png"

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = (await getPosts()).find((candidate) => candidate.slug === slug)

  return renderOgImage({
    title: post?.title ?? site.name,
    subtitle: post?.description ?? site.description,
  })
}
