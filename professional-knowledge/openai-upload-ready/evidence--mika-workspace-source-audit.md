---
type: evidence
slug: mika-workspace-source-audit
claim: Source audit confirms the mapped Mika applications, integrations and infrastructure projects in the company workspace.
confidence: confirmed
evidence_type: repository
title: Mika workspace source audit
company: mika
verified_at: 2026-09-21
source_path: /Users/daveclintonn/dawda-workspace
---

# Mika workspace source audit

The user confirmed that every project in this workspace belongs to Mika. The
following mapping records what each directory substantiates. Presence alone is
not treated as authorship: Git history, manifests, source, tests, documentation,
and deployment files were inspected where available.

| Directory | Verified role in the Mika estate |
|---|---|
| `dawda-dashboards` | Vue 3/Vite operational dashboards, tests, Nginx and systemd delivery |
| `e-warranty` | Azone and Oryx Next.js/React eWarranty applications with Better Auth, Drizzle/Prisma and PostgreSQL |
| `free-nextjs-admin-dashboard` | Third-party Next.js dashboard template evaluated or adapted; not claimed as original work |
| `mika-care` | Legacy PHP after-sales, service, delivery, attendance, document and reporting workflows |
| `nginx-vsvr26` | Production Nginx reverse-proxy, host routing and TLS configuration |
| `openapi` | Vendored Meta WhatsApp OpenAPI specification used as an integration reference; not authored by David |
| `main-platform` | Django/DRF enterprise backend and Next.js administration console |
| `platform-deploy` | Linux bootstrap, release deployment, Nginx, systemd, Gunicorn, worker and DMZ scripts |
| `scraping` | Playwright/httpx product scraping and SAP-keyed object-storage asset preparation |
| `send-sms` | Python SMS campaign preparation and delivery automation |
| `tv-dashboards-backend` | FastAPI dashboard service over PostgreSQL, Redis, SAP HANA and MSSQL |
| `ui-playground` | Next.js/React/shadcn interface prototyping and data-table/chart exploration |
| `wialon` | Fleet-report extraction, SAP HANA sync, reconciliation and scheduled execution |
| `wms-backend` | Multi-tenant FastAPI warehouse backend, integrations, operator CLI and test suite |
| `zte-socket-test` | Python TCP/SSH connectivity utility for ZTE equipment using Paramiko |
| `../AndroidStudioProjects/MikaWMS` | Native Kotlin warehouse app, Honeywell scanning, backend integration, geofencing, tests and automated Firebase/Google Play releases |

## Authorship evidence

Local Git history identifies `daveclinton`/David Clinton as the dominant author
of `dawda-dashboards`, `main-platform`, `platform-deploy`, `scraping`,
`tv-dashboards-backend`, `wialon`, and `wms-backend`. Third-party repository
history is explicitly excluded from original-authorship claims.

The separate MikaWMS Android repository identifies `daveclinton` as the dominant
author and provides direct evidence for the native client and its CI/CD system.

## Evidence standard

Claims derived from this audit may be marked `confirmed` when their
`source_path` points to the relevant repository. Business impact and numerical
outcomes still require operational metrics; source code proves implementation,
not adoption or measured results.
