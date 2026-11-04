# Markdown frontmatter contract

This is the authoring contract for the `professional-knowledge` repository that
`python manage.py ingest_knowledge` reads. It is Phase 2 of the portfolio
backend: structured ingestion only — no embeddings, no LLM, no network calls.

The `professional-knowledge` repo is the source of truth. The database is a
projection of it, so every rule below exists to keep that projection
deterministic and idempotent.

## 1. File layout

Only these paths are ingested. Anything else under `knowledge/` is reported as
a warning and skipped.

| File | Frontmatter `type` | Writes to |
| --- | --- | --- |
| `knowledge/person/profile.md` | `person-profile` | `Person` |
| `knowledge/experience/<company-slug>/overview.md` | `experience-overview` | `Company`, `Employment` |
| `knowledge/experience/<company-slug>/responsibilities.md` | `experience-responsibilities` | `Employment.responsibilities` |
| `knowledge/experience/<company-slug>/projects.md` | `experience-projects` | `Project.employment` links |
| `knowledge/experience/<company-slug>/accomplishments.md` | `experience-accomplishments` | `Evidence` (employment-scoped) |
| `knowledge/experience/<company-slug>/technologies.md` | `experience-technologies` | `Technology` + project links |
| `knowledge/projects/<project-slug>/overview.md` | `project-overview` | `Project` + skill/technology links |
| `knowledge/projects/<project-slug>/architecture.md` | `project-architecture` | `Project.architecture` / `challenges` / `solutions` |
| `knowledge/projects/<project-slug>/technical-decisions.md` | `project-technical-decisions` | `Project.technical_decisions` / `results` |
| `knowledge/projects/<project-slug>/evidence.md` | `project-evidence` | `Evidence` (project-scoped) |
| `knowledge/skills/<skill-slug>.md` | `skill` | `Skill` |
| `knowledge/evidence/<evidence-slug>.md` | `evidence` | `Evidence` |

## 2. Rules that apply to every file

1. **A YAML frontmatter block is mandatory** and must be the first thing in the
   file, delimited by `---` lines.
2. **`type` is mandatory** and must match the file's location as listed above.
   A `type` mismatch is an error, not a warning.
3. **Unknown keys are errors.** Typo'd keys (`company_namee`) fail the run
   instead of being silently ignored.
4. **Slugs are the natural keys** and must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`
   (lowercase, digits, single hyphens) and be at most 50 characters. Slugs are
   global per model: two files may not define the same `Evidence` slug, and so
   on.
5. **Slugs must match the file location.** `knowledge/skills/system-design.md`
   must declare `slug: system-design`.
6. **The Markdown body is prose**, and for most file types it is the field named
   after the file (`overview.md` → `overview`, `architecture.md` →
   `architecture`, and so on). It is stored verbatim, so write Markdown lists
   as Markdown lists.
7. **Prose and frontmatter become knowledge chunks.** Each recognized document
   gets one `KnowledgeChunk` containing its body plus searchable recorded facts
   (including names, dates, technologies, and confidence-labelled claims).
   Frontmatter-only inventories are indexed too. Source paths and the original
   frontmatter remain in metadata. Changed searchable text clears its embedding;
   run `embed_knowledge` after ingestion to refresh those vectors.
8. **Dates are ISO `YYYY-MM-DD`.** Omit `end_date` (or write `null`) for a
   current role.
9. **Every row keeps the file path it came from**, so the database can always
   be traced back to the Markdown source.

### References: bare slugs vs. written-out entries

Wherever a file references a skill or a technology you may write either:

* a **bare slug** — `python` — which must already exist in the database, or
* a **full entry** — `{slug: python, name: Python, category: language}` — which
  is created if missing.

Bare slugs that resolve to nothing fail the run with the file path, the missing
slug, and a hint about which file to add.

## 3. `knowledge/person/profile.md`

Exactly one profile file. It defines the `Person` row that every employment
belongs to.

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `person-profile` | |
| `slug` | yes | slug | natural key of the profile, e.g. `david-clinton` |
| `name` | yes | string | |
| `title` | yes | string | |
| `location` | yes | string | |
| `specializations` | no | list of strings | defaults to `[]` |
| `career_focus` | no | list of strings | defaults to `[]` |
| `experience_years` | no | integer 0–80 | `null` when unknown |
| _body_ | yes | prose | becomes `Person.summary` |

```markdown
---
type: person-profile
slug: david-clinton
name: David Clinton
title: Backend & Data Engineer
location: Nairobi, Kenya
specializations:
  - Python services and APIs
  - PostgreSQL data modelling
  - Batch data pipelines
