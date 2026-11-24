---
type: project-overview
slug: mika-enterprise-platform
name: Mika Enterprise Operations Platform
problem: |
  Warehouse, warranty, after-sales, staff, and operational processes needed a
  shared software foundation connected to SAP and usable across several group
  companies and client applications.
context: |
  Source-audited from the main platform, WMS backend, mika-care, e-warranty, and
  related repositories in the Mika workspace.
skills:
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: api-documentation
    name: API documentation
    category: communication
---

This platform gives Mika's teams one place to follow sales, stock, deliveries,
warranties and repairs. Employees spend less time typing the same information
twice, and the records stay separate for each company. This helps Mika serve
thousands of customers across Kenya, Uganda and Rwanda.

## How it was built

Built a tenant-aware enterprise platform using Django 5, Django REST Framework,
FastAPI, PostgreSQL, Redis, SAP Business One Service Layer, SAP HANA, and MSSQL.
The platform supports warehouse documents and scanning, eWarranty registrations
and certificates, after-sales processes, user onboarding and roles,
notifications, geofencing, analytics, and scheduled automation.

Client surfaces include Kotlin Android applications, Next.js 16/React 19 admin
and warranty applications, and legacy PHP operational modules. APIs use JWT,
API-key and OTP flows, tenant isolation, throttling, structured logging,
OpenAPI/Swagger/ReDoc schemas, and production-shaped mock services for offline
development.
