# Portfolio API

The Go API behind www.daveclintonn.cc. It runs in Docker with PostgreSQL and pgvector.

```text
browser → nginx → Go API → PostgreSQL
                    ├→ OpenAI (answers)
                    └→ Sendy (email)
```

## Run locally

```bash
cp .env.example .env
make up          # database and API on http://localhost:8080
make db-ingest   # load the knowledge base (see the root README for Python setup)
make test
```

Other commands: `make run`, `make logs`, `make psql`, `make down`.

## Configure

Every setting is explained in [.env.example](.env.example). The main ones:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Generated answers and semantic search |
| `RATE_LIMIT_SECRET` | Signs sessions and email links. 32+ characters. Changing it breaks both |
| `SITE_URL` | Exact frontend address |
| `NEWSLETTER_PUBLIC_API_URL` | Public API address |
| `CONTENT_REVALIDATION_SECRET` | Refreshes the site after publishing. 32+ characters, same value in Vercel |
| `SENDY_*` | Email delivery and alerts |
| `NEWSLETTER_GITHUB_*` | Writing desk sign-in |

The API does not track your OpenAI balance. Set spend limits in the OpenAI dashboard.

## Writing desk

Posts are at `/admin/posts` and newsletters at `/admin/newsletters`.

- Autosave never changes a published post. Publish again to update it.
- Unpublishing keeps the draft, URL and original date. Deleting is permanent.
- Publishing a post never sends email.
- A newsletter made from a post copies the whole article. Interactive parts become links.
- Contacts at `/admin/contacts` lists everyone who signed up.
- Newsletters go only to confirmed subscribers. **Sent** means the provider accepted the email, not that it reached the inbox.
- Images can be PNG, JPEG or GIF, up to 5 MB and 16 megapixels.

To enable it:

1. Create a [GitHub OAuth app](https://github.com/settings/developers) with the callback `https://api.daveclintonn.cc/admin/newsletters/auth/callback`.
2. Set these in `.env`:

   ```dotenv
   NEWSLETTER_GITHUB_CLIENT_ID=
   NEWSLETTER_GITHUB_CLIENT_SECRET=
   NEWSLETTER_GITHUB_OWNER_ID=83610935   # your numeric GitHub ID
   NEWSLETTER_OAUTH_CALLBACK_URL=https://api.daveclintonn.cc/admin/newsletters/auth/callback
   NEWSLETTER_TEST_EMAIL=
   ```

3. For email, verify your domain in [Sendy](https://usesendy.com/docs) and set the `SENDY_*` values.
4. Recreate the API so it reads the new values:

   ```bash
   docker compose up -d --build --no-deps --force-recreate --wait api
   ```

Use a separate OAuth app for local development.

## Code

| Path | Purpose |
| --- | --- |
| `cmd/api` | Starts the server |
| `internal/askai` | Search, answers and conversations |
| `internal/studio` | Posts, newsletters, images and sign-in |
| `internal/newsletter` | Signup and confirmation |
| `internal/sendy` | Email delivery |
| `internal/server` | Shared middleware and health check |
| `internal/config` | Environment settings |
| `db/init` | Database schema |
| `evals` | [Answer checks](evals/README.md) |

To add a product, create `internal/<product>/` with a `Routes(*http.ServeMux)` method and pass it to `server.New`.

Database tests need a local PostgreSQL. Never point them at production:

```bash
NEWSLETTER_STUDIO_TEST_DATABASE_URL='postgresql://...' go test -race ./internal/studio ./internal/sendy
```

Set `ASKAI_TEST_DATABASE_URL` to run the conversation retention test.

## Deploy

See [deploy/README.md](deploy/README.md).