career_focus:
  - Platform engineering for data-heavy products
  - AI-assisted knowledge tooling
experience_years: 8
---

I build backend services and data pipelines that turn messy operational data
into something teams can act on. Most of my work is Python, PostgreSQL and
Django, with a bias towards small systems that are easy to reason about and
cheap to run.
```

## 4. `knowledge/experience/<company-slug>/overview.md`

Creates the `Company` and the `Employment`. There is exactly one `Employment`
per `(person, company)`; the dates in this file are authoritative. If you
really worked at the same company twice, give each stint its own company slug
(for example `acme-2019` and `acme-2023`).

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `experience-overview` | |
| `company` | yes | slug | must equal the directory name |
| `company_name` | yes | string | |
| `role` | yes | string | |
| `start_date` | yes | date | |
| `end_date` | no | date | `null` = current role |
| `website` | no | URL | defaults to `""` |
| `location` | no | string | defaults to `""` |
| _body_ | no | prose | becomes `Company.description` |

```markdown
---
type: experience-overview
company: analytical-engines
company_name: Analytical Engines Ltd
website: https://analytical-engines.example.com
role: Senior Backend Engineer
start_date: 2021-03-01
end_date: 2024-06-30
location: Nairobi, Kenya (hybrid)
---

Analytical Engines builds scheduling and billing software for mid-sized
logistics operators. The platform runs on Django, PostgreSQL and Celery and
schedules roughly forty million jobs a month.
```

## 5. `knowledge/experience/<company-slug>/responsibilities.md`

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `experience-responsibilities` | |
| `company` | yes | slug | must equal the directory name |
| _body_ | yes | prose/list | becomes `Employment.responsibilities` |

```markdown
---
type: experience-responsibilities
company: analytical-engines
---

- Owned the billing and scheduling services (Django, PostgreSQL, Celery).
- Led the migration from a single-worker scheduler to a sharded job runner.
- Reviewed and mentored the work of two mid-level engineers.
- Ran the weekly on-call handover and the post-incident reviews.
```

## 6. `knowledge/experience/<company-slug>/projects.md`

Declares which projects belong to this employment. The link is applied after the
project files have been ingested, so a project listed here must also have a
`knowledge/projects/<project-slug>/overview.md`. If it does not, the run
reports a warning and skips the link (this is what happens when you run
`--only experience`).

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `experience-projects` | |
| `company` | yes | slug | must equal the directory name |
| `projects` | yes | non-empty list of slugs | directories under `knowledge/projects/` |
| _body_ | no | prose | notes only; stored as a knowledge chunk |

```markdown
---
type: experience-projects
company: analytical-engines
projects:
  - difference-engine
---

