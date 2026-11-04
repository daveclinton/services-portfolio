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
``SKIP LOCKED``, and each worker writes results through an idempotent upsert so
a retry can never create a second invoice.
