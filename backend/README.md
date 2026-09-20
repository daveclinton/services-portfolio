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
