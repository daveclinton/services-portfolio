---
type: project-overview
slug: mika-warehouse-system
name: Mika Warehouse Management System
problem: |
  Warehouse operations across picker, mantrap and admin roles needed mobile
  flows tied into SAP inventory data instead of disconnected manual steps.
context: |
  Kotlin app with Jetpack Compose, Material 3 and Hilt, deployed to the Play
  Store through an automated GitHub Actions pipeline; Honeywell Data Collection
  Intent/AIDC APIs, CameraX and ML Kit barcode scanning with FCM push for floor
  workflows. FastAPI/PostgreSQL/Redis backend against SAP Business One and SAP
  HANA, hosted in the self-managed on-premise data center.
skills:
  - slug: mobile-development
    name: Mobile development
    category: engineering
technologies:
  - slug: kotlin
    name: Kotlin
    category: language
  - slug: android
    name: Android
    category: platform
  - slug: jetpack-compose
    name: Jetpack Compose
    category: mobile framework
  - slug: fastapi
    name: FastAPI
    category: web framework
  - slug: postgresql
    name: PostgreSQL
    category: database
  - slug: redis
    name: Redis
    category: datastore
  - slug: firebase
    name: Firebase
    category: platform
  - slug: honeywell-aidc
    name: Honeywell Data Collection Intent / AIDC APIs
    category: hardware integration
  - slug: camerax
    name: CameraX
    category: camera
  - slug: ml-kit
    name: ML Kit Barcode Scanning
    category: computer vision
  - slug: retrofit
    name: Retrofit / OkHttp / Moshi
    category: API integration
  - slug: workmanager
    name: WorkManager
    category: background processing
  - slug: github-actions
    name: GitHub Actions
    category: CI/CD
  - slug: firebase-app-distribution
    name: Firebase App Distribution
    category: mobile delivery
  - slug: google-play
    name: Google Play Console and Android Publisher API
    category: mobile delivery
---

Employees used to type stock documents by hand. They now scan the items and the
system creates the document after checking it. This saves repeated work and helps
the company know what it has received and sent out. The app keeps work on the
device when the connection is weak and sends it later, so the records stay in
sync.

## How it was built

Warehouse management system at Mika: role-based Kotlin Android app on the
Play Store with scanner-driven floor workflows, geofenced warehouse presence,
push notifications, offline-safe background work, and secure API integration.
It is backed by FastAPI services on PostgreSQL/Redis connected to SAP inventory
data and shipped through automated Firebase and Google Play release pipelines.
Scanning base documents triggers automatic creation of SAP Business One
delivery notes, goods issues and goods receipts, replacing manual entry through
the SAP Business One client.