One project carried most of the engineering work at Analytical Engines: the
Difference Engine scheduler rewrite.
```

## 7. `knowledge/experience/<company-slug>/accomplishments.md`

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `experience-accomplishments` | |
| `company` | yes | slug | must equal the directory name |
| `accomplishments` | yes | non-empty list | see below |
| _body_ | no | prose | notes only; stored as a knowledge chunk |

Each accomplishment:

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `slug` | yes | slug | global `Evidence` key |
| `claim` | yes | string | one sentence, no hedging |
| `confidence` | no | `confirmed` \| `probable` \| `unverified` | defaults to `confirmed` |
| `source_url` | no | URL | defaults to `""` |
| `source_path` | no | repo-relative path | e.g. `sources/documents/review.pdf` |

Accomplishments also accept the optional Phase 4 keys
(`evidence_type`, `title`, `description`, `verified_at`, `external_id`) —
see §14. The same applies to the `claims` lists in §12.

```markdown
---
type: experience-accomplishments
company: analytical-engines
accomplishments:
  - slug: analytical-engines-batch-runtime
    claim: Cut nightly billing batch runtime from six hours to forty minutes.
    confidence: confirmed
    source_path: sources/documents/2023-performance-review.pdf
  - slug: analytical-engines-scheduler-sharding
    claim: Designed the sharding scheme that removed the scheduler as a single point of failure.
    confidence: probable
    source_url: https://analytical-engines.example.com/blog/scheduler-sharding
---
```

## 8. `knowledge/experience/<company-slug>/technologies.md`

The catalogue of technologies used at a company. Each entry is added to every
project linked to that employment through `projects.md`; nothing is ever removed
from a project by this file.

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `experience-technologies` | |
| `company` | yes | slug | must equal the directory name |
| `technologies` | yes | non-empty list | bare slug or `{slug, name, category}` |
| _body_ | no | prose | notes only; stored as a knowledge chunk |

```markdown
---
type: experience-technologies
company: analytical-engines
technologies:
  - slug: python
    name: Python
    category: language
  - slug: django
    name: Django
    category: web framework
  - slug: postgresql
    name: PostgreSQL
    category: database
---
```

## 9. `knowledge/projects/<project-slug>/overview.md`

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `project-overview` | |
| `slug` | yes | slug | must equal the directory name |
| `name` | yes | string | |
| `problem` | no | prose | multi-line YAML block |
| `context` | no | prose | multi-line YAML block |
| `github_url` / `demo_url` / `docs_url` | no | URL | default to `""` |
| `skills` | no | list | bare slug or full entry |
| `technologies` | no | list | bare slug or full entry |
| _body_ | yes | prose | becomes `Project.overview` |

```markdown
---
type: project-overview
slug: difference-engine
name: Difference Engine
problem: |
  Nightly billing runs took six hours, so any failure surfaced after the
  finance team had already gone home.
context: |
  The scheduler ran every job on a single worker with no sharding and no
  idempotency guarantees, so retries could duplicate invoices.
github_url: https://github.com/davidclinton/difference-engine
demo_url: ""
skills:
  - system-design
  - slug: performance-tuning
    name: Performance tuning
    category: engineering
technologies:
  - python
  - django
  - postgresql
  - slug: redis
    name: Redis
    category: datastore
---

Difference Engine is the sharded job runner that replaced the single-worker
scheduler. Every tenant gets a queue shard, jobs are claimed with a
`SELECT ... FOR UPDATE SKIP LOCKED` claim, and invoice writes are idempotent
on the tenant/invoice-period natural key.
```

## 10. `knowledge/projects/<project-slug>/architecture.md`

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `project-architecture` | |
| `project` | yes | slug | must equal the directory name |
| `challenges` | no | list of strings | stored as a Markdown bullet list |
| `solutions` | no | list of strings | stored as a Markdown bullet list |
| _body_ | yes | prose | becomes `Project.architecture` |

```markdown
---
type: project-architecture
project: difference-engine
challenges:
  - Job throughput was capped by a single worker process.
  - Retries could duplicate invoices when a worker died mid-job.
solutions:
  - Sharded the queue by tenant id so workers could scale horizontally.
  - Made invoice writes idempotent with a natural-key upsert.
---

