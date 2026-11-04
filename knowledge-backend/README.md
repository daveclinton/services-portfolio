# Portfolio backend

Command-line Django workspace for offline knowledge and model work: ingestion,
embedding generation, evidence audits, retrieval evaluation, and migrations.
Client-facing chat and search run in the root Next.js app's `app/api/` routes.
This directory has no HTTP API, admin, ASGI/WSGI entrypoint, or web deployment;
`manage.py runserver` exits with instructions to start Next.js instead.

Current model tooling generates embeddings and evaluates retrieval. A separate
model-training command has not been implemented.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the PostgreSQL password
python manage.py migrate
```

PostgreSQL 16 must have the `vector` and `pg_trgm` extensions available
(`database/migrations/0001_enable_pgvector.py` creates them). The database app
retains its historical `api` label only for migration compatibility. Existing
`django_migrations` rows and knowledge tables stay valid; no database reset is
required. No `SECRET_KEY`, host, CORS, or static-file settings are needed.

## Knowledge ingestion (Phase 2)

The Markdown knowledge base lives in a separate Git repository
(`professional-knowledge`) and is the source of truth. The ingestion pipeline
reads it and upserts the structured rows (`Person`, `Company`, `Employment`,
`Skill`, `Technology`, `Project`, `Evidence`, `KnowledgeChunk`).

It is structured ingestion only: no embeddings, no LLM, no network calls.
`KnowledgeChunk.embedding` stays `NULL` until the embedding phase.

### Running it

```bash
cd backend
source .venv/bin/activate

# whole knowledge base
python manage.py ingest_knowledge

# an explicit path
python manage.py ingest_knowledge --kb-path ~/professional-knowledge

# parse + validate only, write nothing
python manage.py ingest_knowledge --dry-run

# one source type at a time
python manage.py ingest_knowledge --only experience
```

The command prints a per-model summary of `created` / `updated` / `skipped`
counts, plus any warnings:

```
Knowledge ingestion — write run — scope: all source types
kb_path: /Users/you/professional-knowledge
documents parsed: 13

