# Portfolio API (Go)

The backend for www.daveclintonn.cc. It's one Go binary that serves every
product built on the VPS, plus its own Postgres with pgvector, both in Docker.
The same `compose.yaml` runs on your laptop and on the VPS, where the existing
nginx handles TLS and proxies to the API on loopback.

```
browser ──https──▶ nginx (api.daveclintonn.cc) ──▶ portfolio-api (127.0.0.1:API_PORT) ──▶ portfolio-db (pgvector)
                                                                     └──▶ OpenAI, Brevo
```

## Layout

```
cmd/api/              main: config, database pool, HTTP server, graceful shutdown
internal/config/      environment variables, validated once at startup
internal/server/      shared middleware (CORS, logging, panic recovery) and /healthz
internal/httpx/       JSON, bounded body reading, client IP, UUIDs, Server-Sent Events
internal/ratelimit/   in-memory sliding-window limits and per-visitor locks
internal/visitor/     signed anonymous visitor cookie and HMAC hashing
internal/openai/      chat streaming, structured output, embeddings, vector store search
internal/brevo/       transactional email
internal/askai/       product: Ask AI (retrieval, intent, generation, conversation logs)
db/init/              schema (from knowledge-backend migrations), applied on first start
deploy/setup.sh       VPS setup: free ports, docker compose, nginx site, TLS
deploy/import-db.sh   copy data from another Postgres (e.g. Neon) into the container
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

## Develop

```bash
cp .env.example .env    # works as-is locally; add OPENAI_API_KEY for chat
make up                 # Postgres (127.0.0.1:5433) + API (127.0.0.1:8080)
make db-ingest          # load the knowledge base with ../../knowledge-backend
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
OPENAI_VECTOR_STORE_ID=...
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
cd /opt/services-portfolio && git pull
cd backend && ./deploy/setup.sh
```

### Running the knowledge pipeline against the VPS database

Open a tunnel (`ssh -L 5433:127.0.0.1:<DB_PORT> clinton@<vps-ip>`) and point
`knowledge-backend`'s `DATABASE_URL` at `127.0.0.1:5433` with the VPS
`POSTGRES_PASSWORD`.
