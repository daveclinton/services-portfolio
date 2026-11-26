import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { cache, createElement, type ComponentType } from "react"
import { API_URL } from "./ai-client"

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

const getSlugs = cache(async () => {
  const files = await readdir(postsDirectory)
  return files.filter((file) => file.endsWith(".mdx")).map((file) => file.replace(/\.mdx$/, ""))
})

type StoredPost = Post & { legacy: boolean; markdown: string }
const publicContent = cache(async (pathname: string) => {
  if (!API_URL) return null
  const response=await fetch(`${API_URL}/blog/posts${pathname}`, { next: { revalidate: 30, tags: ["posts"] }, signal: AbortSignal.timeout(8000) })
  // A backend awaiting this migration may return 404. Other failures must throw
  // so ISR retains its last good page rather than dropping published articles.
  if(response.status===404)return null
  if(!response.ok)throw new Error("Published content is temporarily unavailable.")
  return await response.json()
})

export async function getPostContent(slug: string) {
  const catalogue=await publicContent("")
  const published=catalogue?.posts?.find((post:StoredPost)=>post.slug===slug)
  // Original MDX keeps its compiled interactive view. Only backend-authored
  // revisions need a body request; the shared catalogue already identifies them.
  if(published && !published.legacy) {
    const stored=await publicContent(`/${encodeURIComponent(slug)}`) as StoredPost | null
    if(!stored || typeof stored.markdown!=="string")throw new Error("Published content is temporarily unavailable.")
    const {PublishedPostContent}=await import("@/components/portfolio/published-post-content")
    return {metadata:stored,default:()=>createElement(PublishedPostContent,{slug,markdown:stored.markdown})}
  }
  return getLocalContent(slug)
}

const getLocalContent=cache(async (slug:string)=>{
  const mdx: { default: ComponentType; metadata: PostMetadata } = await import(
    `@/content/blog/${slug}.mdx`
  )
  return mdx
})

async function getReadingMinutes(slug: string) {
  const source = await readFile(path.join(postsDirectory, `${slug}.mdx`), "utf8")
  const words = source.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / wordsPerMinute))
}

export async function getPost(slug: string): Promise<Post> {
  const { metadata } = await getLocalContent(slug)
  return { ...metadata, slug, readingMinutes: await getReadingMinutes(slug) }
}

const getLocalPosts = cache(async (): Promise<Post[]> => {
  const posts = await Promise.all((await getSlugs()).map(getPost))
  return posts
    .filter((post) => !post.draft || process.env.NODE_ENV === "development")
    .sort((a, b) => b.date.localeCompare(a.date))
})

export const getPosts=cache(async ():Promise<Post[]>=>{
  const [local,remote]=await Promise.all([getLocalPosts(),publicContent("")])
  const posts=new Map(local.map((post)=>[post.slug,post]))
  if(Array.isArray(remote?.posts)) for(const value of remote.posts) {
    if(typeof value.slug==="string"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)&&typeof value.title==="string"&&typeof value.description==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value.date)&&Number.isSafeInteger(value.readingMinutes)&&value.readingMinutes>0)posts.set(value.slug,value)
  }
  // The bundled copy of an unpublished or deleted article must stay hidden too.
  if(Array.isArray(remote?.removed)) for(const slug of remote.removed) posts.delete(slug)
  return [...posts.values()].sort((a,b)=>b.date.localeCompare(a.date))
})

export { formatPostDate } from "./blog-format"