Difference Engine splits the nightly run into per-tenant shards. A dispatcher
rows tenant jobs into PostgreSQL, worker processes claim shards with
`SKIP LOCKED`, and each worker writes results through an idempotent upsert so
a retry can never create a second invoice.
```

## 11. `knowledge/projects/<project-slug>/technical-decisions.md`

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `project-technical-decisions` | |
| `project` | yes | slug | must equal the directory name |
| `results` | no | list of strings | stored as a Markdown bullet list |
| _body_ | yes | prose | becomes `Project.technical_decisions` |

```markdown
---
type: project-technical-decisions
project: difference-engine
results:
  - Nightly runtime fell from six hours to forty minutes.
  - Billing incidents dropped from roughly two per month to none over six months.
---

We kept PostgreSQL as the queue instead of adding a broker: the team already
operated it well, `SKIP LOCKED` gave us safe concurrent claims, and one fewer
piece of infrastructure was worth more than a small throughput win.
```

## 12. `knowledge/projects/<project-slug>/evidence.md`

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `project-evidence` | |
| `project` | yes | slug | must equal the directory name |
| `claims` | yes | non-empty list | same shape as an accomplishment |
| _body_ | no | prose | notes only; stored as a knowledge chunk |

```markdown
---
type: project-evidence
project: difference-engine
claims:
  - slug: difference-engine-runtime
    claim: Nightly billing runtime fell from six hours to forty minutes.
    confidence: confirmed
    source_path: sources/documents/2023-performance-review.pdf
  - slug: difference-engine-idempotent-invoices
    claim: Duplicate invoices stopped after the idempotent upsert shipped.
    confidence: probable
---

Evidence for Difference Engine is assembled from the 2023 performance review
and the production incident log.
```

## 13. `knowledge/skills/<skill-slug>.md`

Skills are capabilities (system design, technical writing); technologies are
tools (Python, PostgreSQL).

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `skill` | |
| `slug` | yes | slug | must equal the file name |
| `name` | yes | string | ≤ 100 characters |
| `category` | no | string | defaults to `""` |
| _body_ | no | prose | notes only; stored as a knowledge chunk |

```markdown
---
type: skill
slug: system-design
name: System design
category: engineering
---

