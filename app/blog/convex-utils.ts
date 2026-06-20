import { ConvexHttpClient } from 'convex/browser'
import type { Doc } from '../../convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function getPublishedBlogPosts() {
  return await convex.query('blog:list', { published: true })
}

export async function getBlogPostBySlug(slug: string) {
  return await convex.query('blog:getBySlug', { slug })
}

export async function getSiteSettings() {
  return await convex.query('blog:getSiteSettings', {})
}

export type BlogPost = Doc<'posts'>
