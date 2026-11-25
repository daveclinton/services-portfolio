# Portfolio API (Go)

The backend for www.daveclintonn.cc. It's one Go binary that serves every
product built on the VPS, plus its own Postgres with pgvector and a self-hosted
embeddings server (Hugging Face Text Embeddings Inference), all in Docker.
The same `compose.yaml` runs on your laptop and on the VPS, where the existing
nginx handles TLS and proxies to the API on loopback.

```
browser ──https──▶ nginx (api.daveclintonn.cc) ──▶ portfolio-api (127.0.0.1:API_PORT) ──▶ portfolio-db (pgvector)
                                                                     └──▶ OpenAI (answers, embeddings), Sendy
```

## Layout

```
cmd/api/              main: config, database pool, HTTP server, graceful shutdown
internal/config/      environment variables, validated once at startup
internal/server/      shared middleware (CORS, logging, panic recovery) and /healthz
internal/httpx/       JSON, bounded body reading, client IP, UUIDs, Server-Sent Events
internal/ratelimit/   in-memory sliding-window limits and per-visitor locks
internal/visitor/     signed anonymous visitor cookie and HMAC hashing
internal/openai/      chat streaming and structured output (answers and intent planning)
internal/embeddings/  client for the self-hosted Text Embeddings Inference server
internal/sendy/       Sendy delivery, local subscriber/campaign storage and shared email rendering
internal/newsletter/  independent double-opt-in newsletter signup and limits
internal/studio/      owner authentication, durable newsletter drafts and delivery
internal/askai/       product: Ask AI (retrieval, intent, generation, conversation logs)
db/init/              schema (from knowledge-backend migrations), applied on first start
deploy/setup.sh       VPS setup: free ports, docker compose, nginx site, TLS
deploy/import-db.sh   copy data from another Postgres (e.g. Neon) into the container
deploy/update.sh      routine API-only deploy and public health check
deploy/github-ssh.sh  restricted GitHub deployment entry point
deploy/install-github-deploy.sh  one-time authorization of the Actions SSH key
Dockerfile, compose.yaml
```

