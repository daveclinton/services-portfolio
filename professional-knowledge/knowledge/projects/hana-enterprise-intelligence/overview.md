---
type: project-overview
slug: hana-enterprise-intelligence
name: HANA Enterprise Intelligence
problem: |
  Enterprise teams needed a controlled way to ask natural-language questions
  of SAP HANA data without exposing unrestricted database access or requiring
  every user to write SQL.
context: |
  Multi-tenant AI analytics system combining a Django/DRF query backend with a
  Next.js conversational analytics frontend. Each company connects its own SAP
  HANA database and OpenAI credentials and publishes approved schemas as team
  workspaces.
skills:
  - slug: ai-integration
    name: AI product integration
    category: engineering
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: enterprise-data-integration
    name: Enterprise data integration
    category: engineering
technologies:
  - slug: sap-hana
    name: SAP HANA and hdbcli
    category: enterprise database
  - slug: django
    name: Django and Django REST Framework
    category: backend
  - slug: openai
    name: OpenAI API
    category: AI integration
  - slug: nextjs
    name: Next.js 16 and React 19
    category: web framework
  - slug: vercel-ai-sdk
    name: Vercel AI SDK
    category: AI framework
  - slug: cryptography
    name: Fernet field-level encryption
    category: security
---

Built an enterprise analytics workflow that discovers SAP HANA schemas,
publishes selected schemas as workspaces, curates approved views, converts
business questions into SAP HANA SQL, validates generated statements, executes
read-only queries, and returns tabular or chart-oriented results through a chat
experience.

Security boundaries include company and workspace permissions, encrypted HANA
and OpenAI secrets, approved-view catalogs, schema-aware introspection, SQL
validation, read-only query enforcement, and a controlled HANA connection
gateway with retries and typed failures.
