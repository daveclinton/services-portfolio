# SEO and Growth Reference

## 1. Publish consistently

- Aim for 1 strong post per week.
- Keep `published: true` only for polished posts.

## 2. Search Console and analytics setup

- Verify `daveclintonn.cc` in Google Search Console.
- Submit `https://daveclintonn.cc/sitemap.xml`.
- Track impressions/queries and iterate titles based on what ranks.

## 3. Title and description quality

- Title: keyword + clear hook.
- Meta description: 130-160 chars with a specific value promise.

## 4. Internal linking

- Add 2-5 internal links per post to related articles.
- Improve crawl depth and reader session duration.

## 5. Personal Reccomendations mix

- Include 1-2 internal links before external links when possible.
- Keep references relevant and high-quality.

## 6. Structured data (Article JSON-LD)

- Add per post:
  - `headline`
  - `author`
  - `datePublished`
  - `image`
  - `audio` (if available)
- Supports richer search appearance.

## 7. Canonical consistency

- Ensure each post has one canonical URL.
- For cross-posted content (Substack, Medium, dev.to), set canonical to your primary URL where possible.

## 8. Audio transcript strategy

- Add transcript links (`transcriptUrl`) or inline transcripts.
- Improves accessibility and adds indexable keyword content.

## 9. Performance and Core Web Vitals

- Compress images/media.
- Keep JS payload lean.
- Run Lighthouse and fix LCP/CLS regressions.

## 10. Distribution loop per post

- Share every post on LinkedIn and X.
- Post in relevant developer communities.
- Add a clear follow/subscribe CTA at the end of each article.

## 11. Backlink strategy

- Publish reference-style posts (benchmarks, guides, templates) that others can cite.
- Reach out through channels where you already have audience trust.

## 12. Topic cluster plan

- Focus on 3 core themes:
  - GPU performance and infrastructure
  - Platform operations and deployment
  - Warehouse/mobile systems
- Build 5-10 connected posts per theme and cross-link them.

## Recommended next implementations

1. Add Article JSON-LD on `/blog/[slug]`.
2. Add dynamic related posts.
3. Add a reusable end-of-post CTA block.

