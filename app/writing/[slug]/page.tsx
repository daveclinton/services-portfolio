import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { WritingList } from "@/components/portfolio/writing-list"
import { getPosts } from "@/lib/blog"
import { sectionMetadata } from "@/lib/section"

// The last item of the list, after the articles.
const FOLLOW = { slug: "follow-along", title: "Follow along", description: "Follow new articles with the RSS feed." }

type Props = { params: Promise<{ slug: string }> }

// The Writing list opened on one article. Search engines keep the article itself.
const find = async ({ params }: Props) => {
  const { slug } = await params
  const posts = await getPosts()
  const index = posts.findIndex((post) => post.slug === slug)
  if (slug === FOLLOW.slug) return { item: FOLLOW, index: posts.length }
  if (index < 0) redirect("/blog")
  return { item: posts[index], index }
}

export async function generateStaticParams() {
  return [...(await getPosts()), FOLLOW].map((post) => ({ slug: post.slug }))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { item } = await find(props)
  return sectionMetadata({ title: item.title, description: item.description, path: `/writing/${item.slug}`, canonical: item === FOLLOW ? "/blog" : `/blog/${item.slug}` })
}

export default async function WritingItemPage(props: Props) {
  const { index } = await find(props)
  return <WritingList initial={index} />
}
