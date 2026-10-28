import type { MetadataRoute } from "next"
import { getPosts } from "@/lib/blog"
import { site } from "@/lib/portfolio-data"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts()

  return [
    { url: site.url },
    { url: `${site.url}/blog` },
    { url: `${site.url}/experience` },
    ...posts.map((post) => ({ url: `${site.url}/blog/${post.slug}` })),
  ]
}
