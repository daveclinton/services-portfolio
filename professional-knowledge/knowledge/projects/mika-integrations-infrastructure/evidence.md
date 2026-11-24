---
type: project-evidence
project: mika-integrations-infrastructure
claims:
  - slug: mika-linux-deployment
    claim: Deployed and operated Mika services on Linux with Nginx, systemd, Gunicorn, Uvicorn, Docker Compose, UFW, health checks, backups and rollback workflows.
    confidence: confirmed
    evidence_type: repository
    title: The main platform and service deployment repositories
    source_path: sources/attestations/david-clinton-2026-11-23.md
  - slug: mika-networking
    claim: Configured reverse proxies, internal DNS/host routing, LAN and DMZ entry points, TLS termination boundaries, HTTP forwarding, Unix sockets, firewall rules and TCP/SSH device connectivity.
    confidence: confirmed
    evidence_type: repository
    title: Nginx, DMZ and device connectivity configuration
    source_path: /Users/daveclintonn/dawda-workspace/nginx-vsvr26
  - slug: mika-wialon-integration
    claim: Built Wialon HTTP API reporting, SAP HANA synchronization and reconciliation with retries, deduplication, watermarks, transactions, dry runs and systemd scheduling.
    confidence: confirmed
    evidence_type: repository
    title: Wialon reports and SAP synchronization
    source_path: /Users/daveclintonn/dawda-workspace/wialon
  - slug: mika-product-data-pipeline
    claim: Built a Playwright/httpx product scraper and SAP-keyed image pipeline targeting DigitalOcean Spaces-compatible object storage.
    confidence: confirmed
    evidence_type: repository
    title: Product scraping and asset pipeline
    source_path: /Users/daveclintonn/dawda-workspace/scraping
  - slug: mika-external-services
    claim: Integrated SAP Business One Service Layer, SAP HANA, Wialon, Meta WhatsApp Cloud API/webhooks, WAHA, Africa's Talking, Firebase Cloud Messaging, SendGrid, SMTP, Mapbox, DigitalOcean Spaces and Google Play delivery APIs.
    confidence: confirmed
    evidence_type: repository
    title: Mika external-service integrations
    source_path: /Users/daveclintonn/dawda-workspace
---

Evidence was verified locally on 2026-09-21. The vendored Meta OpenAPI
repository and third-party admin template are supporting references, not claims
of original authorship.
