import { ConvexHttpClient } from 'convex/browser'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!
const convex = new ConvexHttpClient(CONVEX_URL)

export interface BlogPost {
  _id: string
  title: string
  slug: string
  summary: string
  content: string
  publishedAt: string
  published: boolean
  tags?: string[]
  image?: string
  relatedPosts?: string[]
  recommendedReads?: Array<{
    title: string
    href?: string
    url?: string
    source?: string
    note?: string
  }>
  audioSrc?: string
  audioDuration?: string
  transcriptUrl?: string
  originalUrl?: string
  originalPlatform?: string
  substackUrl?: string
}

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const result = await convex.query('blog:list' as any, { published: true })
    return result as BlogPost[]
  } catch (error) {
    console.error('Failed to fetch published posts:', error)
    return []
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const result = await convex.query('blog:getBySlug' as any, { slug })
    return (result as BlogPost) || null
  } catch (error) {
    console.error(`Failed to fetch post ${slug}:`, error)
    return null
  }
}

export async function getSiteSettings() {
  try {
    return await convex.query('blog:getSiteSettings' as any, {})
  } catch (error) {
    console.error('Failed to fetch site settings:', error)
    return null
  }
}
