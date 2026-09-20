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
``SELECT ... FOR UPDATE SKIP LOCKED`` claim, and invoice writes are idempotent
on the tenant/invoice-period natural key.
