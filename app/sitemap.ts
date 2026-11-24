import type { MetadataRoute } from "next"
import { getPosts } from "@/lib/blog"
import { backgroundItems, site } from "@/lib/portfolio-data"
import { signals } from "@/lib/signals"

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
    // Home's first item is the page itself.
    ...signals.slice(1).map((item) => ({ url: absoluteUrl(`/${item.slug}`) })),
    ...backgroundItems.map((role) => ({ url: absoluteUrl(`/experience/${role.slug}`) })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.date,
    })),
  ]
}
