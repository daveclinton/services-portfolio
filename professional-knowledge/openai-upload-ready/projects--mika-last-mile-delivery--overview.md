---
type: project-overview
slug: mika-last-mile-delivery
name: Mika Last-Mile Delivery
problem: |
  Deliveries to customers needed one record from the order to the customer's door, with drivers, vehicles, stops and proof of delivery in one place.
context: |
  Last-mile module in SapForge, with a web console for planners and interfaces for drivers.
skills:
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: sap-business-one-integration
    name: SAP Business One integration
    category: engineering
  - slug: mobile-development
    name: Mobile development
    category: engineering
technologies:
  - slug: django
    name: Django 5 / Django REST Framework
    category: web framework
  - slug: postgresql
    name: PostgreSQL
    category: database
  - slug: sap-hana
    name: SAP HANA
    category: database
  - slug: nextjs
    name: Next.js 16
    category: web framework
  - slug: maplibre
    name: MapLibre GL
    category: maps
---

Built the delivery module that takes orders from several sources and follows each
one through warehouse allocation, route planning, vehicle loading, driver
assignment and delivery. It records delivery attempts, proof of delivery, cash
collected, live driver location and problems on the road.

Loading plans take vehicle space and stop order into account. Every change is
kept in an audit history, and repeated requests do not create the same order
twice. Access is limited by role, company and branch.
