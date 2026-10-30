import type { MetadataRoute } from "next"
import { getPosts } from "@/lib/blog"
import { site } from "@/lib/portfolio-data"

function absoluteUrl(path: string) {
  return path === "/" ? site.url : `${site.url}${path}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts()
  const latestPost = posts[0]?.date

  return [
    { url: absoluteUrl("/"), lastModified: latestPost },
    { url: absoluteUrl("/blog"), lastModified: latestPost },
    { url: absoluteUrl("/experience") },
    { url: absoluteUrl("/ask-ai") },
    { url: absoluteUrl("/privacy") },
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.date,
    })),
  ]
}
