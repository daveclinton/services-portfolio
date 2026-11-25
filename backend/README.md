# Portfolio API (Go)

The backend for www.daveclintonn.cc. It's one Go binary that serves every
product built on the VPS, plus its own Postgres with pgvector and a self-hosted
embeddings server (Hugging Face Text Embeddings Inference), all in Docker.
The same `compose.yaml` runs on your laptop and on the VPS, where the existing
nginx handles TLS and proxies to the API on loopback.

```
browser ──https──▶ nginx (api.daveclintonn.cc) ──▶ portfolio-api (127.0.0.1:API_PORT) ──▶ portfolio-db (pgvector)
                                                                     └──▶ OpenAI (answers, embeddings), Brevo
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
internal/brevo/       transactional email
internal/newsletter/  independent double-opt-in newsletter signup and limits
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

Newsletter signup is independent of chat storage and needs no database migration.
It accepts bounded JSON with an email address and `consent: true`, requests Brevo
double opt-in, and returns `202 {"status":"pending"}`. Confirmation redirects to
`SITE_URL/subscribe/confirmed`; the browser does not add a contact directly.
Use Brevo Campaigns and its unsubscribe controls for future notes.

When `BREVO_API_KEY` and the existing sender are configured, the newsletter worker
provisions its own named folder, list and confirmation template in the background.
It reuses resources by name, updates only the app's template, and retries setup
failures without blocking the rest of the API. It sends no emails during setup.
`GET /newsletter/status` stays disabled until setup succeeds. Set
`NEWSLETTER_ENABLED=false` to turn it off. See the root README for resource names,
rate limits and the adapted, MIT-licensed Postmark email design.

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
BREVO_API_KEY=...
BREVO_ALERT_TO_EMAIL=...
BREVO_SENDER_EMAIL=...
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
