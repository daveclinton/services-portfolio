# Portfolio

A single-column portfolio homepage built with Next.js (App Router), Tailwind CSS v4,
and shadcn/ui primitives. The visual language comes from a Figma reference:
warm neutral palette, rounded beige cards, a quiet type scale, and one dark
pill call to action.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm lint
```

## Structure

```
app/
  globals.css          design tokens (colour, radius, type scale) + base layer
  layout.tsx           font loading, metadata, document shell
  page.tsx             section composition only
components/
  ui/                  shadcn primitives (button, card, avatar, badge, tooltip, separator)
  portfolio/           domain compositions (header, featured card, timeline, links, ...)
lib/
  portfolio-data.ts    every string and link the page renders
  utils.ts             cn(), extended with the project's custom type scale
```

`app/page.tsx` stays small on purpose: it lists sections in order and nothing
else. Layout lives in the section components, copy lives in `lib/portfolio-data.ts`.

## Design tokens

All colours are declared once in `app/globals.css` and mapped onto the shadcn
variables, so primitives in `components/ui` inherit the palette.

| Token | Value | Used for |
| --- | --- | --- |
| `--background` | `#FBFAF7` | page |
| `--card` / `--muted` | `#F1EEE7` | cards, link rows |
| `--foreground` | `#1D1C1A` | primary text, CTA pill |
| `--muted-foreground` | `#6F6B64` | body text, labels |
| `--subtle-foreground` | `#A8A39B` | decorative icons and strokes |
| `--border` | `#E9E4DA` | hairlines, dividers |
| `--accent-green` | `#4F9A6A` | featured artwork accent |

`--radius: 1.25rem` makes `rounded-xl` resolve to the reference's 28px card
radius. The custom type scale (`text-name`, `text-title`, `text-body`,
`text-caption`, `text-label`) is registered with `cn` in `lib/utils.ts` so class
merging treats it as font size rather than colour.

## Swapping in real content

1. **Copy and links** — edit `lib/portfolio-data.ts`.
2. **Avatar** — drop a photo in `public/` and set `profile.avatarSrc`.
3. **Featured artwork** — replace `FeaturedVisual` in
   `components/portfolio/featured-project-card.tsx` with a real screenshot.
4. **Font** — the reference's `Natadecoco` is not bundled. The page loads Zen
   Maru Gothic as the closest available stand-in; if you license the real file,
   put it in `public/fonts/` and switch `app/layout.tsx` to `next/font/local`
   using the same `--font-portfolio-sans` variable.
5. **Ask an AI** — the `/ask-ai` page talks to the Django backend. See below.

## Ask AI

`/ask-ai` is a real retrieval-augmented chat, not a scripted demo. The browser
posts to `POST /api/ai/chat/` on the Django backend, reads the answer as
Server-Sent Events, and renders the evidence behind each reply.

```txt
browser  ──POST /api/ai/chat/──▶  Django
                                  ├─ retrieval over KnowledgeChunk (structured + semantic, RRF)
                                  ├─ citations resolved to Evidence rows
                                  └─ OpenAI, grounded on those chunks only
browser  ◀── event: citations ───
         ◀── event: delta × n ───
         ◀── event: done ────────
```

Every answer carries a **Sources** strip. Each chip links to `/evidence/<slug>`,
a page that renders that `Evidence` row — its claim, confidence, type, linked
project/company and the original source URL. That round trip is the point: an
answer you cannot check is not worth generating.

Point the browser at the backend with `NEXT_PUBLIC_API_BASE_URL` (defaults to
`http://localhost:8000`):

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

The backend needs `OPENAI_API_KEY` for the grounded answer itself (see
`backend/.env.example`). Without it the UI still works — the server streams an
`error` event explaining what is missing, and retrieval-only features such as
`/api/ai/search/` and `/api/ai/job-fit/` keep working.

The starter questions in `askAi.suggestions` (`lib/portfolio-data.ts`) are
chosen because the knowledge base can actually answer them.

## Accessibility notes

Headings run `h1` (name) → `h2` (section labels) → `h3` (card titles) in order,
decorative icons are `aria-hidden`, every interactive element has a visible
focus ring, and the floating action keeps an accessible name when its label
folds away on small screens.

One deliberate tradeoff: `--subtle-foreground` is the reference's lightest tone
and sits around 2.4:1 against the page background, so it is limited to
decorative strokes. If you want every string to clear WCAG AA, darken that one
value (for example to `#7C776F`) and the muted text steps up with it.
