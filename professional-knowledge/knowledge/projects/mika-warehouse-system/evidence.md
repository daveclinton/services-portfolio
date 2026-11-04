---
type: project-evidence
project: mika-warehouse-system
claims:
  - slug: mika-warehouse-shipped
    claim: Shipped the Mika warehouse management system (com.dawda.mikawms) to the Google Play Store; Kotlin app backed by on-premise SAP Business One, SAP HANA, PostgreSQL and Redis services.
    confidence: confirmed
    evidence_type: project
    title: Warehouse system shipped to Play Store
    source_url: https://play.google.com/store/apps/details?id=com.dawda.mikawms
  - slug: mika-warehouse-backend-source
    claim: Built a multi-tenant FastAPI warehouse backend with role-based workflows, tenant-isolated databases, SAP sessions, HANA connections, notifications, migrations, tests and an operator CLI.
    confidence: confirmed
    evidence_type: repository
    title: WMS backend source
    source_path: /Users/daveclintonn/dawda-workspace/wms-backend
  - slug: mika-android-backend-integration
    claim: Integrated the Kotlin app with local, emulator and production backend environments using Retrofit, OkHttp, Moshi, authentication interceptors, secure token storage, offline queues and network diagnostics.
    confidence: confirmed
    evidence_type: repository
    title: MikaWMS Android networking and data layers
    source_path: /Users/daveclintonn/AndroidStudioProjects/MikaWMS/app/src/main
  - slug: mika-honeywell-scanning
    claim: Implemented Honeywell hardware scanning through Data Collection Intent/AIDC claim, release and control APIs, with device detection and barcode broadcasts; also implemented CameraX and ML Kit scanning.
    confidence: confirmed
    evidence_type: repository
    title: Honeywell and camera scanning implementation
    source_path: /Users/daveclintonn/AndroidStudioProjects/MikaWMS/app/src/main/java/com/dawda/mikawms/scanner
  - slug: mika-android-cicd
    claim: Built GitHub Actions workflows for signed APK/AAB builds, Firebase App Distribution, Google Play closed and production tracks, unique CI versioning and targeted Play update prompts.
    confidence: confirmed
    evidence_type: repository
    title: Android build and release automation
    source_path: /Users/daveclintonn/AndroidStudioProjects/MikaWMS/.github/workflows
  - slug: mika-android-authorship
    claim: David Clinton is the dominant Git author of the MikaWMS Android repository.
    confidence: confirmed
    evidence_type: repository
    title: MikaWMS Git authorship history
    source_path: /Users/daveclintonn/AndroidStudioProjects/MikaWMS/.git
  - slug: mika-warehouse-outcome
    claim: Automated the creation of SAP Business One transactional documents—including delivery notes, goods issues and goods receipts—after their base documents were scanned, replacing manual entry through the SAP Business One client.
    confidence: confirmed
    evidence_type: metric
    title: Warehouse document automation outcome
    description: Confirmed by David Clinton from firsthand implementation and operational knowledge.
    source_path: sources/attestations/david-clinton-2026-09-21.md
---

The operational outcome was confirmed firsthand by David Clinton on 2026-09-21.
