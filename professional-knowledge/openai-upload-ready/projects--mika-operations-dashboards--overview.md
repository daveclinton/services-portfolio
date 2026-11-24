---
type: project-overview
slug: mika-operations-dashboards
name: Mika Operations and TV Dashboards
problem: |
  Operational teams needed secure, continuously available dashboard views over
  SAP, attendance, reviews, and business data.
context: |
  Source-audited from dawda-dashboards, tv-dashboards-backend,
  free-nextjs-admin-dashboard, ui-playground, and mika-care.
skills:
  - slug: data-visualization
    name: Data visualization
    category: engineering
  - slug: frontend-development
    name: Frontend development
    category: engineering
---

Managers and teams can see attendance, deliveries and customer complaints on one
screen without asking someone to prepare a report. This helps them notice work that
needs attention.

## How it was built

Built Vue 3/Vite and React/Next.js dashboard surfaces using TypeScript, Pinia,
ECharts, Recharts/ApexCharts, Tailwind CSS, and reusable UI components. Built a
FastAPI backend over PostgreSQL, Redis, SAP HANA, and MSSQL, with explicit
read/admin access boundaries, CORS/trusted-host policy, structured logging,
health endpoints, and scraper integrations.

Verified delivery tooling includes Vitest, Playwright, ESLint, Ruff, pytest,
Nginx proxying, and systemd services on Linux.
