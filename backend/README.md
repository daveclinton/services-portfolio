# Portfolio backend

Django + Django REST Framework backend for an AI-powered portfolio. Phase 1
covers the models and the read-only API (`/api/health/`, `/api/person/`);
Phase 2 is the knowledge ingestion pipeline described below.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the PostgreSQL password
python manage.py migrate
python manage.py runserver
```

PostgreSQL 16 must have the `vector` and `pg_trgm` extensions available
(`api/migrations/0001_enable_pgvector.py` creates them).

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

### Retrieval API (Phase 6)

`POST /api/ai/search/` returns ranked `KnowledgeChunk` rows with the evidence
that backs them. There is no LLM in this path — it is the layer you tune.

Three modes:

| Mode | How it ranks |
| --- | --- |
| `structured` | Postgres full-text search over the chunk body, plus metadata filters. |
| `semantic` | Cosine distance over `embedding`, using an embedding of the query. |
| `hybrid` | Reciprocal rank fusion (RRF, `k=60`) of the two. **Default.** |

```bash
curl -s http://localhost:8000/api/ai/search/ \
  -H 'Content-Type: application/json' \
  -d '{"query": "react native warranty app", "mode": "hybrid", "limit": 5}'
```

```json
{
  "query": "react native warranty app",
  "mode": "hybrid",
  "count": 2,
  "filters": { "source_type": [], "project_slug": [], "company_slug": [], "skill_slug": [] },
  "strategies": { "structured": 2, "semantic": 1 },
  "notes": [],
  "results": [
    {
      "rank": 1,
      "score": 0.03252,
      "matched_by": ["semantic", "structured"],
      "structured_rank": 2,
      "semantic_rank": 1,
      "distance": 0.213,
      "chunk_id": 12,
      "source_type": "project-overview",
      "source_group": "projects",
      "source_path": "knowledge/projects/mika-warranty-app/overview.md",
      "project_slug": "mika-warranty-app",
      "company_slug": "mika",
      "skill_slug": "",
      "citations": [
        {
          "slug": "app-store-and-play-store-shipping",
          "title": "App store and play store shipping",
          "confidence": "confirmed",
          "evidence_type": "project",
          "source_url": "https://apps.apple.com/us/app/tai-ora/id6756413932",
          "source_path": "knowledge/evidence/app-store-and-play-store-shipping.md"
        }
      ],
      "content": "…"
    }
  ]
}
```

Request fields: `query` (may be empty when filters are given), `mode`, `limit`
(1–50, default 10), `include_content` (default `true`) and `filters`:

| Filter | Matches |
| --- | --- |
| `source_type` | the fine-grained file type, e.g. `project-overview`, `skill`, `evidence` |
| `source_group` | `person`, `experience`, `projects`, `skills`, `evidence` |
| `project_slug` / `company_slug` / `skill_slug` | the chunk's owning row |

Every value is a list. Filter-only requests are supported — that is how you
dump a project:

```bash
curl -s http://localhost:8000/api/ai/search/ \
  -H 'Content-Type: application/json' \
  -d '{"query": "", "filters": {"project_slug": ["mika-warranty-app"]}}'
```

Degrading gracefully is deliberate. With no `OPENAI_API_KEY`, or before
`embed_knowledge` has run, `hybrid` falls back to lexical results and explains
itself in `notes`; `semantic` returns an empty result set with the same note.
Neither ever 500s.

### Grounded answers (Phase 7)

`POST /api/ai/chat/` retrieves, then streams a grounded answer over
Server-Sent Events. The model only ever sees the retrieved chunks and is
instructed to cite them or say it does not know:

```bash
curl -N http://localhost:8000/api/ai/chat/ \
  -H 'Content-Type: application/json' \
  -d '{"messages": [{"role": "user", "content": "Has he shipped mobile apps?"}]}'
```

```
event: retrieval
data: {"notes": [], "strategies": {"structured": 4, "semantic": 4}}

event: citations
data: {"sources": [{"index": 1, "chunk_id": 12, "citations": [...]}]}

event: delta
data: {"text": "Yes — "}

event: done
data: {"finish_reason": "stop"}
```

The event sequence is always `retrieval` → `citations` → `delta`* → `done`.
Two terminal cases matter:

* **No evidence retrieved** — the server answers with a fixed
  "I don't have verified evidence…" message and *never calls the model*, so
  there is nothing to hallucinate. `finish_reason` is `no_evidence`.
* **No API key** — the stream emits an `error` event with an actionable
  message, then `done`.

`messages` is the full turn history (the last one must be from the user), so
follow-up questions keep their context. `model` overrides the default
`OPENAI_CHAT_MODEL` (`gpt-4o-mini`) per request.

### Evidence detail

`GET /api/evidence/<slug>/` returns one evidence row with its project and
company. The Ask AI UI links every citation chip here, which is what makes a
generated answer checkable:

```bash
curl -s http://localhost:8000/api/evidence/app-store-and-play-store-shipping/
```

### Job-fit analysis (Phase 9)

`POST /api/ai/job-fit/` scores a job description against the knowledge base.
The core is deterministic — no model needed, and the same input always gives
the same score:

```bash
curl -s http://localhost:8000/api/ai/job-fit/ \
  -H 'Content-Type: application/json' \
  -d '{"job_description": "Senior React Native engineer. Kubernetes a plus.", "title": "Senior Mobile Engineer"}'
```

```json
{
  "title": "Senior Mobile Engineer",
  "score": 0.5,
  "coverage": { "matched": 1, "missing": 1, "total": 2 },
  "matched": [
    {
      "name": "React Native",
      "slug": "react-native",
      "kind": "technology",
      "matched": true,
      "projects": [{ "slug": "mika-warranty-app", "name": "Mika Warranty Registration App" }],
      "evidence": [{ "slug": "app-store-and-play-store-shipping", "confidence": "confirmed" }]
    }
  ],
  "gaps": [{ "name": "kubernetes", "slug": "kubernetes", "kind": "keyword", "matched": false }],
  "relevant_experience": [ "…ranked chunks, same shape as /api/ai/search/" ],
  "summary": "Evidence supports 1 of 2 detected requirements for Senior Mobile Engineer: React Native. No knowledge-base evidence found for: kubernetes."
}
```

Requirements are detected by scanning the description against a lexicon built
from the knowledge base's own `Skill` and `Technology` rows plus a small alias
table (`postgres` → `postgresql`, `k8s` → `kubernetes`, …). A term the
knowledge base has never mentioned lands in `gaps` — that is the useful part.

`"narrative": true` adds a short prose summary, which *does* call the model.
It is off by default, and the score never depends on it.

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
that touches `backend/knowledge/`, weekly on a schedule, and on demand. It
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
`knowledge` and `api` suites. The test database (`test_<POSTGRES_DB>`) is
created and destroyed automatically.
