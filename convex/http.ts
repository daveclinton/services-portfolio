import { httpRouter } from 'convex/server'
import type { HttpActionCtx } from 'convex/server'

const http = httpRouter()

http.route({
  path: '/seed-posts',
  method: 'POST',
  handler: async (ctx: HttpActionCtx, request: Request) => {
    const data = (await request.json()) as any

    if (!data.posts || !Array.isArray(data.posts)) {
      return new Response('Missing or invalid posts array', { status: 400 })
    }

    const results = []
    for (const post of data.posts) {
      const existing = await ctx.db
        .query('posts')
        .withIndex('by_slug', (q) => q.eq('slug', post.slug))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, post)
        results.push({ slug: post.slug, action: 'updated' })
      } else {
        await ctx.db.insert('posts', post)
        results.push({ slug: post.slug, action: 'created' })
      }
    }

    return new Response(JSON.stringify({ count: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})

export default http