To add a product, create `internal/<product>/` with a `Routes(*http.ServeMux)`
method and pass it to `server.New` in `cmd/api/main.go`.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /healthz` | Liveness and database check |
| `POST /ask-ai/chat` | Grounded answer, streamed as SSE (`retrieval`, `citations`, `delta`, `done`, `error`) |
| `POST /ask-ai/search` | Ranked knowledge chunks with evidence citations |
| `GET /newsletter/status` | Whether newsletter provisioning has completed |
| `POST /newsletter/subscribe` | Request an email confirmation; does not enroll directly |

Newsletter consent and campaigns live in this application's PostgreSQL database.
Sendy is the delivery transport, using its [JSON:API](https://usesendy.com/docs/api/send-email)
and [job-status API](https://usesendy.com/docs/api/email-status). No provider contacts,
lists, templates or campaigns are created.

`POST /newsletter/subscribe` accepts bounded JSON with an email and `consent: true`.
It returns HTTP 202 with `pending`, `subscribed`, or `suppressed`. Pending readers
receive a signed 48-hour confirmation link at `NEWSLETTER_PUBLIC_API_URL`.
`GET /newsletter/confirm` validates the link, records confirmation locally, and
redirects to `SITE_URL/subscribe/confirmed`. `GET /newsletter/unsubscribe` records a
permanent opt-out locally and shows the result. Old confirmation links never restore
an opt-out. Preference links work even while new signup and delivery are disabled.

The worker initializes local storage without sending email, then delivers due
campaigns to confirmed subscribers through Sendy, one recipient per request.
The same email is retried with the same idempotency key after an uncertain result.
In addition to per-process abuse limits, confirmation cooldown is enforced in the
database across API instances. `GET /newsletter/status` enables signup only when
local setup succeeds and Sendy credentials/sender are configured.

Chat accepts an optional `workflow`: `chat` (default), `role_fit` (a pasted job
description comparison), `interview` (an evidence-grounded interview brief), or
`project_scope` (a proposed project brief and subsequent refinements).
The same retrieval and generation pipeline handles each; no hiring score or
automated hiring decision is produced. Public, confirmed evidence links are
included in `citations` for the frontend to display.

Project discovery gathers six bounded answers locally, then submits the reviewed
answers through the same chat endpoint and storage-consent checks. The workflow
permits clearly labelled future recommendations while keeping claims about David
grounded in verified work. Budgets and dates supplied by visitors are preferences,
not commitments. Successful scoping qualifies as contact interest for the existing
optional notifications; failed or evidence-only replies do not.

Clients can opt in with `interactive: true`. The same answer-generation call uses
strict structured output with `answer` first and a bounded `view` second. The API
decodes complete JSON string units into ordinary `delta` events while streaming,
then emits `view` before `done` only after successful generation and validation.
Interactive prose is a short summary with essential caveats; detailed content
lives in the result opened by the visitor. Complete generated view text is also
included in the existing consented conversation record for quality review and
owner notifications, while plain clients continue to receive full prose.
Allowed views are text, projects, comparison, architecture, timeline and scope;
scope requires the project-scoping workflow. Views reference evidence by index;
the server hydrates excerpts, confirmed public links and available review dates
from its own records. Missing references, undated timeline entries and dangling
diagram connections are removed. Unsupported diagrams fall back to prose.

`interactionContext` accepts at most 4,000 Unicode characters for a selected item
or reviewed brief. It is lower-trust visitor data in retrieval/generation and is
stored with the consented question, not promoted to evidence or policy. The UI
keeps at most 400 characters per edited section. Existing request/context byte
limits still apply. Plain clients remain compatible; interactive answers require
a chat model supporting strict JSON-schema output and have a 2,600-token output
ceiling. No second model call is added to generate views or follow-up suggestions.

The `status` events planning, retrieving, writing and formatting bracket actual
work. Retrieval errors after streaming begins use `error` followed by `done`;
provider outages retain labelled evidence-only responses. Deploy the API before
the frontend, then validate a generated view and a saved-edit follow-up.

`done.finish_reason=evidence_only` means generation is unavailable and the
response consists of labelled knowledge excerpts, not a model-generated answer.
Billing/credential failures pause provider traffic for a cooldown and permit
one recovery probe. See the root README for notification controls and provider
billing setup; the application request counter is not a prepaid-credit balance.

## How answers are built

Every answer gets the whole knowledge base (~34k tokens) plus
`internal/askai/site_facts.md` as a fixed prompt prefix, separate from the system
policy and encoded as reference data. OpenAI's prompt
caching serves at a discount (`cached_tokens` in the "answer generated" log).
Hybrid retrieval still runs to rank likely-relevant documents and fill the
`citations` event. The answer policy lives in `internal/askai/generation.go`;
check changes with `evals/` (see its README).

## Embeddings

Semantic search vectors live in our own Postgres (`askai_chunk_embedding`,
pgvector). The API creates the table, embeds new or changed knowledge chunks
at startup and every 5 minutes, and rebuilds the table if the model's
dimensions change. `EMBEDDINGS_PROVIDER` picks where vectors come from:

- `openai` (default with `OPENAI_API_KEY`): `text-embedding-3-small`, 1536
  dimensions. Indexing the whole knowledge base takes seconds and costs well
  under a cent; no extra server memory.
- `tei`: the optional self-hosted `embeddings` service (Hugging Face Text
  Embeddings Inference, `BAAI/bge-small-en-v1.5`). Needs ~500 MB of free RAM;
  switch it on with the lines in `.env.example`.
- `off`: Postgres full-text search only.

Every answer gets the whole knowledge base anyway, so semantic search mostly
improves which documents are ranked as relevant. `knowledge-backend`'s
`embed_knowledge` command and the OpenAI vector store are no longer used.

## Develop

### Newsletter writing dashboard

The frontend routes are `/admin/posts` and `/admin/newsletters`;
`/admin/writing` redirects to Posts. The existing OAuth callback returns to
Newsletters, preserving its login result. Preview lives in the fixed editor
header; only the document scrolls. The private shell reuses the neutral palette,
blue primary actions, favicon, glass surfaces and profile menu.

Posts and newsletters are separate document kinds in PostgreSQL. Post drafts
autosave with revision checks. Publishing asks for a URL, a summary, then review;
the API snapshots the confirmed revision transactionally. Later autosaves do not
change the public version. Published posts can be reopened and updated at their
existing URL. Creating a newsletter selects a published post; the API copies its
title, summary and canonical link into a new editable document. Publishing and
creating that draft do not send email. Tests, immediate delivery and scheduling
still use the existing reviewed delivery flow and durable campaign worker.

The initial migration imports the 14 published repository articles once from
`internal/studio/posts.json`; restarts never overwrite owner edits. Their original
MDX views stay intact until republishing. Imported images, video links, model/flow
visuals, chat and study asides survive in portable Markdown blocks. These blocks
restore only an allowlist of existing React components; database MDX is never
executed. Tables remain in source mode in the current editor to preserve content.
Regenerate the trusted seed with `node backend/scripts/import-posts.mjs` from the
repository root when preparing a new import, not to overwrite published records.

Image selection, paste and drop upload through the owner/CSRF-protected API.
PNG/JPEG/GIF files are limited to 5 MB and 16 megapixels, decoded on the server,
deduplicated by SHA-256 and stored in PostgreSQL with the normal backups. Public
image responses use immutable caching and ETags. HTTPS is required in production.
[Cloudinary signed uploads](https://cloudinary.com/documentation/upload_images)
were evaluated; this release reuses existing durable storage without requiring
another service/account. A large media library would warrant object storage/CDN
offload. No new package was added for uploads.

The actual email preview, tests and campaigns share the backend renderer and
existing email shell. Raw HTML is rejected; template expressions are escaped.

The UX reference is [Ghost's newsletter flow](https://ghost.org/help/delivering-emails/)
and its [publishing/scheduling controls](https://ghost.org/help/publishing-content/).
Source reviewed: Ghost's MIT-licensed
[publish flow](https://github.com/TryGhost/Ghost/blob/main/apps/admin/src/editor/publish/publish-flow-modal.tsx)
and [email preview](https://github.com/TryGhost/Ghost/blob/main/apps/admin/src/editor/preview/email-preview.tsx).
[listmonk](https://github.com/knadh/listmonk) was compared for campaign lifecycle
handling, without copying its AGPL code. The rich editor uses existing Tiptap
with [Novel's document controls](https://github.com/steven-tey/novel/blob/main/apps/web/components/tailwind/advanced-editor.tsx)
as a reference. Goldmark (MIT) and Go's OAuth2 client
(BSD-3-Clause) are included with their license notices in the API image.

#### Public publishing and performance rollout

Deploy the API before this frontend: the desk now reads its catalogue and draft
summaries from `GET /admin/newsletters/bootstrap`. Owner verification and the list
load take one HTTP request; bodies load only when opening a document. An index
supports the limited, ordered draft query, and reading time is computed on
publication rather than rescanning post bodies for every catalogue request.
`Server-Timing: db` and the existing duration logs expose server processing time.

Public `/blog/posts` and `/blog/posts/{slug}` supply the blog, metadata, feed and
sitemap. Next caches public reads with a 30-second ISR interval and the `posts`
tag. Set the same private `CONTENT_REVALIDATION_SECRET` (32+ characters) in both
the frontend environment and `backend/.env` for immediate cache invalidation.
After committing publication, the API releases its database connection and calls
`POST /api/content/revalidate` with that secret. The call has a two-second deadline;
publication stays saved if it fails, and ISR is the fallback. The response reports
cache invalidation, not a guarantee that every visitor has refreshed. Next's
[in-flight cache invalidation race](https://github.com/vercel/next.js/issues/102007)
can still allow an older in-flight render to finish; the short ISR interval is
the recovery path. Failed API reads
retain the last good ISR page instead of silently removing database articles.

Posts can be unpublished (draft, URL and original date are kept), have unpublished
edits discarded, or be deleted. Deleting records the URL in `studio_deleted_posts`
so a restart never imports a versioned article again. `/blog/posts` lists both
kinds in `removed`, and the site hides its bundled MDX copy. Newsletters can be
deleted only before delivery. All three actions use the document lock, CSRF and
the saved revision.

The desk remembers lists in browser memory, preloads the other section and
documents under the pointer, and requests its data before JavaScript loads.
Preflights are cached for two hours, the longest Chromium allows.

**Existing VPS nginx configuration needs a one-time update for uploads.**
`deploy/update.sh` updates the API container, not nginx. Regenerate the managed
site config using the updated setup workflow, or add an exact
`location = /admin/newsletters/media` with the same proxy headers/upstream and
`client_max_body_size 6m`, leaving other requests at `64k`. Run `nginx -t` before
reloading. `deploy/setup.sh` now generates this split and enables gzip only on
public `/blog/` JSON; private owner responses and SSE stay uncompressed.

Measured without a browser on the local production build: initial admin route
chunks fell from 497,161 to about 204,000 gzip bytes after deferring the editor.
With 100 large test drafts, the old list returned 3,831,213 bytes; bootstrap,
including the published catalogue, returned 35,237 bytes. This is payload/bundle
evidence, not a claim about production Core Web Vitals. A production session GET
took 0.82 s on a fresh connection versus 0.22–0.27 s reused; the admin now hints
the API connection early and uses client navigation instead of full reloads.

Research: [Next lazy loading](https://nextjs.org/docs/app/guides/lazy-loading),
[fetching/caching](https://nextjs.org/docs/app/getting-started/fetching-data),
[cache invalidation](https://nextjs.org/docs/app/api-reference/functions/revalidateTag),
[TTFB diagnosis](https://web.dev/articles/optimize-ttfb),
[ordered PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes-ordering.html),
[nginx upload limits](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size),
[compression](https://nginx.org/en/docs/http/ngx_http_gzip_module.html), and
[glass/accessibility fallback](https://developer.chrome.com/blog/css-prefers-reduced-transparency/).

#### One-time owner setup

1. Create an OAuth app under [GitHub developer settings](https://github.com/settings/developers).
   Set its homepage to `https://www.daveclintonn.cc` and authorization callback to
   `https://api.daveclintonn.cc/admin/newsletters/auth/callback`.
   The login uses PKCE and public identity; it requests no repository scopes.
