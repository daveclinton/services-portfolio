<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Browser & Web Navigation Rules
- **DO NOT** launch a headless browser (`--headless`, Puppeteer, Playwright) for simple content retrieval or data lookups.
- **Prefer API / Lightweight Fetch:** Always check if a direct URL fetch, search tool, or text-to-markdown dump (`--dump markdown`) can satisfy the request.
- **Avoid Bot Traps:** If a target site blocks raw requests or requires complex JS challenges, **stop and request human intervention** or switch to an active user session rather than bypassing via automated headless stealth flags.
