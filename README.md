# Portfolio Blog Starter

This is a porfolio site template complete with a blog. Includes:

- MDX and Markdown support
- Optimized for SEO (sitemap, robots, JSON-LD schema)
- RSS Feed
- Dynamic OG images
- Syntax highlighting
- Tailwind v4
- Vercel Speed Insights / Web Analytics
- Geist font

## Demo

https://portfolio-blog-starter.vercel.app

## How to Use

You can choose from one of the following two methods to use this repository:

### One-Click Deploy

Deploy the example using [Vercel](https://vercel.com?utm_source=github&utm_medium=readme&utm_campaign=vercel-examples):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/solutions/blog&project-name=blog&repository-name=blog)

### Clone and Deploy

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [pnpm](https://pnpm.io/installation) to bootstrap the example:

```bash
pnpm create next-app --example https://github.com/vercel/examples/tree/main/solutions/blog blog
```

Then, run Next.js in development mode:

```bash
pnpm dev
```

Deploy it to the cloud with [Vercel](https://vercel.com/templates) ([Documentation](https://nextjs.org/docs/app/building-your-application/deploying)).

## Audio with Vercel Blob

This project supports optional per-post audio through MDX frontmatter.

### 1) Add audio URL to a post

In `app/blog/posts/<slug>.mdx` frontmatter, add:

```md
audioSrc: "https://<your-blob-url>.public.blob.vercel-storage.com/<file>.mp3"
audioDuration: "12:34"
transcriptUrl: "https://<your-domain-or-doc>/transcript"
originalUrl: "https://medium.com/@you/your-post"
originalPlatform: "Medium"
```

If `audioSrc` is missing, the post shows `Audio version coming soon.`

### 2) Suggested frontmatter pattern

```md
---
title: "Your post title"
publishedAt: "2026-02-19"
summary: "Short summary"
published: true
audioSrc: "https://<blob-url>/<file>.mp3"
audioDuration: "12:34"
transcriptUrl: "https://example.com/transcripts/your-post"
originalUrl: "https://dev.to/you/your-post"
originalPlatform: "dev.to"
---
```

### 3) Vercel Blob upload flow (manual)

1. Open your Vercel project dashboard.
2. Go to **Storage** -> **Blob**.
3. Upload your MP3 file.
4. Copy the public Blob URL.
5. Paste it into `audioSrc` in the post frontmatter.

### Notes

- Use MP3 speech around `64-96 kbps` mono for good quality/size.
- Blob URLs can be used directly; no extra backend code is required.
- `audioDuration` and `transcriptUrl` are optional and render below the player.
- `originalUrl` and `originalPlatform` are optional and render as `Originally published on ...`.
