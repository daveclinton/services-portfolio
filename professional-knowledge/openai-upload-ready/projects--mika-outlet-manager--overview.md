---
type: project-overview
slug: mika-outlet-manager
name: Mika Outlet Manager
problem: |
  The shop sales and stock-count system for Kenya and Rwanda needed an owner after its previous developer left.
context: |
  FastAPI system taken over from a previous developer. David maintains it and did not write the original version.
skills:
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: sap-business-one-integration
    name: SAP Business One integration
    category: engineering
  - slug: linux-infrastructure-networking
    name: Linux infrastructure and networking
    category: infrastructure
technologies:
  - slug: fastapi
    name: FastAPI
    category: web framework
  - slug: mysql
    name: MySQL
    category: database
  - slug: celery
    name: Celery
    category: background jobs
  - slug: rabbitmq
    name: RabbitMQ
    category: message broker
  - slug: sap-business-one
    name: SAP Business One
    category: erp
---

Shop teams in Kenya and Rwanda kept the system they depend on after its developer
left. Problems that stopped their work were fixed, and the handbook means the company
does not depend on one person's memory.

## How it was built

Took over the system shop teams in Kenya and Rwanda use for outlet visits, stock
counts and sales orders. Moved its code into version control with passwords
removed, fixed live problems such as one-time codes not reaching customers, and
corrected the records from a Rwanda stock count covering 1,213 units while
keeping five later sales intact.

Wrote a handbook that covers the company's applications, servers, support steps
and past problems so that other people can run and support them.
