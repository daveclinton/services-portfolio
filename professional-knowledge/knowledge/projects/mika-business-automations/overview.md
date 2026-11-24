---
type: project-overview
slug: mika-business-automations
name: Mika Business Automations
problem: |
  Staff retyped orders between group companies and entered vehicle trips by hand.
context: |
  First built as a single Go service, later moved into the main platform in Python on its own background worker.
skills:
  - slug: sap-business-one-integration
    name: SAP Business One integration
    category: engineering
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: data-quality-reconciliation
    name: Data quality and reconciliation
    category: engineering
technologies:
  - slug: go
    name: Go
    category: language
  - slug: python
    name: Python
    category: language
  - slug: django
    name: Django 5 / Django REST Framework
    category: web framework
  - slug: django-q2
    name: Django Q2
    category: background jobs
  - slug: wialon
    name: Wialon HTTP API
    category: telematics
  - slug: sap-hana
    name: SAP HANA
    category: database
  - slug: docker-compose
    name: Docker Compose
    category: containers
---

Employees no longer have to copy every order from one company's records to another.
Staff estimated that each order took 20 minutes to type. People can check the result
before it is saved, and unusual orders still go to a person.

## How it was built

Automated order entry between group companies, the recording of vehicle trips and
the reconciliation of invoices paid with loyalty points. Staff estimate that each
order took 20 minutes to type by hand.

Every run is logged and can be previewed before it saves anything. The same job
cannot run twice at once for a company, late runs are not repeated, and unusual
cases go to a person for review. The vehicle trip records hold about 133,000
entries.

Wrote the first version in Go with PostgreSQL and Docker. Moved it into the main platform
to reduce the number of systems to support, keeping its schedules, history and
settings.
