import { queryGeneric } from 'convex/server'
import { v } from 'convex/values'

export const list = queryGeneric({
  args: { published: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_published', (q) =>
        args.published !== undefined ? q.eq('published', args.published) : q
      )
      .order('desc')
      .collect()
    return posts
  },
})

export const getBySlug = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('posts')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()
  },
})

export const getSiteSettings = queryGeneric({
  handler: async (ctx) => {
    return await ctx.db.query('siteSettings').first()
  },
})
