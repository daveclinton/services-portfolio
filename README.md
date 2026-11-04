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
5. **Ask an AI** — the `/ask-ai` page talks to the Go API in `backend/`. See
   below.

## Ask AI

`/ask-ai` is a real retrieval-augmented chat, not a scripted demo. The browser
posts to the Go API, reads the answer as Server-Sent Events, and streams the
answer text into the conversation.

```txt
browser ──POST /ask-ai/chat──▶ nginx ──▶ Go API in Docker (backend/)
                                         ├─ retrieval over KnowledgeChunk (structured + semantic, RRF)
                                         ├─ rules or model intent classifier
                                         ├─ citations resolved to Evidence rows
                                         └─ OpenAI, grounded on those chunks only
browser ◀── event: retrieval / citations / delta × n / done
```

Everything that needs a server lives in `backend/`, a single Go binary deployed
in Docker on a VPS behind nginx at `api.daveclintonn.cc`. The Next.js app only renders
pages (including the MDX blog) and needs one setting:

```dotenv
NEXT_PUBLIC_API_URL=https://api.daveclintonn.cc   # http://localhost:8080 locally
```

See `backend/README.md` for the API's layout, routes, rate limits and
environment variables, and the post
`content/blog/moving-my-portfolio-backend-to-go.mdx` for the full VPS setup.

Ask AI requires explicit conversation-storage consent before a question can be
sent. Opted-in questions and responses are stored in `knowledge_aiconversation`
and `knowledge_aiconversationturn` for 30 days, with only coarse device
categories and a daily rotating network hash. The API purges expired
conversations itself, and each browser-tab chat session triggers at most one
private Brevo email.

The Python code in `knowledge-backend/` is an offline workspace for the knowledge and model pipeline:
ingestion, embedding generation, audits, retrieval evaluation, and database
migrations. It has no HTTP deployment.

## Setup and deployment

Deploy the Next.js app to Vercel and the Go API to the VPS. The offline
pipeline prepares the Postgres database that the API reads.

### 1. Prepare the database

The database now runs next to the API in Docker (`pgvector/pgvector:pg17`,
see `backend/compose.yaml`) and creates its schema on first start, so the
migrations below are only needed for a database outside Docker. Copy a direct connection string into `knowledge-backend/.env` as `DATABASE_URL`.

```bash
cd knowledge-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL, KNOWLEDGE_BASE_PATH, OPENAI_API_KEY

python manage.py migrate
python manage.py ingest_knowledge --strict
python manage.py embed_knowledge
python manage.py audit_knowledge
```

Migrations create the required extensions and tables. The extension migration
lives in `knowledge-backend/database/migrations/` and retains its historical `api` app
label so existing migration records remain valid. No existing data or tables
need to be removed.

The Markdown knowledge base is in `professional-knowledge/`. Run these commands
locally or in a job with access to that folder and the database; no Python web
service is needed. Existing workflows generate embeddings and evaluate
retrieval; there is currently no separate model-training command.

### 2. Run locally

```bash
cd backend && cp .env.example .env
make up          # Postgres (pgvector) + API in Docker, API on :8080
make db-ingest   # load the knowledge base via ../knowledge-backend from backend/
cd .. && pnpm dev   # site on :3000
```

### 3. Deploy

```bash
# on the VPS, after cloning to /opt/services-portfolio and creating backend/.env
cd /opt/services-portfolio/backend && ./deploy/setup.sh   # see backend/README.md
```

Then set `NEXT_PUBLIC_API_URL` in Vercel and redeploy the site.

### 4. Smoke test

```bash
curl -sS https://api.daveclintonn.cc/healthz
curl -sS https://api.daveclintonn.cc/ask-ai/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"mobile apps","mode":"structured","limit":5}'
```

Then open `/ask-ai` and ask a question.

## Accessibility notes

Headings run `h1` (name) → `h2` (section labels) → `h3` (card titles) in order,
decorative icons are `aria-hidden`, every interactive element has a visible
focus ring, and the floating action keeps an accessible name when its label
folds away on small screens.

One deliberate tradeoff: `--subtle-foreground` is the reference's lightest tone
and sits around 2.4:1 against the page background, so it is limited to
decorative strokes. If you want every string to clear WCAG AA, darken that one
value (for example to `#7C776F`) and the muted text steps up with it.