2. Set these values in the VPS `backend/.env` (keep the secret server-side):

   ```dotenv
   NEWSLETTER_GITHUB_CLIENT_ID=your_oauth_client_id
   NEWSLETTER_GITHUB_CLIENT_SECRET=your_oauth_client_secret
   NEWSLETTER_GITHUB_OWNER_ID=83610935
   NEWSLETTER_OAUTH_CALLBACK_URL=https://api.daveclintonn.cc/admin/newsletters/auth/callback
   NEWSLETTER_TEST_EMAIL=your_test_email_address
   ```

   `83610935` is the numeric ID of `daveclinton`; a different owner must supply
   their own ID. `SITE_URL` must exactly match the frontend origin
   (`https://www.daveclintonn.cc` in production). Keep the existing
   `RATE_LIMIT_SECRET` at least 32 characters long. Rotating it invalidates sessions.
3. Configure `SENDY_API_KEY`, `SENDY_SENDER_EMAIL`, and `SENDY_SENDER_NAME`.
   Verify the sender domain following [Sendy's setup](https://usesendy.com/docs),
   and ensure the account has credits. Set `NEWSLETTER_PUBLIC_API_URL` to the public
   API origin (`https://api.daveclintonn.cc` here).
   Signup, scheduling and operational alerts are enabled automatically;
   no boolean environment switches are needed.
   Only `NEWSLETTER_TEST_EMAIL` receives dashboard tests; it need not be a subscriber.
   Keep `RATE_LIMIT_SECRET` stable: it also signs confirmation and unsubscribe links.
4. After deploying the code, recreate the API with the updated environment:

   ```bash
   cd /opt/services-portfolio/backend
   docker compose up -d --build --no-deps --force-recreate --wait api
   curl -fsS https://api.daveclintonn.cc/healthz
   ```

   Open `https://www.daveclintonn.cc/admin/posts` and sign in as the owner.
   API startup initializes `newsletter_studio_*`, `newsletter_subscribers`,
   `newsletter_campaigns`, and `newsletter_deliveries` idempotently; include all in backups. No campaign is sent during setup.
   For local development, use a separate OAuth app with a localhost API callback,
   local `SITE_URL` and `NEXT_PUBLIC_API_URL`; do not reuse a production callback.

#### Access and delivery behavior

All `/admin/newsletters/*` API routes except session/login/callback require an
eight-hour, HttpOnly owner cookie. Authorization checks the numeric GitHub ID on
every request. Writes require the exact frontend Origin and a session CSRF token.
GitHub access tokens are not stored. The frontend route is excluded from indexing;
the API, rather than the frontend route, enforces access to private data.

Draft content uses optimistic revisions; editing and delivery share a database
lock. Campaign IDs and pending operations are committed before external actions.
Each local campaign has the stable name `portfolio-newsletter/<draft UUID>` and
snapshots confirmed subscribers when delivery starts. Pending and suppressed
addresses are excluded; each unsent recipient is checked again for opt-out.
Personalized email content and per-recipient keys are durable, so a process restart
or lost response cannot create a new send identity. Sendy enforces its own bounce
and complaint suppression; job polling also records those opt-outs locally.

**Submitted for delivery** means the local queue is processing. **Sent** requires
provider acceptance for all attempted recipients; it is not proof of inbox delivery.
Use **Check status** to refresh the dashboard. Credits exhaustion and temporary
service failures retry the unchanged request later; permanent job failures stop
the campaign from being marked sent. Review Sendy's Emails and credits views for
provider details. Scheduling/cancellation are local database operations; cancellation
is available only before the scheduled time and before delivery starts.

#### Subscriber migration

Before switching production, export confirmed members with their original consent
records, plus unsubscribed and blocked addresses. Normalize the export to UTF-8 CSV:

```csv
email,status,confirmed_at
confirmed@example.com,subscribed,2026-09-01T12:00:00Z
optout@example.com,suppressed,
pending@example.com,pending,
```

Only mark a row `subscribed` when you have its confirmation evidence; its RFC3339
consent timestamp is required. Use `suppressed` for any unsubscribe or blocked
address. Suppression takes precedence regardless of import order or existing data;
importing active rows never restores an opt-out. Pending rows remain unconfirmed.
The importer runs atomically and sends no emails. Repeated imports merge by email.

Run with the target `DATABASE_URL` available in the environment:

```bash
cd backend
go run ./cmd/newsletter-import -file /secure/path/subscribers.csv
```

Back up the database first. Stop old campaigns and cancel old scheduled sends before
cutover, then import the final export (including late opt-outs), configure Sendy,
and recreate the API with the new environment. Existing external campaign IDs are
quarantined as historical data; they are never reused as local IDs. Old drafts that
have no provider campaign or outstanding operation remain editable. Review any old
scheduled campaign directly with the previous provider. After validating Sendy and
the imported counts, revoke the old provider credential in its account and remove
old `BREVO_*` settings from deployment secret stores. Historical blog/experience
references are retained as factual records.

No production list or credentials are migrated automatically by this code change.
The previous provider's pending confirmation links cannot confirm local membership;
those readers should request a new confirmation through the portfolio signup.

#### Validation without a browser or live sends

`make test` covers the provider adapter, renderer, configuration and existing
products. The frontend suite includes server rendering and API contract checks.
The database suite uses randomly named, temporary schemas and fake GitHub/Sendy
servers; run it against a local test database, never production:

```bash
NEWSLETTER_STUDIO_TEST_DATABASE_URL='postgresql://local-test-database' go test -race ./internal/studio ./internal/sendy -count=1 -v
```

It covers owner/CSRF checks, OAuth PKCE and single-use state, persistent drafts,
revision conflicts, shared action locks, tests, scheduling/cancellation, provider
refusals and restart recovery without duplicate broadcasts. Live account delivery
and inbox rendering still require an owner test after configuration.

### Local development

```bash
cp .env.example .env    # add OPENAI_API_KEY for chat; on Apple Silicon set EMBEDDINGS_IMAGE (see the file)
make up                 # Postgres (:5433) and the API (:8080)
make db-ingest          # load the knowledge base with ../knowledge-backend
make test
```

Instead of `make db-ingest`, you can copy everything from the old database with
`make db-import SOURCE_URL='postgresql://...neon...'`. `make psql` opens a
shell on the database, `make run` runs the API with `go run` against it, and
`make down` stops everything (data stays in the `pgdata` volume).

In the portfolio, set `NEXT_PUBLIC_API_URL=http://localhost:8080` in `.env.local`.

## Deploy (Docker + nginx)

Before the first deploy:

1. Point an `A` record for `api.daveclintonn.cc` at the VPS IP.
2. Check the VPS has Docker with the compose plugin, nginx and certbot:
   `docker compose version && nginx -v && certbot --version`
   (`sudo apt install -y certbot` if it's missing).
3. Give the VPS read access to the private repo with its own deploy key and
   SSH host alias, so it never clashes with other GitHub keys on the server:

   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_services_portfolio -N "" -C "vsvr40: services-portfolio deploy key"
   cat >> ~/.ssh/config <<'EOF'

   Host github-services-portfolio
       HostName github.com
       User git
       IdentityFile ~/.ssh/github_services_portfolio
       IdentitiesOnly yes
   EOF
   chmod 600 ~/.ssh/config
   cat ~/.ssh/github_services_portfolio.pub
   ```

   Add that public key under the repo's **Settings → Deploy keys** (read-only),
   then check with `ssh -T git@github-services-portfolio`.

### 1. Create the directory and clone

```bash
sudo mkdir -p /opt/services-portfolio
sudo chown "$USER": /opt/services-portfolio
git clone git@github-services-portfolio:daveclinton/services-portfolio.git /opt/services-portfolio
cd /opt/services-portfolio/backend
```

### 2. Create `.env`

```bash
cp .env.example .env
chmod 600 .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s|^RATE_LIMIT_SECRET=.*|RATE_LIMIT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" .env
nano .env
```

In `nano`, set:

```dotenv
APP_ENV=production
ALLOWED_ORIGINS=https://www.daveclintonn.cc,https://daveclintonn.cc
OPENAI_API_KEY=...
SENDY_API_KEY=...
SENDY_ALERT_TO_EMAIL=...
SENDY_SENDER_EMAIL=...
```

Leave `DATABASE_URL`, `API_PORT` and `DB_PORT` alone: Docker sets the API's
database URL, and the script picks the ports.

### 3. Run the setup script

```bash
./deploy/setup.sh
```

It:

1. lists every port in use (`ss -ltn` plus published Docker ports) and picks
   free ones for the API (from 8080) and Postgres (from 5433), or keeps the
   ports from the last run, and saves them as `API_PORT` and `DB_PORT`;
2. runs `docker compose up -d --build` with both ports bound to `127.0.0.1`
   only, and waits for `/healthz`;
3. writes `/etc/nginx/sites-available/api.daveclintonn.cc` (proxy buffering
   off for streaming), enables it, gets a Let's Encrypt certificate with
   certbot's webroot mode, and reloads nginx after `nginx -t`.

It doesn't touch other nginx sites, and it's safe to re-run.

### 4. Copy the existing data (once)

```bash
./deploy/import-db.sh 'postgresql://...old-neon-url...'
```

### 5. Check it and switch the frontend

```bash
curl https://api.daveclintonn.cc/healthz     # {"status":"ok"}
docker compose logs -f api
```

Then set `NEXT_PUBLIC_API_URL=https://api.daveclintonn.cc` in Vercel and
redeploy the site.

### Updating later

```bash
cd /opt/services-portfolio
git switch main
git pull --ff-only origin main
bash backend/deploy/update.sh
```

### Automatic deploys from GitHub

The **Deploy VPS API** workflow runs backend and deployment-script checks on PRs
and updates to `main`. After checks pass on `main`, GitHub connects to the VPS,
fast-forwards its clean `main` checkout, builds only `api`, waits for the container
health check, checks the public HTTPS health endpoint, and captures recent API
logs. It also supports **Actions → Deploy VPS API → Run workflow** on `main`.
Frontend deployment remains with Vercel. Database imports, knowledge ingestion,
nginx configuration and TLS setup remain separate operations.

One-time setup for an existing VPS:

1. Create a dedicated inbound SSH key on your trusted workstation:

   ```bash
   ssh-keygen -t ed25519 -f /tmp/portfolio-actions-key -N '' -C services-portfolio-github-actions
   ```

2. Add four repository Actions secrets through GitHub's settings or `gh secret set`:

   | Secret | Value |
   | --- | --- |
   | `VPS_HOST` | VPS hostname or IP (SSH port 22) |
   | `VPS_USER` | Existing deploy user, such as `clinton` |
   | `VPS_SSH_KEY` | Contents of the new private key; never commit it |
   | `VPS_KNOWN_HOSTS` | Previously verified OpenSSH host-key entries for that hostname/IP |

   Reuse a trusted `known_hosts` entry or verify the host-key fingerprint through
   the VPS console before saving it. The workflow requires strict host verification;
   it does not trust an unauthenticated host-key scan during deployment.

3. After merging the workflow, run once on the VPS as that user, substituting the
   contents of the new `.pub` file in the last command:

   ```bash
   cd /opt/services-portfolio
   git switch main
   git pull --ff-only origin main
   bash backend/deploy/install-github-deploy.sh 'ssh-ed25519 AAAA... services-portfolio-github-actions'
   ```

   This installs a forced-command launcher and appends a restricted key without
   replacing existing SSH keys. The user needs non-interactive Docker access,
   `flock`, `curl`, an existing `backend/.env`, and its existing read access to
   GitHub. The inbound Actions key is separate from the VPS's GitHub deploy key.

4. Run the workflow once to verify connectivity. Future pushes and merges to
   `main` deploy automatically. A first workflow run before the one-time key
   installation will fail SSH authentication; rerun it after installation. Once
   the private key is safely stored in Actions, remove its temporary workstation
   copy. No approval gate is added to the deployment environment.

Deployments are serialized in GitHub and locked on the VPS. Old queued commits
are skipped when `main` has advanced. A dirty checkout, another checked-out branch,
divergent history, failed build or failed health check produces a failed workflow;
there is no destructive reset or automatic rollback. A failed public health check
can leave the newly deployed API running, so inspect the workflow's logs. Container
recreation can briefly interrupt service. Changes to the installed launcher itself
require rerunning the installer with the same public key.

### Running the knowledge pipeline against the VPS database

Open a tunnel (`ssh -L 5433:127.0.0.1:<DB_PORT> clinton@<vps-ip>`) and point
`knowledge-backend`'s `DATABASE_URL` at `127.0.0.1:5433` with the VPS
`POSTGRES_PASSWORD`.
