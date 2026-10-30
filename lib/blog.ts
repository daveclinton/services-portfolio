import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { ComponentType } from "react"

export type PostMetadata = {
  title: string
  description: string
  date: string
  draft?: boolean
}

export type Post = PostMetadata & {
  slug: string
  readingMinutes: number
}

const postsDirectory = path.join(process.cwd(), "content/blog")
const wordsPerMinute = 230

async function getSlugs() {
  const files = await readdir(postsDirectory)
  return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""))
}

export async function getPostContent(slug: string) {
  const mdx: { default: ComponentType; metadata: PostMetadata } = await import(
    `@/content/blog/${slug}.mdx`
  )
  return mdx
}

async function getReadingMinutes(slug: string) {
  const source = await readFile(path.join(postsDirectory, `${slug}.mdx`), "utf8")
  const words = source.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / wordsPerMinute))
}

export async function getPost(slug: string): Promise<Post> {
  const { metadata } = await getPostContent(slug)
  return { ...metadata, slug, readingMinutes: await getReadingMinutes(slug) }
}

export async function getPosts(): Promise<Post[]> {
  const posts = await Promise.all((await getSlugs()).map(getPost))
  return posts
    .filter((post) => !post.draft || process.env.NODE_ENV === "development")
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function formatPostDate(date: string, month: "short" | "long" = "long") {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  })
}
