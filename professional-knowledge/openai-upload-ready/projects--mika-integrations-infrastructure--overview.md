---
type: project-overview
slug: mika-integrations-infrastructure
name: Mika Integrations and Infrastructure
problem: |
  Mika's operational applications needed reliable links to ERP, fleet,
  communications, devices, storage, and secure on-premise production services.
context: |
  Source-audited from the deployment scripts, nginx-vsvr26, wialon, scraping,
  send-sms, openapi, and zte-socket-test.
skills:
  - slug: full-stack-development
    name: Full-stack development
    category: engineering
  - slug: linux-infrastructure-networking
    name: Linux infrastructure and networking
    category: infrastructure
---

Built and operated Linux services using Nginx, systemd, Gunicorn, Uvicorn,
Django Q, Docker Compose, Bash, Git/SSH deployment, UFW, journal logs, health
checks, database backups, release directories, symlink activation, and code
rollback. Configured internal DNS and Host routing, LAN and DMZ entry points,
TLS termination boundaries, proxy headers, CORS/CSRF/trusted-host policy, Unix
sockets, TCP connectivity, and scheduled services and timers.

Integration work includes Wialon HTTP/JSON reports synchronized into SAP HANA;
ZTE device connectivity testing over TCP/SSH; Meta WhatsApp OpenAPI use;
Firebase notifications; Africa's Talking SMS; WAHA/WhatsApp and SendGrid;
Playwright/httpx scraping; and SAP-keyed asset preparation for DigitalOcean
Spaces/S3-compatible object storage.

## External services and APIs

- **Enterprise and operations:** SAP Business One Service Layer, SAP HANA,
  Wialon telematics, ZKTeco attendance devices and Honeywell AIDC scanners.
- **Messaging:** Meta WhatsApp Cloud API and webhooks, WAHA, Africa's Talking
  SMS and Firebase Cloud Messaging.
- **Email:** SendGrid and SMTP-based transactional delivery.
- **Cloud and data:** DigitalOcean Spaces/S3-compatible object storage and
  Mapbox geocoding/maps.
- **Distribution:** Firebase App Distribution, Google Play Console and the
  Android Publisher API.
