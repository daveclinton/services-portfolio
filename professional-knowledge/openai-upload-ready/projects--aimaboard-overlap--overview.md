---
type: project-overview
slug: aimaboard-overlap
name: AimaBoard / Overlap Scheduling Platform
problem: |
  Groups in different time zones needed a lightweight way to submit
  availability and identify the time slots when the most people were free.
context: |
  Original full-stack project built as a focused scheduling product. The
  backend normalizes local availability to UTC and calculates group overlap;
  the frontend provides a shareable, account-free workflow.
skills:
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: api-design
    name: API and domain design
    category: engineering
technologies:
  - slug: django
    name: Django and Django REST Framework
    category: backend
  - slug: postgresql
    name: PostgreSQL
    category: database
  - slug: nextjs
    name: Next.js 16 App Router
    category: web framework
  - slug: react
    name: React 19
    category: web framework
  - slug: tailwind-css
    name: Tailwind CSS 4
    category: CSS framework
  - slug: docker
    name: Docker Compose
    category: infrastructure
  - slug: pytest
    name: pytest and pytest-django
    category: testing
---

Designed a scheduling system around explicit domain boundaries for groups,
participants, availability normalization, and overlap calculation. Local times
and IANA time zones are converted at the API boundary, while business logic
operates exclusively on UTC intervals. Share and participant tokens support an
account-free collaboration flow.

The repository includes a documented REST API, PostgreSQL data model, Docker
Compose environment, automated backend testing, and a Next.js/React frontend.
