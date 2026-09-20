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
