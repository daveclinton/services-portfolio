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
5. **Ask an AI** — the `/ask-ai` page talks to this site's own API routes. See
   below.

## Ask AI

`/ask-ai` is a real retrieval-augmented chat, not a scripted demo. The browser
posts to `POST /api/chat`, reads the answer as Server-Sent Events, and streams
the answer text into the conversation.

```txt
browser  ──POST /api/chat───▶  Next.js route handler
                               ├─ retrieval over KnowledgeChunk (structured + semantic, RRF)
                               ├─ question intent → anchors, ordering, prompt guidance
                               ├─ citations resolved to Evidence rows
                               └─ OpenAI, grounded on those chunks only
browser  ◀── event: retrieval ─  (intent, strategies, notes)
         ◀── event: citations ─
         ◀── event: delta × n ─
         ◀── event: done ──────
```

The Next.js app owns all client-facing HTTP behavior:

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | Retrieve evidence and stream a grounded answer. |
| `POST /api/search` | Return ranked knowledge chunks and their evidence. |

Both routes query Postgres directly through `lib/knowledge/`. The browser uses
same-origin `/api/*` URLs; it needs no backend hostname or public API URL setting.

Before answering, the server classifies the question (biography, rates,
projects, outcomes, …) in `lib/knowledge/intent.ts`. That intent adds the files a
broad question must see, orders the retrieved chunks toward the evidence the
question asks for, and tells the model what shape of answer to write. The
`retrieval` frame carries the intent so the page can name what it is looking up
while the answer streams.

The Python code in `backend/` is an offline workspace for the knowledge and
model pipeline: ingestion, embedding generation, audits, retrieval evaluation,
and database migrations. It has no API, admin, or HTTP deployment.
`python manage.py runserver` is disabled. See [the pipeline guide](backend/README.md).

## Setup and deployment

Only the Next.js app needs to be deployed, on Vercel or another Node.js host.
The offline pipeline prepares the same Postgres database that the routes read.

### 1. Prepare the database

Use Postgres with the `vector` and `pg_trgm` extensions available. The Next.js
routes use Neon's HTTP driver, so the deployed database must support that driver.
Copy a direct connection string into `backend/.env` as `DATABASE_URL`.

```bash
cd backend
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
lives in `backend/database/migrations/` and retains its historical `api` app
label so existing migration records remain valid. No existing data or tables
need to be removed.

The Markdown knowledge base is a separate repository. Run these commands
locally or in a job with access to that checkout and the database; no Python web
service is needed. Existing workflows generate embeddings and evaluate
retrieval; there is currently no separate model-training command.

### 2. Configure and deploy Next.js

Copy `.env.example` to `.env.local` for local development. For Vercel, import
the repository with the root directory unchanged and set these server-only
variables for Production and Preview:

```dotenv
DATABASE_URL=postgresql://...   # the database prepared by the Python pipeline
OPENAI_API_KEY=sk-...
```

`OPENAI_API_KEY` is needed for grounded answers and semantic query embeddings.
Without it, search can fall back to structured retrieval and chat reports the
missing key when an answer would require generation.

`.vercelignore` excludes `backend/`; Python runs separately as command-line jobs.
Remove any old `NEXT_PUBLIC_API_BASE_URL` deployment variable; it is no longer
read. The former Fly.io/Python API deployment is no longer used by this app and
can be retired separately.

### 3. Smoke test

```bash
curl -sS https://<your-site>/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"mobile apps","mode":"structured","limit":5}'

curl -sS -N https://<your-site>/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"What does he work on at Mika?"}]}'
```

Expect a JSON search response and streamed `retrieval`, `citations`, `delta`,
and `done` events for chat. Then open `/ask-ai` and ask a question.

## Accessibility notes

Headings run `h1` (name) → `h2` (section labels) → `h3` (card titles) in order,
decorative icons are `aria-hidden`, every interactive element has a visible
focus ring, and the floating action keeps an accessible name when its label
folds away on small screens.

One deliberate tradeoff: `--subtle-foreground` is the reference's lightest tone
and sits around 2.4:1 against the page background, so it is limited to
decorative strokes. If you want every string to clear WCAG AA, darken that one
value (for example to `#7C776F`) and the muted text steps up with it.
