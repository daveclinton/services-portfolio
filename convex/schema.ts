import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    summary: v.string(),
    content: v.string(), // MDX content
    publishedAt: v.string(),
    published: v.boolean(),
    tags: v.optional(v.array(v.string())),
    image: v.optional(v.string()),
    relatedPosts: v.optional(v.array(v.string())), // array of slugs
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
    .index('by_published', ['published', 'publishedAt'])
    .index('by_slug', ['slug']),

  siteSettings: defineTable({
    siteName: v.string(),
    siteUrl: v.string(),
    defaultOgImage: v.optional(v.string()),
  }),
})