Designing small, operable services: queueing, sharding, idempotency and failure
handling. Applied most recently to the Difference Engine scheduler.
```

## 14. `knowledge/evidence/<evidence-slug>.md`

For claims that belong to a single project, prefer
`projects/<slug>/evidence.md`. Use this file when a claim stands on its own or
cuts across an employment and a project.

| Key | Required | Type | Notes |
| --- | --- | --- | --- |
| `type` | yes | `evidence` | |
| `slug` | yes | slug | must equal the file name |
| `claim` | yes | string | the claim, one sentence, no hedging |
| `confidence` | no | `confirmed` \| `probable` \| `unverified` | defaults to `confirmed` |
| `evidence_type` | no | one of the 8 types below | defaults to `documentation` |
| `title` | no | string ≤ 200 chars | short label; defaults to `""` |
| `description` | no | prose | details; defaults to the file body |
| `verified_at` | no | ISO date (`YYYY-MM-DD`) | when last confirmed; defaults to `null` |
| `external_id` | no | string | e.g. a repo full name or article slug; defaults to `""` |
| `company` | no* | slug | links to the employment at that company |
| `project` | no* | slug | links to the project |
| `source_url` | no | URL | defaults to `""` |
| `source_path` | no | repo-relative path | defaults to `""` |
| _body_ | no | prose | notes; stored as a knowledge chunk |

\* At least one of `company` or `project` is required — an unlinked claim is
an ingestion error, not a warning. A `confirmed` claim should also carry a
`source_url` or a `source_path` (required under `--strict`).

The inline claims in `accomplishments.md` (§7) and `projects/<slug>/evidence.md`
(§12) accept the same optional keys (`evidence_type`, `title`, `description`,
`verified_at`, `external_id`); they are linked by position, so they need no
`company`/`project` keys.

### Evidence types

| `evidence_type` | Use it for | Example |
| --- | --- | --- |
| `project` | shipped work inside this portfolio | the scheduler rewrite itself |
| `repository` | a public code repo backing the claim | a GitHub repo |
| `article` | a written piece (blog, tutorial, docs) | the sharding blog post |
| `talk` | a talk or workshop recording | a conference talk |
| `documentation` | general written backing (default) | a design doc |
| `certificate` | a credential or certification | a course certificate |
| `metric` | a measured number | batch runtime 6h → 40min |
| `screenshot` | a visual capture | a dashboard screenshot |

One realistic example per type (bodies shortened; every file also carries the
`company`/`project` link and the prose body):

```markdown
---
type: evidence
slug: difference-engine-shipped
claim: Shipped the sharded Difference Engine scheduler to production.
confidence: confirmed
evidence_type: project
title: Difference Engine shipped
project: difference-engine
company: analytical-engines
---
```

```markdown
---
type: evidence
slug: difference-engine-repo
claim: The scheduler rewrite is developed in the open with CI green.
confidence: probable
evidence_type: repository
title: difference-engine on GitHub
external_id: davidclinton/difference-engine
project: difference-engine
source_url: https://github.com/davidclinton/difference-engine
---
```

```markdown
---
type: evidence
slug: difference-engine-sharding-post
claim: The sharding scheme is written up for other engineers to reuse.
confidence: confirmed
evidence_type: article
title: Scheduler sharding, blog post
verified_at: 2024-07-01
external_id: scheduler-sharding
project: difference-engine
source_url: https://analytical-engines.example.com/blog/scheduler-sharding
---
```

```markdown
---
type: evidence
slug: difference-engine-talk
claim: Presented the scheduler rewrite and its incident history.
confidence: probable
evidence_type: talk
title: Scheduling at scale, meetup talk
project: difference-engine
source_url: https://example.com/talks/scheduling-at-scale
---
```

```markdown
---
type: evidence
slug: difference-engine-design-doc
claim: The sharding design was reviewed before implementation.
confidence: confirmed
evidence_type: documentation
title: Sharding design doc
source_path: sources/documents/sharding-design.pdf
project: difference-engine
---
```

```markdown
---
type: evidence
slug: postgres-certified
claim: Holds an advanced PostgreSQL operations certificate.
confidence: confirmed
evidence_type: certificate
title: PostgreSQL operations certificate
verified_at: 2023-11-15
external_id: postgresql-ops-2023
company: analytical-engines
---
```

```markdown
---
type: evidence
slug: difference-engine-throughput
claim: Reduced nightly billing job runtime by 89% (six hours to forty minutes).
confidence: confirmed
evidence_type: metric
title: Billing batch runtime cut by 89%
verified_at: 2024-07-01
company: analytical-engines
project: difference-engine
source_url: https://analytical-engines.example.com/blog/scheduler-sharding
---
```

```markdown
---
type: evidence
slug: difference-engine-dashboard-shot
claim: The incident-free billing dashboard for H1 2024.
confidence: probable
evidence_type: screenshot
title: H1 billing dashboard
source_path: sources/screenshots/billing-dashboard-h1.png
project: difference-engine
---
```

## 15. Ingest order and idempotency

Files are ingested in phases: person → skills → experience → projects →
standalone evidence → links → knowledge chunks. Each phase may reference what
earlier phases created, which is why the ordering is not configurable.

Every row is keyed on a natural key:

| Model | Natural key |
| --- | --- |
| `Person` | `slug` |
| `Company` | `slug` |
| `Employment` | `(person, company)` |
| `Skill` | `slug` |
| `Technology` | `slug` |
| `Project` | `slug` |
| `Evidence` | `slug` |
| `KnowledgeChunk` | `source_path` (one file, one chunk) |

Running the command twice therefore updates in place: the second run reports
`created = 0` and a `skipped` count for every row it re-read.
