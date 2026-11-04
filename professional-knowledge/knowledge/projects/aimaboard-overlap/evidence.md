---
type: project-evidence
project: aimaboard-overlap
claims:
  - slug: aimaboard-full-stack-source
    claim: Built the original AimaBoard/Overlap scheduling repository with a Django REST backend and Next.js frontend.
    confidence: confirmed
    evidence_type: repository
    title: AimaBoard source repository
    source_url: https://github.com/daveclinton/aimaboard
  - slug: aimaboard-timezone-domain
    claim: Implemented IANA-time-zone normalization to UTC and interval-overlap calculation behind an account-free, token-based scheduling workflow.
    confidence: confirmed
    evidence_type: repository
    title: Availability normalization and overlap services
    source_url: https://github.com/daveclinton/aimaboard/tree/main/apps/scheduling/services
  - slug: aimaboard-authorship
    claim: David Clinton is the sole Git author in the audited repository history.
    confidence: confirmed
    evidence_type: repository
    title: AimaBoard authorship history
    source_url: https://github.com/daveclinton/aimaboard
---

Verified from the authenticated private GitHub repository, manifests,
documentation, implementation source and Git history on 2026-09-21. The record
describes implemented source and does not claim a public production launch.