model             created  updated  skipped
-------------------------------------------
Person                  1        0        0
Company                 1        0        0
...
```

The whole run happens inside a single database transaction: a malformed file or
an unexpected error rolls everything back, so the database is never left half
ingested.

### Flags

| Flag | What it does |
| --- | --- |
| `--kb-path PATH` | Knowledge base root to read. |
| `--dry-run` | Parse and validate every file, report the counts that *would* change, and write nothing to the database. Validation errors are still raised. |
| `--only {person,experience,projects,skills,evidence}` | Ingest a single source type. Knowledge chunks are only created for the files in scope. |
| `--strict` | Fail the run when the relationship graph is incomplete (see below). Default stays lenient. |

What `--only` covers:

| Scope | Files |
| --- | --- |
| `person` | `knowledge/person/profile.md` |
| `experience` | everything under `knowledge/experience/` (companies, employments, responsibilities, accomplishments, technologies, and the `projects.md` links) |
| `projects` | everything under `knowledge/projects/` |
| `skills` | `knowledge/skills/*.md` |
| `evidence` | `knowledge/evidence/*.md` |

Two consequences are worth knowing before you use `--only`:

* `--only experience` needs a `Person` row to attach employments to, so run
  `--only person` first (or run the full ingestion).
* Project → employment links come from `experience/<company>/projects.md`. With
  `--only experience` or `--only projects` the missing side is reported as a
  warning instead of being linked; run the full ingestion to apply links.

### Where the knowledge base path comes from

Resolved in this order, first match wins:

1. `--kb-path PATH`
2. the `KNOWLEDGE_BASE_PATH` environment variable (see `.env.example`)
3. `settings.KNOWLEDGE_BASE_PATH` in `config/settings.py`
4. `~/professional-knowledge`

### Frontmatter contract

Every Markdown file starts with a YAML frontmatter block that declares its
`type`. Unknown keys are rejected, slugs are the natural keys for upserts, and
the Markdown body carries the prose for the field the file is named after.

The full schema — required vs optional keys, one realistic example per file
type, and the ingest order — lives in
[`knowledge/docs/frontmatter-contract.md`](knowledge/docs/frontmatter-contract.md).

### Evidence layer (Phase 4)

Every claim ingested from the knowledge base must be traceable to a source.
Evidence lives in `knowledge/evidence/<slug>.md` (or inline in
`experience/<company>/accomplishments.md` and
`projects/<slug>/evidence.md`) with this frontmatter:

| Key | Required | Notes |
| --- | --- | --- |
| `type` | yes | `evidence` |
| `slug` | yes | must equal the file name |
| `claim` | yes | one sentence, no hedging |
| `confidence` | no | `confirmed` (default) \| `probable` \| `unverified` |
| `evidence_type` | no | `project` \| `repository` \| `article` \| `talk` \| `documentation` (default) \| `certificate` \| `metric` \| `screenshot` |
| `title` | no | short label, ≤ 200 chars |
| `description` | no | details; defaults to the file body |
| `verified_at` | no | ISO date of last confirmation |
| `external_id` | no | e.g. a GitHub repo full name or article slug |
| `company` / `project` | at least one | links the claim; missing both is an ingestion error |
| `source_url` / `source_path` | recommended | at least one is required for `confirmed` claims under `--strict` |

Section 14 of the
[frontmatter contract](knowledge/docs/frontmatter-contract.md) shows one
realistic example per `evidence_type`.

### Auditing the graph

`audit_knowledge` reports missing evidence, broken links and advisory
findings as a clean table:

```bash
python manage.py audit_knowledge            # no network access
python manage.py audit_knowledge --check-urls  # also verify source_url answers
```

Hard issues (exit code 1, for CI): projects with no evidence, employments
with no projects, evidence linked to neither, and — with `--check-urls` —
source URLs answering non-2xx. Advisory findings (exit code stays 0): skills
or technologies referenced by no project, `unverified` evidence, and chunks
with `embedding IS NULL` (expected until the Phase 5 embedding pass).

### Strict ingestion

`--strict` turns the audit's hard issues into ingestion failures — the whole
run rolls back instead of writing a half-linked graph:

```bash
python manage.py ingest_knowledge --strict             # full run, pre-deploy gate
python manage.py ingest_knowledge --dry-run --strict   # validate without writing
```

It fails when any project has zero linked evidence, any employment has zero
linked projects, any evidence lacks both project and employment, or any
`confirmed` evidence has neither `source_url` nor `source_path`. Use it before
deploying; day-to-day ingestion stays lenient (warnings only). With `--only`,
only the in-scope evidence checks apply — partial runs are not failed for
links that live outside their scope.

### Embeddings (Phase 5)

`embed_knowledge` fills `KnowledgeChunk.embedding` (a 1536-dimension pgvector
column) with `text-embedding-3-small` vectors, which is what makes
`SELECT ... ORDER BY embedding <=> %s` semantic search possible:

```bash
pip install -r requirements.txt   # adds the openai package
# put OPENAI_API_KEY in .env (see .env.example), then:
python manage.py embed_knowledge --dry-run   # counts + cost estimate, no API calls
python manage.py embed_knowledge
```

| Flag | What it does |
| --- | --- |
| `--batch-size N` | Texts per API request (default: 100). |
| `--model MODEL` | Embedding model (default: `text-embedding-3-small`). Must return 1536 dimensions — anything else fails fast before writing. |
| `--limit N` | Embed at most N chunks this run. |
| `--dry-run` | Report pending chunks and estimated cost; make no API calls, write nothing. Works with no API key. |

The run is idempotent (embedded rows are skipped) and resumable (every batch
is written back immediately, so re-running continues where it stopped).
Transient API errors (429s, timeouts, 5xx) are retried with exponential
backoff; bad credentials and dimension mismatches fail immediately with an
actionable message. Cost is counted from the API's token usage and printed
per run — ~50 chunks of knowledge-base prose costs less than $0.001.

### Serving the knowledge base

After ingestion and embedding generation, the Next.js routes read the same
database directly. Configure `DATABASE_URL` and `OPENAI_API_KEY` in the root
`.env.local` or the frontend hosting environment. The client uses
`POST /api/search` and `POST /api/chat` on the site's own origin.

Python retrieval helpers remain in `knowledge/retrieval/` for offline
evaluation. Client request validation, streaming, and answer generation live
in the Next.js app. Legacy Python health, person, evidence, job-fit, search,
and chat endpoints have been removed.

### Evaluating retrieval (Phase 10)

`knowledge/evals/questions.json` holds the hand-written question set — each
question declares the project, company, skill, source path or literal phrase a
correct retrieval must surface.

```bash
python manage.py evaluate_retrieval                       # hybrid, k=5
python manage.py evaluate_retrieval --mode structured --mode hybrid -k 10
python manage.py evaluate_retrieval --show-misses
python manage.py evaluate_retrieval --min-hit-rate 0.8    # CI gate
python manage.py evaluate_retrieval --json
```

```
Retrieval evaluation — 42 questions — k=5

mode            hit@k  recall@k      MRR   misses
--------------------------------------------------
structured         86%        79%    0.712        6
hybrid             93%        85%    0.804        3
```

Exit code 1 when any evaluated mode's hit rate is below `--min-hit-rate`, 0
otherwise. Because this measures retrieval rather than generation, it is
stable and cheap enough to run on every push.

### Continuous ingestion

`.github/workflows/knowledge-pipeline.yml` rebuilds the graph on every push
that touches `backend/`, weekly on a schedule, and on demand. It
starts a `pgvector/pgvector:pg16` service, runs `ingest_knowledge --strict`,
`audit_knowledge`, `embed_knowledge` (when `OPENAI_API_KEY` is set) and
`evaluate_retrieval --min-hit-rate 0.6`, then the test suite.

The point: a knowledge-base typo — a project with no evidence, an employment
with no projects, a confirmed claim with no source — fails CI instead of
quietly shipping.

### Tests

The tests use pytest + pytest-django and run against the fixture knowledge base
in `knowledge/tests/fixtures/kb/`, never against your real
`professional-knowledge` checkout:

```bash
cd backend
source .venv/bin/activate
python -m pytest
```

`pytest.ini` points `DJANGO_SETTINGS_MODULE` at `config.settings` and runs the
`knowledge` and `database` suites. The test database (`test_<POSTGRES_DB>`) is
created and destroyed automatically.

## Running in production

Deploy only the Next.js app. Run Python commands locally, in CI, or as offline
jobs against the same database. The root [README](../README.md) covers database
preparation and frontend deployment. Keep database credentials and provider
keys in environment variables or an uncommitted `backend/.env`.

The existing knowledge workflow uses a disposable Postgres service to validate
ingestion and evaluation; it does not update the production database.
