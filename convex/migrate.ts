import { mutationGeneric } from 'convex/server'
import { v } from 'convex/values'

export const seedPosts = mutationGeneric({
  args: {
    posts: v.array(
      v.object({
        title: v.string(),
        slug: v.string(),
        summary: v.string(),
        content: v.string(),
        publishedAt: v.string(),
        published: v.boolean(),
        tags: v.optional(v.array(v.string())),
        image: v.optional(v.string()),
        relatedPosts: v.optional(v.array(v.string())),
        recommendedReads: v.optional(
          v.array(
            v.object({
              title: v.string(),
              href: v.optional(v.string()),
              url: v.optional(v.string()),
              source: v.optional(v.string()),
              note: v.optional(v.string()),
            })
          )
        ),
        audioSrc: v.optional(v.string()),
        audioDuration: v.optional(v.string()),
        transcriptUrl: v.optional(v.string()),
        originalUrl: v.optional(v.string()),
        originalPlatform: v.optional(v.string()),
        substackUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = []
    for (const post of args.posts) {
      const existing = await ctx.db
        .query('posts')
        .withIndex('by_slug', (q) => q.eq('slug', post.slug))
        .first()

      if (existing) {
        // Update existing post
        await ctx.db.patch(existing._id, post)
        results.push({ slug: post.slug, action: 'updated' })
      } else {
        // Create new post
        await ctx.db.insert('posts', post)
        results.push({ slug: post.slug, action: 'created' })
      }
    }
    return results
  },
})

export const initSiteSettings = mutationGeneric({
  args: {
    siteName: v.string(),
    siteUrl: v.string(),
    defaultOgImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('siteSettings').first()
    if (existing) {
      await ctx.db.patch(existing._id, args)
      return 'updated'
    } else {
      await ctx.db.insert('siteSettings', args)
      return 'created'
    }
  },
})
