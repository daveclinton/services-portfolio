# Portfolio API (Go)

The backend for www.daveclintonn.cc. It's one Go binary, run in Docker, that
serves every product built on the VPS. The VPS's existing nginx handles TLS
and proxies to the container on loopback.

```
browser ──https──▶ nginx (api.daveclintonn.cc) ──http──▶ portfolio-api container (127.0.0.1:<port>) ──▶ Postgres
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
deploy/setup.sh       VPS setup: free port, docker compose, nginx site, TLS
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
cp .env.example .env    # set DATABASE_URL and optionally OPENAI_API_KEY
make run                # http://127.0.0.1:8080
make test
```

In the portfolio, set `NEXT_PUBLIC_API_URL=http://localhost:8080` in `.env.local`.

## Deploy (Docker + nginx)

One-time, on your laptop and DNS:

1. Point an `A` record for `api.daveclintonn.cc` at the VPS IP.
2. Make sure the VPS has Docker with the compose plugin, nginx and certbot
   (`sudo apt install -y certbot` if missing).

Then from `backend/`:

```bash
make deploy VPS=clinton@<vps-ip>
```

The first run copies the code to `/opt/portfolio-api`, creates `.env` there
from `.env.example` and stops. Fill it in on the server:

```bash
ssh clinton@<vps-ip>
nano /opt/portfolio-api/.env
#   APP_ENV=production
#   ALLOWED_ORIGINS=https://www.daveclintonn.cc,https://daveclintonn.cc
#   DATABASE_URL=...  OPENAI_API_KEY=...  OPENAI_VECTOR_STORE_ID=...
#   RATE_LIMIT_SECRET=$(openssl rand -base64 48)
#   BREVO_API_KEY=...  BREVO_ALERT_TO_EMAIL=...  BREVO_SENDER_EMAIL=...
```

Run `make deploy VPS=...` again. `deploy/setup.sh` then:

1. lists every port in use (`ss -ltn` plus published Docker ports) and picks
   the first free one from 8080 upward, or keeps the port from the last deploy,
   and saves it as `API_PORT` in `.env`;
2. runs `docker compose up -d --build` with the port bound to `127.0.0.1` only,
   and waits for `/healthz`;
3. writes `/etc/nginx/sites-available/api.daveclintonn.cc` (proxy buffering
   off for streaming), enables it, gets a Let's Encrypt certificate with
   certbot's webroot mode, and reloads nginx after `nginx -t`.

It's safe to re-run on every deploy, and it doesn't touch other nginx sites.

Finally set `NEXT_PUBLIC_API_URL=https://api.daveclintonn.cc` in Vercel and
redeploy the site.

```bash
curl https://api.daveclintonn.cc/healthz     # {"status":"ok"}
make logs VPS=clinton@<vps-ip>
```
