---
type: project-technical-decisions
project: difference-engine
results:
  - Nightly runtime fell from six hours to forty minutes.
  - Billing incidents dropped from roughly two per month to none over six months.
---

We kept PostgreSQL as the queue instead of adding a broker: the team already
operated it well, ``SKIP LOCKED`` gave us safe concurrent claims, and one fewer
piece of infrastructure was worth more than a small throughput win. Retries are
safe because invoice writes are upserts on a natural key.
