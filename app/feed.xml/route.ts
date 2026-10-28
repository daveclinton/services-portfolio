import { getPosts } from "@/lib/blog"
import { site } from "@/lib/portfolio-data"

export const dynamic = "force-static"

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const posts = await getPosts()
  const items = posts.map((post) => {
    const url = `${site.url}/blog/${post.slug}`

    return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(url)}</link>
  <guid isPermaLink="true">${escapeXml(url)}</guid>
  <description>${escapeXml(post.description)}</description>
  <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
</item>`
  }).join("\n")

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(`${site.name} — Writing`)}</title>
  <link>${site.url}/blog</link>
  <description>${escapeXml(site.description)}</description>
  <language>en</language>
${items}
</channel>
</rss>`

  return new Response(feed, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })
}
