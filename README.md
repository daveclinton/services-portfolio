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
Server-Sent Events, and streams the answer text into the conversation.

```txt
browser  ──POST /api/ai/chat/──▶  Django
                                  ├─ retrieval over KnowledgeChunk (structured + semantic, RRF)
                                  ├─ citations resolved to Evidence rows
                                  └─ OpenAI, grounded on those chunks only
browser  ◀── event: delta × n ───
         ◀── event: done ────────
```

The backend still streams `retrieval` and `citations` frames (the Django API and
`/api/evidence/<slug>/` are unchanged), but the frontend drops them: the page
shows the answer only, with no source chips. Everything shown comes from the
curated knowledge base in `backend/knowledge/`.

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

The page is composer-only: no starter chips, no source chips — a visitor asks a
question and reads the answer.

## Deploying

Two pieces, two hosts: the Django API on **Fly.io**, the Next.js site on
**Vercel**. The browser calls the API directly, so the API must be reachable
over https and must allow the site's origin (CORS).

Order matters — database first, then API, then frontend.

### 1. Database

Create a Postgres that can run `CREATE EXTENSION vector` (Neon does; the first
migration, `backend/api/migrations/0001_enable_pgvector.py`, needs it). Copy the
**direct** (5432) connection string — not the pooled one — so migrations run.

### 2. Backend on Fly.io

```bash
cd backend
fly launch            # picks up fly.toml + Dockerfile, writes the app name

fly secrets set \
  SECRET_KEY="$(.venv/bin/python -c 'from django.core.management.utils import get_random_secret_key as k; print(k())')" \
  DEBUG=False \
  ALLOWED_HOSTS=<app>.fly.dev \
  CORS_ALLOWED_ORIGINS=https://<your-site>.vercel.app \
  DATABASE_URL='postgresql://...' \
  OPENAI_API_KEY=sk-...

fly deploy            # release_command runs `manage.py migrate`
fly open /api/health/ # expect {"status":"ok"}
```

| Secret | Why |
| :--- | :--- |
| `SECRET_KEY` | Required whenever `DEBUG=False`; the app refuses to boot without it. |
| `DEBUG` | Keep `False`. `fly.toml` already sets it. |
| `ALLOWED_HOSTS` | Comma-separated. Django answers 400 for any host not listed. |
| `CORS_ALLOWED_ORIGINS` | The frontend origins allowed to call the API, scheme + host, no trailing slash. |
| `DATABASE_URL` | Direct Neon URL. `POSTGRES_*` also works if you prefer. |
| `OPENAI_API_KEY` | Without it the API still answers, streaming an `error` explaining what is missing. |
| `CSRF_TRUSTED_ORIGINS` | Optional; defaults to `CORS_ALLOWED_ORIGINS`. |

The Markdown knowledge base is its own repository and is **not** copied into the
image, so the deployed database starts empty. Fill it from your machine:

```bash
cd backend
DATABASE_URL='postgresql://<direct-prod-url>' .venv/bin/python manage.py ingest_knowledge --strict
DATABASE_URL='postgresql://<direct-prod-url>' .venv/bin/python manage.py embed_knowledge
```

`ingest_knowledge --strict` is the pre-deploy gate (a broken knowledge-base
relationship fails it); `embed_knowledge` is what makes semantic retrieval
work.

### 3. Frontend on Vercel

Import the repo, keep the root directory, and set one variable for Production
*and* Preview **before** the first build:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<app>.fly.dev
```

`NEXT_PUBLIC_*` is inlined at build time, so changing it needs a redeploy, not
just a restart. `.vercelignore` keeps `backend/` out of the upload.

### 4. Smoke test

```bash
curl -sS -N -D - -X POST https://<app>.fly.dev/api/ai/chat/ \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://<your-site>.vercel.app' \
  -d '{"messages":[{"role":"user","content":"What does he work on at Mika?"}]}'
```

Expect `access-control-allow-origin: https://<your-site>.vercel.app` in the
headers and `event: delta` frames arriving progressively. Then open `/ask-ai` on
the deployed site and ask a question.

Notes: `fly.toml` keeps one machine warm (`min_machines_running = 1`,
auto-stop off) because a grounded answer holds a request open for the length of
the model stream. TLS and the http→https redirect happen at Fly's proxy, so
Django sets `SECURE_PROXY_SSL_HEADER` and leaves `SECURE_SSL_REDIRECT` alone
(setting it can send the health check into a redirect loop).

## Accessibility notes

Headings run `h1` (name) → `h2` (section labels) → `h3` (card titles) in order,
decorative icons are `aria-hidden`, every interactive element has a visible
focus ring, and the floating action keeps an accessible name when its label
folds away on small screens.

One deliberate tradeoff: `--subtle-foreground` is the reference's lightest tone
and sits around 2.4:1 against the page background, so it is limited to
decorative strokes. If you want every string to clear WCAG AA, darken that one
value (for example to `#7C776F`) and the muted text steps up with it.
