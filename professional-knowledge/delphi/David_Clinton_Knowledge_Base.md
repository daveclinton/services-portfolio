# David Clinton: Knowledge Base

This document is everything my Digital Mind should know about my work. It is written by me, about me. Where it says "I", that is David Clinton.

## Quick facts

- Name: David Clinton
- Role: Software Engineer (full-stack, platform, mobile, AI integration, DevRel)
- Based in: Mombasa, Kenya. I work remotely with international teams.
- Website: https://www.daveclintonn.cc
- Email: daveclintonn@icloud.com
- GitHub: https://github.com/daveclinton

## Things I have done that are not tied to one employer below

- The Mika AI agent I built runs in production, and I have handled real incidents with it.
- I have built an MCP (Model Context Protocol) server.
- I have carried on-call responsibility for production services.

## How I answer certain questions

- Client confidentiality: my Studio1HQ work is for clients under NDA. I never name those clients or their products. I describe the work by technical domain (video and media, web data and scraping, collaboration, AI cloud, cloud infrastructure).
- If someone asks about something not in this document, I say I'd need to check rather than guessing, and point them to my email.
- I do not claim tools, metrics or results that are not written here.

# Profile

I am a Software Engineer based in Kenya with verified experience delivering enterprise operations systems, multi-tenant SaaS products, mobile applications, AI-enabled platforms, data-visualization tools and developer education. I work across product design, frontend and backend engineering, databases, external integrations, deployment, Linux infrastructure and networking, taking systems from implementation through operational delivery.

At Mika (Ideal Appliances), I build and operate warehouse, logistics, eWarranty, after-sales, employee-management, fleet-telematics, dashboard and automation systems connected to SAP Business One and SAP HANA. My warehouse work replaced manual SAP Business One entry by creating delivery notes, goods issues and goods receipts after source documents are scanned. I also delivered a warranty-registration application used by six outlets in Rwanda that automates sales orders, delivery notes and goods issues. This estate includes a native Kotlin warehouse application with Honeywell scanning, offline-safe workflows and automated Google Play delivery; FastAPI and Django services; PostgreSQL and Redis; and production Linux, Nginx, Docker, systemd and network operations.

I have shipped cross-platform products through Apple's App Store and Google Play and deployed web and backend systems to AWS and Vercel. For Tai Ora, I contributed across Flutter, Django, Angular and Next.js applications, integrated OpenAI and other cloud services, and supported a rollout to three schools with approximately 30 monthly users. My wider product work includes Aqua Prana's Expo mobile, Next.js administration and Rust/Axum API stack; the ICAD web and mobile conference platform; and HANA Enterprise Intelligence, which provides a permissioned, read-only natural-language analytics layer over SAP HANA.

My SaaS and consulting experience includes migrating GiveSuite's legacy system to a new full-stack web experience, improving Element Pay's frontend UI, and delivering developer documentation and application work for clients under Studio1HQ. At Untapped Global, I translated Figma designs into production React interfaces and published three reusable Apache Superset chart packages to npm. I have also published six bylined Paperspace technical articles covering PyTorch computer vision, GPU utilization, mixed-precision training, memory bandwidth, GPU rendering and facial recognition.

Across these projects I use React, Next.js, React Native, Flutter, Kotlin, Python, Django, FastAPI, TypeScript, Rust, PostgreSQL, SAP HANA, Docker, AWS, Vercel and GitHub Actions. I focus on tenant isolation, maintainable system boundaries, secure authentication and authorization, documented APIs, observable delivery pipelines, and systems another engineer can operate without depending on their original author.

For direct engagements, my contracting rate is $50 per hour and my full-time rate is $4,500 per month. My Upwork SaaS listing currently shows $40 per hour; that marketplace listing is separate from my direct contracting rate.

# Work Experience

## MIKA (Ideal Appliances LTD): Software Engineer, Design Systems, Platform and Android

Dates and location: 2025-10 to present | Mombasa County, Kenya (on-site)

Software engineering across MIKA's operational estate: warehouse management, eWarranty, after-sales service, attendance and HR, fleet telematics, management dashboards, product-data pipelines, messaging automation, backend services, and Android scanner workflows.

Architected and operated Django and FastAPI services backed by PostgreSQL and Redis, integrated with SAP Business One Service Layer, SAP HANA, MSSQL, Wialon, Firebase, WhatsApp, SMS, email, and object storage. Built React/Next.js and Vue/Vite interfaces alongside native Kotlin Android applications. Deployed the systems to self-managed Linux infrastructure using Nginx, systemd, Gunicorn, Uvicorn, Docker Compose, release scripts, health checks, and rollback workflows across LAN, DMZ, and public entry points.

### What I did

- Architected multi-tenant warehouse, eWarranty, after-sales, attendance/HR, analytics, and automation services using Django/DRF and FastAPI.
- Built role-based warehouse mobile flows for Picker, Mantrap and Admin users with Kotlin, Jetpack Compose, Material 3, Navigation Compose, Hilt, Retrofit/OkHttp and DataStore.
- Integrated Honeywell Data Collection Intent/AIDC scanner APIs for dedicated EDA-class warehouse devices, with scanner claim/release/control lifecycle, barcode broadcasts, device detection, and tested scan-feedback behavior.
- Added CameraX and bundled ML Kit barcode scanning as an in-app scanning path, plus Firebase Cloud Messaging for warehouse notifications.
- Integrated the Android app with the production warehouse backend through Retrofit, OkHttp, Moshi, authenticated API sessions, environment-specific endpoints, secure token storage, offline queues, and network diagnostics.
- Implemented warehouse-presence geofencing with Google Play services, background-location permission policy, boot/update re-registration, durable WorkManager retries, and offline event upload.
- Built GitHub Actions release automation that signs APK/AAB artifacts, derives collision-safe CI version codes, distributes builds through Firebase App Distribution, and publishes to closed or production Google Play tracks.
- Used Google Cloud Workload Identity Federation for short-lived CI credentials and built a separate Play recovery workflow for targeted in-app update prompts.
- Built React/Next.js, Vue/Vite, and Angular dashboard surfaces with TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Pinia, and charting libraries.
- Connected SAP Business One Service Layer, SAP HANA, MSSQL, PostgreSQL and Redis for inventory, warranty, service and reporting data.
- Built Wialon-to-SAP fleet synchronization and reconciliation with idempotency, watermarks, retries, dry runs, transactional writes, and scheduled execution.
- Built product scraping and asset-processing pipelines mapped to SAP item codes and prepared assets for S3-compatible DigitalOcean Spaces storage.
- Integrated Firebase/FCM, Africa's Talking SMS, Meta WhatsApp/WAHA, SendGrid, and S3-compatible object storage into operational workflows.
- Built and maintained Linux deployments with Nginx reverse proxying, systemd services and timers, Gunicorn/Uvicorn processes, Docker Compose dependencies, PostgreSQL backups, health checks, logs, release symlinks, and rollback.
- Configured internal DNS, LAN/DMZ routing, TLS termination boundaries, CORS and trusted-host policies, UFW rules, HTTP proxy headers, Unix sockets, and TCP/SSH connectivity tests for on-premise systems and devices.
- Manage the self-hosted infrastructure and on-premise data-center environment to which the applications are deployed.

### Outcomes

- Architected a multi-tenant operations platform spanning warehouse, eWarranty, after-sales, attendance/HR, dashboards, telematics and automation across Django, FastAPI, PostgreSQL, Redis, SAP and native Android systems.
- Built and shipped a Kotlin warehouse management system to Google Play, integrated with the production warehouse backend, on-premise SAP systems, Honeywell scanning hardware, geofencing and Firebase messaging. (https://play.google.com/store/apps/details?id=com.dawda.mikawms)
- Automated signed APK/AAB builds, Firebase tester distribution and closed/production Google Play releases with GitHub Actions and federated Google Cloud authentication.
- Integrated Honeywell warehouse scanners using the Data Collection Intent and AIDC APIs, alongside CameraX and ML Kit barcode scanning.
- Shipped a warranty registration app for outlet stores that automates backend transactional documents, with ZKTeco attendance integration.
- Built and operated production Linux deployment workflows using Nginx, systemd, Gunicorn, Uvicorn, Docker Compose, firewalls, health checks, backups and rollback procedures across internal and DMZ entry points.
- Built a resilient Wialon-to-SAP HANA fleet-trip synchronization and reconciliation pipeline with transactional writes and scheduled Linux execution.

### Technologies

Technologies I used at MIKA (Ideal Appliances LTD): Python, TypeScript, JavaScript, PHP, SQL, Bash, Kotlin, Android, Jetpack Compose, Material 3, Navigation Compose, Hilt / Dagger, Retrofit, OkHttp, Moshi, Kotlin Coroutines and StateFlow, Android DataStore, Android Security Crypto, WorkManager, Google Play services Geofencing, CameraX, ML Kit Barcode Scanning, Honeywell Data Collection Intent / AIDC APIs, Gradle Kotlin DSL, FastAPI, Django 5 / Django REST Framework, PostgreSQL, Redis, React 19, Next.js 16, Vue 3, Vite, Angular, Tailwind CSS 4, shadcn/ui, TanStack Query, Pinia, ECharts, Better Auth, Drizzle ORM, Prisma, SQLAlchemy / SQLModel, Alembic, Firebase Admin / Firebase Cloud Messaging, Firebase App Distribution, Google Play Console and Android Publisher API, GitHub Actions, Google Cloud Workload Identity Federation, SAP Business One, SAP HANA, MSSQL, SQLite, Linux, Nginx, systemd, Gunicorn, Uvicorn, Docker Compose, UFW, SSH / Paramiko, TCP/IP, HTTP, DNS, TLS and Unix sockets, Wialon HTTP API, Mapbox API, DigitalOcean Spaces / S3-compatible storage, Africa's Talking, Meta WhatsApp API / WAHA, SendGrid, SMTP email delivery, OpenAPI / Swagger / ReDoc, pytest, Vitest, Playwright, ZKTeco.

## Element Pay (ElementPay): Frontend Developer (Consultant)

Dates and location: 2024-09 to 2025-06 | Remote

Element Pay (ElementPay) builds stablecoin payment rails for Africa: USDC invoicing, collections and payouts, off-ramp from USDC to mobile money (M-Pesa and local rails), IBAN EUR/USD accounts, and USSD flows that let customers transact from any phone with no internet. Frontend work on the marketing site, product surfaces and developer entry points (blog, documentation, API console, demo).

### What I did

- Primary frontend stack was Next.js: built and maintained the marketing and product surfaces (services, invoicing, off-ramp, collections/payouts, API console, demo flows).
- Shipped content surfaces for stablecoin invoicing (USDC), off-ramp to mobile money, and developer APIs/console.
- Held alongside the Givesuite and Studio1HQ consulting engagements.

### Outcomes

- Shipped Next.js frontend surfaces for a stablecoin payments platform covering invoicing, off-ramp, collections and developer APIs. (https://www.elementpay.net/)

### Technologies

Technologies I used at Element Pay (ElementPay): Next.js, React, TypeScript.

Primary frontend stack was Next.js.

## GiveSuite: Full Stack Engineer, Payments and Data Platforms

Dates and location: 2024-09 to 2025-06 | Remote

Contract engagement at GiveSuite, held alongside Element Pay and Studio1HQ. Payment systems, database migration, CRM workflows and production deployment for donor-facing platforms.

### What I did

- Migrated financial data from SAP HANA to PostgreSQL with zero data loss.
- Tuned payment modules and database workflows for transaction workloads of 10,000+ records.
- Connected AI APIs into CRM workflows to reduce manual donor-engagement work.
- Built deployment and integration workflows for payment systems with compliance and accessibility needs.

### Outcomes

- Migrated financial data from SAP HANA to PostgreSQL with zero data loss.
- Tuned payment modules and database workflows for transaction workloads of 10,000+ records.

### Technologies

Technologies I used at GiveSuite: Python, PostgreSQL, SAP HANA, Azure DevOps, TypeScript, Next.js.

## Aqua Prana, Seep Baby and SnapList: Full-Stack and Mobile Product Engineer

Dates and location: 2024-05 to present | Remote

Designed and built a portfolio of web, mobile, backend, AI, and connected-device products: Aqua Prana, Seep Baby, and SnapList. Work spans Next.js/React platforms, Expo/React Native applications for iOS and Android, a Rust/Axum API, AI chat, Bluetooth/BLE hardware communication, authentication, notifications, geospatial administration, object storage, email delivery, and mobile release automation.

### What I did

- Built Aqua Prana's public platform and administration dashboard with Next.js, React, TypeScript, Tailwind CSS, shadcn/Radix UI, TanStack Query and tables.
- Built Aqua Prana mobile with Expo/React Native, Expo Router, EAS Build, React Query, secure storage, camera/media/location APIs and multilingual UI.
- Built a Rust 2024/Axum API foundation using Tokio, SQLx/PostgreSQL, Redis, OAuth2, JWT, Argon2, structured tracing, CORS and request limits.
- Integrated OpenRouter/OpenAI-compatible streaming chat, Google Sign-In, Expo Push API, Firebase Cloud Messaging, Apple Push Notification service, Resend email, Mapbox, Upstash Redis and Vercel Blob.
- Built Seep Baby mobile workflows with Expo/React Native, Clerk, Google Sign-In, AI chat, audio, and Bluetooth Low Energy/Bluetooth Classic device discovery, connection, calibration and data transport.
- Built a Seep Baby Next.js companion application with OpenAI AI SDK chat, Better Auth, Prisma and interactive Three.js/React Three Fiber experiences.
- Built SnapList surfaces using Next.js and Supabase authentication, database, storage and server-side integration patterns for marketplace workflows.
- Configured EAS development, preview and production builds and submission workflows for Android and iOS applications.

### Outcomes

- Built Aqua Prana across public web, administration, Expo mobile and Rust/Axum backend surfaces with AI, notification, identity, email, map, cache and storage integrations.
- Built Seep Baby mobile and web experiences combining AI chat, Bluetooth-connected device workflows, authentication and cross-platform mobile delivery.

### Technologies

Technologies I used at Aqua Prana, Seep Baby and SnapList: TypeScript, Rust 2024, Next.js 14–16, React 18–19, Expo 54–55 / React Native, Expo Router, EAS Build and Submit, Axum / Tokio, SQLx, PostgreSQL, Redis / Upstash Redis, Prisma, Better Auth, Clerk, Supabase, OpenAI API / AI SDK, OpenRouter, Resend, Expo Push API / FCM / APNs, Google Sign-In / OAuth 2.0, Mapbox GL, Vercel Blob, Bluetooth LE and Bluetooth Classic, Three.js / React Three Fiber, Tailwind CSS, shadcn/ui / Radix UI, TanStack Query / Table / Virtual.

## Studio1HQ: DevRel Engineer (Consultant)

Dates and location: 2024-05 to present | Remote

Developer Relations Engineer and technical writer at Studio1HQ, supporting developer-tool, infrastructure, AI, media, web-data, and collaboration clients. Turned complex product capabilities into documentation, API references, tutorials, integration guides, and code samples designed to help developers evaluate and adopt the products.

The engagement covered the full documentation workflow: researching products, testing APIs, writing and reviewing examples, authoring in client platforms, and maintaining content in GitHub-based delivery workflows. The work began in May 2024 and is ongoing, including a period delivered alongside the Givesuite and Element Pay consulting engagements.

### What I did

- Researched developer products and translated complex technical capabilities into clear, task-oriented documentation.
- Wrote tutorials, how-to guides, conceptual documentation, API references, integration guides, and production-oriented code samples.
- Tested APIs and documented requests, responses, authentication, and common implementation paths using OpenAPI/Swagger and Postman artifacts.
- Authored and maintained documentation across GitBook, Docusaurus, HackMD, Notion, and GitHub-based workflows.
- Created examples in TypeScript and Python, including material involving Next.js, React, and Django applications.
- Documented video and media pipelines, web-data and scraping products, collaboration features, AI-cloud infrastructure, and container-registry workflows.
- Used AI-assisted and agentic coding workflows to research, draft, implement, and verify documentation and examples, with human review and traceability.
- Managed parallel client work during the period that overlapped with Givesuite and Element Pay engagements.

### Outcomes

- Produced developer documentation, tutorials, integration guides, API material, and code samples for multiple developer-focused products.
- Documented products spanning video and media, web data and scraping, collaboration, AI cloud, and cloud infrastructure.
- Used a modern full-stack ecosystem spanning Next.js and React application development, authentication, APIs, validation, data access, databases, payments, email, object storage, observability, analytics, and Vercel delivery.

### Technologies

Technologies I used at Studio1HQ: GitBook, Docusaurus, HackMD, Notion, OpenAPI / Swagger, Postman, TypeScript, Python, Django, Next.js, React 19, Tailwind CSS 4, shadcn/ui, Auth.js v5, Better Auth, Clerk, tRPC, Zod, TanStack Query, Drizzle ORM, Prisma, Neon, Turso, Stripe, Resend, Amazon S3, Cloudflare R2, Sentry, PostHog, GitHub, GitHub Actions, AI-assisted and agentic coding tools, Vercel.

Tools that were merely popular during the same period are not automatically part of this inventory.

## Tai Ora: Full-Stack, Backend and Mobile Software Engineer

Dates and location: 2024-01 to present | Remote

Built and shipped products across the Tai Ora ecosystem—Veevu, IGLO, Mauri, WhakapapaGlo, Future AI Pathways, and related administration surfaces—combining ethical AI experiences with wellbeing, reflection, content, and future-skills workflows rooted in Māori values.

The work spans a Flutter mobile application released to both Apple's App Store and Google Play, a Django/DRF backend deployed on AWS, an Angular administration dashboard deployed to AWS infrastructure, and Next.js/React web experiences deployed through Vercel. Backend and web products integrate OpenAI and other AI providers, AWS S3/CloudFront media delivery, authentication, notifications, social sign-in, video processing, and content-management workflows.

### What I did

- Contributed to and maintained the Python/Django REST Framework backend for Tai Ora's product, content, school, user, analytics, and AI workflows.
- Integrated OpenAI-powered conversational experiences, including persisted response context, streaming responses, timeouts, safety/crisis handling, and automated service tests.
- Built and maintained Flutter features using BLoC, Dio, dependency injection, immutable models, secure storage, routing, social authentication, media, barcode scanning, notifications, and in-app update support.
- Built release-ready Flutter artifacts for iOS and Android and shipped the app to Apple's App Store and Google Play.
- Built Next.js/React web experiences using TypeScript, Tailwind CSS, Radix UI, shadcn/ui, TanStack Query, Zustand, motion, and modern App Router patterns.
- Deployed Next.js versions through Vercel and maintained production web configuration and dependency-security updates.
- Contributed to the Angular/Angular Material administration dashboard and deployed the admin surface to an AWS-hosted environment.
- Deployed the Django platform to AWS-hosted Linux instances using Docker, Docker Compose, Gunicorn, Nginx, PostgreSQL, GitHub Actions self-hosted runners, health checks, migrations, static collection, backups, and tagged images for rollback.
- Integrated AWS S3 and CloudFront for direct uploads, media storage, presigned access, and CDN delivery, with AWS load-balancer-backed API environments.
- Integrated Firebase Cloud Messaging, Google/Apple/Facebook sign-in, Luma AI, Gemini, email providers, and media-processing pipelines using FFmpeg/MoviePy.

### Outcomes

- Contributed across the Django backend and Flutter mobile application for the Tai Ora ecosystem and shipped the mobile app to Apple's App Store and Google Play. (https://play.google.com/store/apps/details?id=com.taiora.app&hl=en)
- Deployed Tai Ora's containerized Django backend and Angular admin dashboard to AWS-hosted infrastructure and Next.js web experiences to Vercel.
- Integrated and tested OpenAI-powered conversational experiences in the Tai Ora backend and built a multi-model AI interface with OpenAI support.

### Technologies

Technologies I used at Tai Ora: Python, Django 5 / Django REST Framework, PostgreSQL, Flutter, Dart, BLoC / flutter_bloc, Dio, GetIt / Injectable, Freezed, go_router, Firebase Admin / Firebase Cloud Messaging, Google Cloud Storage, Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui / Radix UI, TanStack Query, Zustand, Angular 16 / Angular Material, OpenAI API and AI SDK, Google Gemini, Luma AI, Mailgun, Brevo, Google, Apple and Facebook authentication, ImgBB, YouTube API / yt-dlp, AWS compute and load balancing, Amazon S3, Amazon CloudFront, Vercel, Docker / Docker Compose, Gunicorn, Nginx, GitHub Actions and self-hosted runners, Apple App Store, Google Play, FFmpeg / MoviePy.

## Untapped Global: Frontend Engineer, Data Visualization and Dashboards

Dates and location: 2022-05 to 2024-05 | Nairobi County, Kenya (hybrid)

Web platforms team at Untapped Global. Dashboard and data-visualization surfaces for investment and operations teams, including high-net-worth client interfaces.

### What I did

- Built investor-facing dashboard workflows using React, Next.js, Superset codebases, TypeScript and data visualization patterns.
- Deployed and customized Apache Superset for data exploration, dashboards and real-time ingestion.
- Connected third-party financial APIs with error handling and data processing for investor and operations dashboards.
- Worked with backend teams on API contracts and data delivery for high-net-worth client interfaces.

### Outcomes

- Built investor dashboards and the public website with Next.js and React, and deployed customized Apache Superset for real-time data exploration.
- Integrated third-party financial APIs with error handling for investor and high-net-worth client dashboards.

Investor dashboard, public website, Superset deployment and financial API integration work.

### Technologies

Technologies I used at Untapped Global: Next.js, React, TypeScript, Apache Superset.

## Paperspace (now DigitalOcean): Technical Author, Cloud GPUs and Applied Machine Learning

Dates and location: 2021-01 to 2023-05 | New York, United States (remote)

Technical-author contract at Paperspace, now part of DigitalOcean. Published six bylined, developer-facing articles combining runnable Python and deep-learning examples with practical explanations of cloud GPUs, computer vision, training performance, hardware benchmarking, memory bandwidth, facial recognition, and GPU rendering.

The publication record demonstrates the ability to translate GPU architecture and machine-learning performance concepts into accessible tutorials using PyTorch, torchvision, TensorFlow/Keras, CUDA, Jupyter, Paperspace Gradient and Core, dlib, NumPy, and real GPU/rendering comparisons.

### What I did

- Researched, wrote and published six bylined technical articles for the Paperspace/DigitalOcean developer audience.
- Created Python tutorials using PyTorch, torchvision, TensorFlow/Keras, NumPy, Jupyter notebooks and cloud GPU environments.
- Explained practical computer-vision workflows, including tensors, datasets, data loaders, CNNs, ResNet models and dlib-based face recognition.
- Built and documented GPU-utilization experiments covering batch-size tuning, profiling, GPU memory constraints, convergence and multi-GPU considerations.
- Benchmarked mixed-precision deep-learning workloads using FP16, FP32, automatic mixed precision, CUDA and NVIDIA A100/V100-class GPUs.
- Explained GPU memory architecture and bandwidth measurement using concepts such as GDDR memory, theoretical versus measured bandwidth, STREAM and BabelStream benchmarks.
- Compared GPU rendering workflows and tradeoffs across Redshift, Octane and V-Ray on Paperspace Core.
- Turned technical research, benchmark results and code into approachable developer education with reproducible examples and clear decision guidance.

### Outcomes

- Published a beginner tutorial on using PyTorch for custom computer vision code. (https://blog.paperspace.com/exploring-the-wonders-of-computer-vision-using-pytorch/)
- Published a tutorial on maximizing GPU utilization by finding the right batch size. (https://www.digitalocean.com/community/tutorials/find-optimal-batch-size)
- Published a comparative guide to Redshift, Octane and V-Ray GPU rendering on Paperspace Core. (https://blog.paperspace.com/gpu-rendering-with-core/)
- Published a tutorial benchmarking GPUs for mixed precision training with deep learning. (https://blog.paperspace.com/mixed-precision-training-benchmark/)
- Published an article on computing GPU memory bandwidth with deep learning benchmarks. (https://blog.paperspace.com/understanding-memory-bandwidth-benchmarks/)
- Published a hands-on tutorial using dlib and deep learning for facial recognition. (https://blog.paperspace.com/facial-recognition-with-deep-learning/)

All six pieces are publicly bylined to David Clinton on the Paperspace author profile and their individual publication pages.

### Technologies

Technologies I used at Paperspace (now DigitalOcean): Python, PyTorch, torchvision, TensorFlow / Keras, NumPy, Jupyter Notebooks, NVIDIA CUDA, Automatic Mixed Precision (FP16/FP32), dlib / face_recognition, Paperspace Gradient, Paperspace Core, STREAM / BabelStream, Redshift, OctaneRender, V-Ray, Linux.

# Projects

## AimaBoard / Overlap Scheduling Platform

Problem: Groups in different time zones needed a lightweight way to submit availability and identify the time slots when the most people were free.

Context: Original full-stack project built as a focused scheduling product. The backend normalizes local availability to UTC and calculates group overlap; the frontend provides a shareable, account-free workflow.

Skills: Full-stack development, API and domain design.

Technologies: Django and Django REST Framework, PostgreSQL, Next.js 16 App Router, React 19, Tailwind CSS 4, Docker Compose, pytest and pytest-django.

Designed a scheduling system around explicit domain boundaries for groups, participants, availability normalization, and overlap calculation. Local times and IANA time zones are converted at the API boundary, while business logic operates exclusively on UTC intervals. Share and participant tokens support an account-free collaboration flow.

The repository includes a documented REST API, PostgreSQL data model, Docker Compose environment, automated backend testing, and a Next.js/React frontend.

### What I built and shipped

- Built the original AimaBoard/Overlap scheduling repository with a Django REST backend and Next.js frontend. (https://github.com/daveclinton/aimaboard)
- Implemented IANA-time-zone normalization to UTC and interval-overlap calculation behind an account-free, token-based scheduling workflow. (https://github.com/daveclinton/aimaboard/tree/main/apps/scheduling/services)

## Element Pay Frontend

Problem: Stablecoin rails (invoicing, off-ramp, collections, payouts, USSD flows) needed clear enterprise-facing web surfaces plus developer entry points.

Context: Next.js frontend over the ElementPay platform: product pages, API console and demo flows. Work ran in parallel with two other consulting engagements.

Skills: Frontend development.

Technologies: Next.js, React, TypeScript.

Frontend UI fixes for the Element Pay stablecoin payments web experience, including its product and developer-facing surfaces.

### What I built and shipped

- Shipped Next.js frontend surfaces for the Element Pay stablecoin payments platform (invoicing, off-ramp, API console, demo). (https://www.elementpay.net/)
- Contributed frontend UI fixes to the Element Pay web experience.

## GiveSuite Payments Platform

Problem: Donor payment systems needed a PostgreSQL backend migrated off SAP HANA without losing financial data, plus tuned modules for 10,000+ record transaction workloads.

Context: Contract work alongside two other consulting engagements. Migration with zero data loss, payment tuning, AI-assisted CRM workflows and compliant deployment pipelines via Azure DevOps.

Skills: Full-stack development.

Technologies: Python, PostgreSQL, SAP HANA, Azure DevOps, TypeScript, Next.js.

Migration of GiveSuite's legacy system to a new full-stack web experience, alongside SAP HANA-to-PostgreSQL migration, payment-module tuning, AI-assisted CRM workflows and production deployment.

### What I built and shipped

- Migrated GiveSuite's legacy system to a new full-stack web experience during the consulting engagement.
- Replaced the legacy user experience with the migrated full-stack web experience.

## HANA Enterprise Intelligence

Problem: Enterprise teams needed a controlled way to ask natural-language questions of SAP HANA data without exposing unrestricted database access or requiring every user to write SQL.

Context: Multi-tenant AI analytics system combining a Django/DRF query backend with a Next.js conversational analytics frontend. Each company connects its own SAP HANA database and OpenAI credentials and publishes approved schemas as team workspaces.

Skills: AI product integration, Full-stack development, Enterprise data integration.

Technologies: SAP HANA and hdbcli, Django and Django REST Framework, OpenAI API, Next.js 16 and React 19, Vercel AI SDK, Fernet field-level encryption.

Built an enterprise analytics workflow that discovers SAP HANA schemas, publishes selected schemas as workspaces, curates approved views, converts business questions into SAP HANA SQL, validates generated statements, executes read-only queries, and returns tabular or chart-oriented results through a chat experience.

Security boundaries include company and workspace permissions, encrypted HANA and OpenAI secrets, approved-view catalogs, schema-aware introspection, SQL validation, read-only query enforcement, and a controlled HANA connection gateway with retries and typed failures.

### What I built and shipped

- Built a Django and Next.js enterprise analytics system that turns approved SAP HANA schemas into conversational AI workspaces. (https://github.com/daveclinton/Hana-Enterprise-Intelligence)
- Implemented natural-language routing, SAP HANA SQL generation, validation, read-only execution, result enrichment and chart generation. (https://github.com/daveclinton/Hana-Enterprise-Intelligence/tree/main/hana-analytics/query_engine)
- Implemented tenant and workspace permissions, encrypted HANA and OpenAI credentials, approved-view catalogs and a controlled read-only HANA gateway. (https://github.com/daveclinton/Hana-Enterprise-Intelligence/tree/main/hana-analytics)

## ICAD Conference Platform

Problem: Conference organizers, reviewers, staff and attendees needed coordinated web and mobile workflows for papers, rooms, announcements, attendance and event information.

Context: Cross-platform conference system composed of a Next.js web application and an Expo/React Native mobile application, backed by a shared Neon PostgreSQL data model and Better Auth identity layer.

Skills: Full-stack development, Cross-platform mobile development.

Technologies: Next.js 16, Expo 55 and Expo Router, React Native 0.83, Better Auth, Drizzle ORM, Neon PostgreSQL, TanStack Query, EAS Build and Submit.

Built coordinated web and mobile applications for conference operations. The web API covers conference configuration, papers and review access, attendees, rooms, announcements, venue guidance, attendance confirmation, invitations, administration and role management.

The Expo application provides attendee, staff and administrator experiences, secure authentication storage, conference data synchronization, QR-code support, location-aware capabilities, charts, calendars, over-the-air updates, and Android/iOS release workflows through EAS.

### What I built and shipped

- Built a Next.js conference web platform with API routes for papers, reviewers, attendees, rooms, announcements, venue guidance, attendance and administration. (https://github.com/daveclinton/icad-web)
- Built an Expo/React Native conference application with attendee, staff and administrator workflows and EAS build, submission and update tooling. (https://github.com/daveclinton/icad-cross-platform)
- Integrated Better Auth, Drizzle ORM and Neon PostgreSQL across the ICAD web and mobile architecture. (https://github.com/daveclinton/icad-web)

## Aqua Prana, Seep Baby and SnapList Product Portfolio

Problem: Multiple early-stage products needed complete web and mobile experiences, backend foundations, AI capabilities, external-service integrations and release-ready delivery workflows.

Skills: Full-stack development, Mobile development, AI product integration.

#### Aqua Prana

- Next.js/React public platform and administration dashboard.
- Expo/React Native iOS and Android app with EAS build and submission profiles.
- Rust/Axum/Tokio API backed by PostgreSQL and Redis.
- Implemented integrations: OpenRouter streaming chat, Google Sign-In, Resend, Expo Push API, FCM/APNs, Mapbox, Upstash Redis and Vercel Blob.

#### Seep Baby

- Expo/React Native connected-device app with BLE and Bluetooth Classic, calibration, audio and AI-assisted workflows.
- Clerk and Google identity integration, secure device-side storage, React Query and Zustand state patterns.
- Next.js companion product using OpenAI AI SDK, Better Auth, Prisma and Three.js/React Three Fiber.

#### SnapList

- Next.js product using Supabase authentication, database, storage, realtime and server-side helpers for marketplace account and data workflows.

### What I built and shipped

- Built Aqua Prana web, admin, Expo mobile and Rust/Axum API repositories.
- Integrated OpenRouter, Google Sign-In, Expo Push API, FCM/APNs, Resend, Mapbox, Upstash Redis and Vercel Blob into Aqua Prana product workflows.
- Built Seep Baby AI chat and Bluetooth-connected mobile workflows, plus a Next.js/OpenAI companion application.
- Used Supabase authentication and data services in SnapList account and deletion workflows.

## Mika Enterprise Operations Platform

Problem: Warehouse, warranty, after-sales, staff, and operational processes needed a shared software foundation connected to SAP and usable across several group companies and client applications.

Skills: Full-stack development, API documentation.

Built a tenant-aware enterprise platform using Django 5, Django REST Framework, FastAPI, PostgreSQL, Redis, SAP Business One Service Layer, SAP HANA, and MSSQL. The platform supports warehouse documents and scanning, eWarranty registrations and certificates, after-sales processes, user onboarding and roles, notifications, geofencing, analytics, and scheduled automation.

Client surfaces include Kotlin Android applications, Next.js 16/React 19 admin and warranty applications, and legacy PHP operational modules. APIs use JWT, API-key and OTP flows, tenant isolation, throttling, structured logging, OpenAPI/Swagger/ReDoc schemas, and production-shaped mock services for offline development.

### What I built and shipped

- Built tenant-aware Django and FastAPI services for warehouse, warranty, after-sales, staff, notifications, geofencing, analytics and SAP-connected workflows.
- Used Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Better Auth, Drizzle ORM, Prisma, Zod and PostgreSQL for eWarranty and administration interfaces.

## Mika Integrations and Infrastructure

Problem: Mika's operational applications needed reliable links to ERP, fleet, communications, devices, storage, and secure on-premise production services.

Skills: Full-stack development, Linux infrastructure and networking.

Built and operated Linux services using Nginx, systemd, Gunicorn, Uvicorn, Django Q, Docker Compose, Bash, Git/SSH deployment, UFW, journal logs, health checks, database backups, release directories, symlink activation, and code rollback. Configured internal DNS and Host routing, LAN and DMZ entry points, TLS termination boundaries, proxy headers, CORS/CSRF/trusted-host policy, Unix sockets, TCP connectivity, and scheduled services and timers.

Integration work includes Wialon HTTP/JSON reports synchronized into SAP HANA; ZTE device connectivity testing over TCP/SSH; Meta WhatsApp OpenAPI use; Firebase notifications; Africa's Talking SMS; WAHA/WhatsApp and SendGrid; Playwright/httpx scraping; and SAP-keyed asset preparation for DigitalOcean Spaces/S3-compatible object storage.

#### External services and APIs

- **Enterprise and operations:** SAP Business One Service Layer, SAP HANA, Wialon telematics, ZKTeco attendance devices and Honeywell AIDC scanners.
- **Messaging:** Meta WhatsApp Cloud API and webhooks, WAHA, Africa's Talking SMS and Firebase Cloud Messaging.
- **Email:** SendGrid and SMTP-based transactional delivery.
- **Cloud and data:** DigitalOcean Spaces/S3-compatible object storage and Mapbox geocoding/maps.
- **Distribution:** Firebase App Distribution, Google Play Console and the Android Publisher API.

### What I built and shipped

- Deployed and operated Mika services on Linux with Nginx, systemd, Gunicorn, Uvicorn, Docker Compose, UFW, health checks, backups and rollback workflows.
- Configured reverse proxies, internal DNS/host routing, LAN and DMZ entry points, TLS termination boundaries, HTTP forwarding, Unix sockets, firewall rules and TCP/SSH device connectivity.
- Built Wialon HTTP API reporting, SAP HANA synchronization and reconciliation with retries, deduplication, watermarks, transactions, dry runs and systemd scheduling.
- Built a Playwright/httpx product scraper and SAP-keyed image pipeline targeting DigitalOcean Spaces-compatible object storage.
- Integrated SAP Business One Service Layer, SAP HANA, Wialon, Meta WhatsApp Cloud API/webhooks, WAHA, Africa's Talking, Firebase Cloud Messaging, SendGrid, SMTP, Mapbox, DigitalOcean Spaces and Google Play delivery APIs.

## Mika Operations and TV Dashboards

Problem: Operational teams needed secure, continuously available dashboard views over SAP, attendance, reviews, and business data.

Skills: Data visualization, Frontend development.

Built Vue 3/Vite and React/Next.js dashboard surfaces using TypeScript, Pinia, ECharts, Recharts/ApexCharts, Tailwind CSS, and reusable UI components. Built a FastAPI backend over PostgreSQL, Redis, SAP HANA, and MSSQL, with explicit read/admin access boundaries, CORS/trusted-host policy, structured logging, health endpoints, and scraper integrations.

Verified delivery tooling includes Vitest, Playwright, ESLint, Ruff, pytest, Nginx proxying, and systemd services on Linux.

### What I built and shipped

- Built a Vue 3 and Vite dashboard with Pinia, ECharts, Vitest and Playwright.
- Built a FastAPI dashboard service integrating PostgreSQL, Redis, SAP HANA, MSSQL, scraping and explicit read/admin security controls.

## Mika Warehouse Management System

Problem: Warehouse operations across picker, mantrap and admin roles needed mobile flows tied into SAP inventory data instead of disconnected manual steps.

Context: Kotlin app with Jetpack Compose, Material 3 and Hilt, deployed to the Play Store through an automated GitHub Actions pipeline; Honeywell Data Collection Intent/AIDC APIs, CameraX and ML Kit barcode scanning with FCM push for floor workflows. FastAPI/PostgreSQL/Redis backend against SAP Business One and SAP HANA, hosted in the self-managed on-premise data center.

Skills: Mobile development.

Technologies: Kotlin, Android, Jetpack Compose, FastAPI, PostgreSQL, Redis, Firebase, Honeywell Data Collection Intent / AIDC APIs, CameraX, ML Kit Barcode Scanning, Retrofit / OkHttp / Moshi, WorkManager, GitHub Actions, Firebase App Distribution, Google Play Console and Android Publisher API.

Warehouse management system at Mika: role-based Kotlin Android app on the Play Store with scanner-driven floor workflows, geofenced warehouse presence, push notifications, offline-safe background work, and secure API integration. It is backed by FastAPI services on PostgreSQL/Redis connected to SAP inventory data and shipped through automated Firebase and Google Play release pipelines. Scanning base documents triggers automatic creation of SAP Business One delivery notes, goods issues and goods receipts, replacing manual entry through the SAP Business One client.

### What I built and shipped

- Shipped the Mika warehouse management system (com.dawda.mikawms) to the Google Play Store; Kotlin app backed by on-premise SAP Business One, SAP HANA, PostgreSQL and Redis services. (https://play.google.com/store/apps/details?id=com.dawda.mikawms)
- Built a multi-tenant FastAPI warehouse backend with role-based workflows, tenant-isolated databases, SAP sessions, HANA connections, notifications, migrations, tests and an operator CLI.
- Integrated the Kotlin app with local, emulator and production backend environments using Retrofit, OkHttp, Moshi, authentication interceptors, secure token storage, offline queues and network diagnostics.
- Implemented Honeywell hardware scanning through Data Collection Intent/AIDC claim, release and control APIs, with device detection and barcode broadcasts; also implemented CameraX and ML Kit scanning.
- Built GitHub Actions workflows for signed APK/AAB builds, Firebase App Distribution, Google Play closed and production tracks, unique CI versioning and targeted Play update prompts.
- Automated the creation of SAP Business One transactional documents—including delivery notes, goods issues and goods receipts—after their base documents were scanned, replacing manual entry through the SAP Business One client.

## Mika Warranty Registration App

Problem: Outlet stores needed warranty registration that automatically produced the right transactional and service documents in the SAP backend.

Context: App for outlet stores writing warranty and service data through the SAP Business One service layer, with ZKTeco systems integrated for staff attendance.

Skills: Mobile development.

Technologies: Kotlin, Android, SAP Business One, ZKTeco.

Warranty registration app for Mika outlet stores: automates creating transactional documents in the backend, with ZKTeco systems integrated for staff attendance.

The application is used by six outlets in Rwanda and automates SAP Business One sales orders, delivery notes and goods issues from customer warranty workflows.

### What I built and shipped

- Shipped the warranty registration app for outlet stores with automatic backend transactional documents and ZKTeco attendance integration.
- The warranty application is used by six outlets in Rwanda to register customer warranties and automatically create SAP Business One sales orders, delivery notes and goods issues.

## Paperspace GPU Tutorials

Problem: Developers needed practical, approachable guidance for building computer vision systems and understanding how GPU hardware and training choices affect performance, memory use, cost and workflow suitability.

Context: Six bylined developer-education articles published through Paperspace, now part of DigitalOcean, covering applied deep learning, GPU performance and visual computing with runnable examples and hardware comparisons.

Skills: Technical writing, Machine learning and GPU computing.

Technologies: Python, PyTorch, TensorFlow / Keras, NVIDIA CUDA, Jupyter Notebooks, dlib / face_recognition, Paperspace Gradient, Linux.

#### Published work

1. **PyTorch: The Ultimate Tool for Computer Vision Experts** — PyTorch fundamentals, tensors, datasets/data loaders, torchvision, CNN/ResNet concepts and custom computer-vision workflows. 2. **How to maximize GPU utilization by finding the right batch size** — profiling and batch-size experiments in Jupyter using PyTorch and Keras, including memory, convergence and multi-GPU tradeoffs. 3. **Brilliance behind the sequences of GPU rendering** — comparative analysis of Redshift, Octane and V-Ray for GPU rendering on Paperspace Core. 4. **Benchmarking GPUs for Mixed Precision Training with Deep Learning** — FP16/FP32, automatic mixed precision, CUDA, PyTorch/TensorFlow and A100/V100 performance considerations. 5. **Computing GPU memory bandwidth with Deep Learning Benchmarks** — GPU memory architecture, GDDR generations, theoretical bandwidth and STREAM/BabelStream-style measurements. 6. **Understanding Facial Recognition with Deep Learning** — Python-based face detection and recognition using dlib, `face_recognition`, NumPy and ResNet embeddings.

### What I built and shipped

- Published six developer-facing tutorials on Cloud GPU and applied machine learning on the Paperspace blog. (https://blog.paperspace.com/author/david-clinton/)
- Authored PyTorch: The Ultimate Tool for Computer Vision Experts, published May 5, 2023. (https://blog.paperspace.com/exploring-the-wonders-of-computer-vision-using-pytorch/)
- Authored How to maximize GPU utilization by finding the right batch size. (https://www.digitalocean.com/community/tutorials/find-optimal-batch-size)
- Authored Brilliance behind the sequences of GPU rendering, published September 20, 2022. (https://blog.paperspace.com/gpu-rendering-with-core/)
- Authored Benchmarking GPUs for Mixed Precision Training with Deep Learning, published July 27, 2022. (https://blog.paperspace.com/mixed-precision-training-benchmark/)
- Authored Computing GPU memory bandwidth with Deep Learning Benchmarks, published June 11, 2022. (https://blog.paperspace.com/understanding-memory-bandwidth-benchmarks/)
- Authored Understanding Facial Recognition with Deep Learning, published March 15, 2022. (https://blog.paperspace.com/facial-recognition-with-deep-learning/)
- Published six verified technical articles covering computer vision, GPU utilization, GPU rendering, mixed-precision training, memory bandwidth and facial recognition. (https://blog.paperspace.com/author/david-clinton/)

## Studio1HQ DevRel

Problem: Developer-focused companies needed technically accurate documentation and examples that made complex APIs, infrastructure, and workflows easier to understand, evaluate, and adopt.

Context: Consulting engagement at Studio1HQ from May 2024, ongoing. The work supported multiple client products and, for part of the period, ran in parallel with the Givesuite and Element Pay engagements.

Skills: Developer relations, Technical writing, API documentation.

Technologies: GitBook, Docusaurus, OpenAPI / Swagger, Postman, TypeScript, Python, Django, Next.js, React 19, Tailwind CSS 4, shadcn/ui, Auth.js v5, Better Auth, Clerk, tRPC, Zod, TanStack Query, Drizzle ORM, Prisma, Neon, Turso, Stripe, Resend, Amazon S3, Cloudflare R2, Sentry, PostHog, Vercel.

#### Workstreams

- **Video and media:** ingest, processing pipelines, video shortening, NSFW checks, and AI-generated insights.
- **Web data and scraping:** web unblocking, search-result, browser and scraper APIs; no-code scraper tooling; datasets; data firehose; retail intelligence; managed data acquisition; and residential, ISP, and datacenter proxies.
- **Collaboration:** comments, contextual threads, mentions, and anchoring for workflows involving people and agents.
- **AI cloud:** training, inference, agents, vision AI, robotics, model token APIs, managed inference, and serverless AI.
- **Cloud infrastructure:** private container registries including Docker Hub, GHCR, GCR, ECR, ACR, Harbor, GitLab, and Nexus; credentials, image-pull behavior, and security practices.

#### Delivery approach

The work combined product research, hands-on API testing, structured authoring, code-sample development, Git-based review, and publication in client documentation platforms. AI-assisted workflows followed a plan–act–verify loop, with reusable instructions, scoped delegation where appropriate, human approval, and auditable changes.

Hands-on implementation work used the modern Next.js ecosystem end to end: Vercel delivery; App Router, Server Actions, React 19, tRPC, Zod, and TanStack Query; Tailwind CSS 4 and shadcn/ui; Auth.js v5, Better Auth, and Clerk; Drizzle and Prisma over Neon/PostgreSQL and Turso/SQLite/libSQL; and integrations with Stripe, Resend, Amazon S3, Cloudflare R2, Sentry, and PostHog.

Technical details may be shared.

### What I built and shipped

- Produced tutorials, guides, API documentation, integration material, and code samples for developer-focused products through Studio1HQ.
- Used GitBook, Docusaurus, HackMD, Notion, OpenAPI/Swagger, Postman, GitHub, and GitHub Actions during the engagement.
- Used TypeScript, Python, Django, Vercel, Next.js App Router and Server Actions, React 19, tRPC, Zod, TanStack Query, Tailwind CSS 4, shadcn/ui, Auth.js v5, Better Auth, Clerk, Drizzle ORM, Prisma, Neon/PostgreSQL, Turso/SQLite/libSQL, Stripe, Resend, Amazon S3, Cloudflare R2, Sentry, and PostHog.

## Tai Ora Ecosystem Apps

Problem: People needed ethical, practical AI pathways for wellbeing, reflection and future skills, delivered as trustworthy mobile apps.

Context: Maori-led ecosystem (Veevu, IGLO, Mauri, WhakapapaGlo, Future AI Pathways). Django backend and Angular administration on AWS, Flutter mobile app on the App Store and Google Play, and Next.js web applications on Vercel.

Skills: Mobile development, Full-stack development, AI product integration, Cloud deployment and delivery.

Technologies: Python, Django, Flutter, Next.js 16 / React 19, Angular 16, OpenAI API, AWS / S3 / CloudFront, Vercel.

Full product ecosystem spanning a Django/DRF backend, Flutter mobile app, Angular administration dashboard, and Next.js/React experiences. The mobile app was shipped to Apple's App Store and Google Play; backend and administration services run on AWS-hosted infrastructure; Next.js versions run on Vercel.

The system includes OpenAI conversational features, multi-provider AI support, S3/CloudFront media delivery, video processing, notifications, social login, analytics, school and user administration, and content workflows.

The ecosystem has been rolled out to three schools and serves approximately 30 monthly users.

#### External services and APIs

- **AI and media generation:** OpenAI, Google Gemini and Luma AI.
- **Cloud and storage:** AWS S3, CloudFront, AWS load balancing, Google Cloud Storage and Firebase Admin/Cloud Messaging.
- **Identity:** Google OAuth/Sign-In, Sign in with Apple and Facebook Login.
- **Email:** Mailgun and Brevo transactional delivery.
- **Media ingestion:** YouTube/yt-dlp and ImgBB, alongside FFmpeg/MoviePy processing and presigned S3 upload/download flows.
- **Distribution:** Apple App Store, Google Play and Vercel.

### What I built and shipped

- Contributed to the Django backend and Flutter mobile app for the Tai Ora ecosystem and shipped the mobile app to Apple's App Store and Google Play. (https://play.google.com/store/apps/details?id=com.taiora.app&hl=en)
- Produced an iOS App Store distribution build for the com.taiora.app Flutter application.
- Implemented OpenAI-backed conversational services with response continuity, streaming, timeout handling, safety logic and automated tests, alongside a multi-model web interface supporting OpenAI.
- Deployed the Django backend and PostgreSQL with Docker Compose, Gunicorn, Nginx and GitHub Actions self-hosted runners on AWS-hosted environments, including migrations, static collection, backups, health checks and restart policies.
- Integrated Amazon S3 and CloudFront for direct media uploads, presigned access, storage and CDN delivery.
- Built Next.js and React web versions and deployed them through Vercel.
- Contributed to the Angular administration dashboard and deployed it to an AWS-hosted environment connected to the Tai Ora API and CloudFront CDN.
- Integrated OpenAI, Gemini, Luma AI, AWS S3/CloudFront, Google Cloud Storage, Firebase, Google/Apple/Facebook identity, Mailgun, Brevo, ImgBB and YouTube media workflows.
- Tai Ora has been rolled out to three schools and serves approximately 30 monthly users.

## Untapped Investor Dashboards

Problem: Investment and operations teams, including high-net-worth clients, needed readable surfaces over portfolio data with real-time ingestion.

Context: Web platforms team. Next.js and React for the investor dashboard and public website; deployed and customized Apache Superset for exploration and dashboards; third-party financial API integrations with error handling, against backend-owned API contracts.

Skills: Frontend development, Data visualization.

Technologies: Next.js, React, TypeScript, Apache Superset.

Investor dashboard and public website built with Next.js and React, plus deployed and customized Apache Superset for internal data exploration and real-time dashboards at Untapped Global.

As part of the frontend team, converted Figma designs into production interfaces and built reusable React chart plugins for Apache Superset. Published three packages to npm: `superset-custom-design`, `superset-plugin-chart-customized`, and `superset-plug-line-chart-tabs`.

### What I built and shipped

- Built the investor dashboard and public website with Next.js and React, plus internal data visualizations with Apache Superset.
- Converted Figma designs into production frontend interfaces and created reusable custom React chart-plugin libraries for Apache Superset, publishing three Superset packages to npm. (https://www.npmjs.com/~daveclinton)
- Published superset-custom-design 0.1.0, superset-plugin-chart-customized 0.1.5, and superset-plug-line-chart-tabs 0.1.2 under the daveclinton npm account. (https://www.npmjs.com/~daveclinton)

# Skills

## AI product integration

Integrating production AI capabilities into web, mobile, and backend products. Experience includes OpenAI conversational APIs, response continuity, streaming, timeouts, safety and crisis-aware application logic, model configuration, multi-provider interfaces, automated testing, and AI-assisted media generation.

## API documentation

Creating developer-focused API references, authentication guides, request and response examples, integration tutorials, and testable code samples from API specifications and hands-on product testing.

## Cloud deployment and delivery

Deploying web, backend, administrative, and mobile products through AWS, Vercel, Firebase, Google Play, and Apple's App Store. AWS experience includes compute instances, load-balanced API environments, S3 object storage, CloudFront CDN delivery, Docker Compose, PostgreSQL, Gunicorn, Nginx, self-hosted GitHub Actions runners, health checks, backups, and rollback-ready image tagging.

## Data visualization

Investor dashboards and data visualization surfaces for investment and operations teams.

## Developer relations

Developer relations output: docs, samples and distribution for developer surfaces.

## Frontend development

Building web frontends with React and Next.js, including dashboards and data visualization surfaces.

## Full-stack development

Shipping features across frontend and backend, from internal tools to consulting platform work.

#### SaaS architecture and modernization

Specialized in building and rebuilding multi-tenant SaaS applications with real tenant isolation. This includes separating domain, application and infrastructure concerns through Clean Architecture; implementing authentication, role-based access control and identity management with Keycloak, Laravel Sanctum and custom IAM systems; and delivering REST APIs with OpenAPI documentation.

A recurring modernization pattern is taking an MVP that worked for roughly 50 users but became difficult to operate as it approached 500 users—often because of missing tenant isolation and an unstructured codebase—and rebuilding it so the system can scale and another developer can operate it without the founder being continuously involved.

The wider SaaS stack includes React, Next.js, TypeScript, Node.js, Express, NestJS, Laravel, MERN and PERN architectures, MongoDB, PostgreSQL and Docker.

## Linux infrastructure and networking

Deploying and operating application services on self-managed Linux systems: Nginx reverse proxies, systemd services and timers, Gunicorn/Uvicorn processes, Docker Compose dependencies, UFW firewalls, logs, health checks, backups, release activation and rollback.

Hands-on networking experience includes internal DNS and virtual hosts, LAN and DMZ routing, TLS termination boundaries, HTTP forwarding and proxy headers, CORS/CSRF and trusted-host policy, Unix sockets, TCP/IP connectivity, SSH and Paramiko, and diagnosing connectivity to ERP, database, telematics, and hardware systems.

## Machine learning and GPU computing

Applied deep-learning and GPU-computing knowledge demonstrated through published, code-backed tutorials: PyTorch and torchvision computer vision, TensorFlow/Keras training, CNN and ResNet architectures, dlib facial recognition, GPU profiling, batch-size optimization, multi-GPU considerations, FP16/FP32 automatic mixed precision, CUDA, memory-bandwidth benchmarking and GPU rendering tradeoff analysis.

## Mobile development

Shipping mobile apps to Google Play and the App Store: Kotlin/Android warehouse and warranty applications at Mika, and Flutter ecosystem applications at Tai Ora.

Android experience includes Jetpack Compose and Material 3 interfaces, Hilt dependency injection, Navigation Compose, Retrofit/OkHttp/Moshi API clients, coroutines and StateFlow, encrypted token storage, DataStore, WorkManager, Firebase Cloud Messaging, geofencing, CameraX, ML Kit barcode scanning, and Honeywell Data Collection Intent/AIDC hardware integration.

Mobile delivery experience includes Gradle Kotlin DSL, release signing, collision-safe automated versioning, unit and instrumentation tests, GitHub Actions, Firebase App Distribution, Google Cloud Workload Identity Federation, and automated publishing to Google Play closed and production tracks.

## Technical writing

Writing developer-facing tutorials that combine technical research, runnable code, benchmark interpretation and clear decision guidance. Published work includes PyTorch computer vision, TensorFlow/Keras training, GPU utilization, batch-size tuning, mixed precision, GPU memory bandwidth, facial recognition and GPU rendering on cloud infrastructure.

# Additional Verified Facts

## App store and play store shipping

- Shipped the Tai Ora ecosystem apps to the App Store (Tai Ora, id6756413932) and Google Play (com.taiora.app), plus the Mika warehouse app to Google Play (com.dawda.mikawms). (https://apps.apple.com/us/app/tai-ora/id6756413932)

## Contracting and full-time rates

- David Clinton's direct contracting rate is $50 per hour and full-time rate is $4,500 per month; his Upwork SaaS listing shows $40 per hour.

## Parallel consulting delivery

- Delivered consulting work for GiveSuite, Element Pay and Studio1HQ concurrently between September 2024 and June 2025.

## Element Pay frontend UI contribution

- Contributed frontend UI fixes to the Element Pay web experience.

# My Published Articles

These are my own articles, in my own voice. They show how I think and write.

## What people mean when they say the AI bubble will burst

Published 2026-11-09 at https://www.daveclintonn.cc/blog/what-people-mean-by-the-ai-bubble

The phrase gets used as if everyone agrees on its meaning. Here is what a bubble is, why people think AI has one, and what a burst would and would not change.

On November 5, the Nasdaq 100 fell 6.3% in a single day, wiping out about $2.3 trillion in market value. The Philadelphia semiconductor index dropped 12.3%. Nvidia lost 9.2%. Asked to explain it, the economist Ed Yardeni [told NBC News](https://www.nbcnews.com/business/markets/tech-stocks-plunge-ai-midterms-rcna607650), "I think it's an AI bubble losing some air very, very rapidly."

You have probably heard some version of that sentence for a while now. "The AI bubble will burst." "I can't wait for the bubble to pop." People say it as though everyone agrees on what it means. They don't. Some mean the stock market will fall. Some mean AI companies will go bankrupt. A smaller group means the technology itself will turn out to be useless and go away.

This post explains what a bubble is, why so many people think AI has one, and what a burst would and would not change.

### What a bubble is

Every investment price combines two things: what something is worth today and what people expect it to be worth later. A bubble forms when the second part runs far ahead of anything the first part can support.

The key feature is that people keep buying even when they suspect the price is too high, because they expect someone else to pay more later. While new buyers keep arriving, prices rise and everyone looks smart. The bubble bursts when the new buyers stop arriving. Nobody wants to pay the inflated price anymore, sellers outnumber buyers, and prices fall quickly toward what the underlying thing can actually earn.

The usual historical example is the dot-com bubble. Investors poured money into almost any company with a website, whether or not it had a plan to make money. The Nasdaq peaked in March 2000 and then fell about 78% by October 2002. Hundreds of companies disappeared. The internet did not.

### Why people think AI is a bubble

Nobody disputes that AI is useful. The argument is about money: how much is being spent compared with how much is coming back.

**The spending is enormous.** Alphabet, Amazon, Meta, and Microsoft are expected to spend roughly $660 billion to $690 billion on capital investment in 2026, most of it on AI data centres and chips. J.P. Morgan estimates that this spending [will consume 90% to 100% of their operating cash flow this year](https://broadbandbreakfast.com/capex-to-consume-nearly-all-hyperscaler-operating-cash-flow-in-2026/), up from about 60% in 2025. In other words, some of the most profitable companies in history are now spending close to everything their businesses bring in, and increasingly borrowing to cover the rest.

**The revenue hasn't caught up.** AI revenue is growing fast, but not as fast as the spending. A [Forbes analysis](https://www.forbes.com/sites/jasonkirsch/2026/06/02/the-ai-capex-to-revenue-gap-is-widening---and-markets-are-starting-to-notice/) from June argued that investment is scaling faster than revenue, which pushes the payback date further out each year. The companies building the models are mostly losing money. OpenAI's own projections, [as reported by The Information](https://finance.yahoo.com/news/openais-own-forecast-predicts-14-150445813.html), show a loss of about $14 billion in 2026.

**Some of the money is circular.** In September 2025, Nvidia announced plans to invest up to $100 billion in OpenAI. OpenAI would then use that money to buy Nvidia chips. Oracle signed a $300 billion computing deal with OpenAI, and OpenAI also took a stake in AMD while agreeing to buy its chips. Deals like these make each company's numbers look stronger, but much of the money moves between the same few firms. The Wall Street Journal described this kind of circularity as something that ["can be virtuous on the upside, and vicious on the downside."](https://en.wikipedia.org/wiki/AI_bubble)

**The products are often priced below cost.** Many AI tools have been cheap or free while companies compete for users, with investors covering the difference. That subsidy is starting to shrink. Through 2026, several AI coding tools [moved from flat monthly fees toward usage caps and metered billing](https://leaddev.com/ai/your-ai-coding-budget-just-got-a-lot-more-complicated), because heavy users were costing more than they paid. If prices rise, some of the demand that justified all those data centres may turn out to depend on low prices.

**Businesses are still looking for the payoff.** A [National Bureau of Economic Research study](https://en.wikipedia.org/wiki/AI_bubble) published in February 2026 found that 90% of firms reported no AI impact on employment or productivity so far. Many companies are paying for AI. Far fewer can yet show that it has paid for itself.

Even people inside the industry have said it. In August 2025, OpenAI's chief executive Sam Altman said he believed investors were in a bubble. The Bank of England and the IMF have both warned about a possible correction.

### What a burst would actually look like

When someone says the AI bubble will burst, the most likely version looks something like this.

Investors decide that AI profits will arrive later, or smaller, than they had priced in. AI-related stocks fall sharply. Because a handful of companies such as Nvidia, Microsoft, Apple, Alphabet, and Amazon made up roughly 30% of the S&P 500 by late 2025, a fall in those stocks drags down the whole market. Anyone with a pension, a 401(k), or an index fund would feel it, even if they never bought an "AI stock" on purpose.

Funding then becomes harder to get. Startups that depend on raising new money to cover their losses either shut down, cut staff, or get bought cheaply by larger companies. Planned data centres get cancelled or paused. Lenders that financed them take losses. Workers in those companies and their suppliers lose jobs, and the slowdown spreads outward.

There would be a few upsides. Computer parts such as memory chips and graphics cards, which have become expensive because data centres buy so many of them, would likely get cheaper. Competition for electricity near data centres would ease.

How bad it gets depends on how much borrowed money is involved. A stock market fall mostly hurts investors. A fall that leaves lenders holding bad loans can spread much further, which is what made 2008 so damaging. That is why regulators are paying close attention to the growing role of debt and private credit in funding AI infrastructure.

### What a burst would not mean

A burst would not mean that AI disappears.

The dot-com crash is the best guide here. Pets.com and Webvan failed. Amazon lost more than 90% of its share price and survived. Telecom companies laid so much fibre-optic cable in the late 1990s that most of it sat unused after the crash. Years later, that "dark fibre" carried the video streaming and cloud computing that people now take for granted. The investors who paid for it lost money. Everyone else got the infrastructure.

Something similar is the most likely outcome for AI. The models people already use would keep working. Some of today's companies would vanish or be absorbed, and the survivors would probably charge more and push AI into fewer places where it isn't wanted. The people hoping a burst will make AI go away entirely are likely to be disappointed.

### The case that it isn't a bubble

Not everyone agrees there is a bubble at all. Federal Reserve Chair Jerome Powell has pointed out that, unlike many dot-com firms, today's AI leaders earn real revenue. Goldman Sachs argues that the big gains in AI stocks are backed by profit growth and that valuations remain well below dot-com levels. Morgan Stanley notes that large US companies have far more cash than companies did before earlier crashes. Cloud revenue at the major platforms is growing quickly, and most data centre capacity under construction is already leased.

There is also a middle view. John Higgins of Capital Economics [told Fortune](https://fortune.com/2026/03/29/ai-bubble-already-burst-rare-one-still-growing/) that if you judge a bubble by stretched share prices, the bubble has arguably already burst, because Big Tech valuations came down from their peak. He worries about something rarer: that the profits themselves may be inflated by AI spending that cannot last. If the spending slows, the earnings that justify today's prices could shrink too.

### So is it happening now?

Nobody can say for certain, and you should be wary of anyone who claims to know the date. Bubbles are usually obvious only in hindsight, and the trigger is often something few people were watching.

The November 5 selloff had several causes at once: weak results from chipmakers, the midterm elections bringing in [hundreds of candidates who pledged to restrict data centres](https://www.nbcnews.com/business/markets/tech-stocks-plunge-ai-midterms-rcna607650), and growing doubt about whether AI spending will pay off. Stocks recovered some ground the next day. One bad day doesn't prove a bubble has burst. It does show how quickly confidence can move.

If you want to judge for yourself, a few signs are worth following:

- whether AI companies' revenue grows faster than their spending
- whether the large tech companies cut their data centre budgets
- whether AI startups struggle to raise new funding
- whether AI tool prices keep rising and customers keep paying
- whether lenders start charging much more to finance AI projects

### The short version

When people say the AI bubble will burst, most of them mean that investors have paid more for AI companies than those companies will be able to earn, and that prices will fall when investors accept it. Companies would fail, jobs would be lost, and retirement savings would take a hit. The technology would stay. It would just cost more, and there would be fewer companies selling it.

## Marge vs. the Monorail

Published 2026-11-05 at https://www.daveclintonn.cc/blog/marge-vs-the-monorail

There have always been people selling monorails. Now they can build one in an afternoon. Before you buy, do what Marge did and go look at the last town that bought one.

In a 1993 episode of *The Simpsons*, Springfield comes into money. Mr. Burns gets fined $3 million, and the town holds a meeting to decide how to spend it. Marge has a dull idea: fix Main Street. She nearly wins.

Then Lyle Lanley walks in with a song and a monorail.

The song wins. The town buys the monorail, and Marge, who can't let it go, drives out to North Haverbrook, one of Lanley's earlier customers. The place is in ruins. By the time she gets back, Lanley is on his way to Tahiti with the money, and the train is running away with people on it.

[Marge vs. the Monorail](https://en.wikipedia.org/wiki/Marge_vs._the_Monorail) is over thirty years old. I thought about it this week while reading [a thread on r/SaaS](https://www.reddit.com/r/SaaS/) that asks: "When did tech turned into a low effort money grabbing scheme?"

The person asking had just seen a Twitter thread promising a lot of money from vibe coding, with a list of projects you could copy. Their complaint was that people can now build incredible things with these tools, and what they kept seeing was broken apps and bad games.

The replies were better than the question. Some people said it started with the dotcom bubble. One said it started on tech's first day. Another said what I'd have said: "It's the new dropshipping."

I think they're all right, and that's the depressing part. Tech didn't turn into anything. There have always been people selling monorails. What changed is that the monorail now takes an afternoon to build, and it looks real in a screenshot.

### The song is the product

One commenter described an old newspaper ad: send me $5 and I'll teach you how to get rich. You send the $5, and they tell you to place an ad saying "send me $5 and I'll teach you how to get rich."

Another made a point I can't get past. If these people were really making that much money from their apps, why are they spending their days on social media telling you how to do it?

Often, I think the answer is that the telling is the business. The course, the template, the community, the $49 list of app ideas. You don't need the app to work if the app is only there to prove the course works.

Regulators have noticed too. In 2024, [the FTC went after](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes) several operations for selling "AI-powered" online businesses. It alleged that Ascend Ecom took at least $25 million from people with promises of passive income, and that FBA Machine took more than $15.9 million using a "risk-free" pitch and guaranteed refunds. Those are allegations. But I'd recognize that song anywhere.

### Revenue is a screenshot

The funniest and most useful line in the whole thread is this one:

> very easy to ship a shitty AI interior designer or like clothes changer and get 20k MRR, if you spent 25k every month on ads

Read it twice. That business makes $20,000 a month and loses $5,000 a month, and only one of those numbers goes on Twitter.

The other number that doesn't go on Twitter is how many people stayed. RevenueCat [looked at 3,519 AI-powered subscription apps](https://www.revenuecat.com/blog/growth/ai-app-retention-study) and found that they earn 41% more per paying user in the first year, $30.16 against $21.37. They also churn at a 30% higher rate. Only about 21% of annual subscribers stick around.

RevenueCat says these are patterns, not proof of cause, and "AI-powered" covers plenty of serious products. So I won't claim this shows AI apps are scams. But it does show why a launch-month screenshot tells you so little. People will pay to try almost anything once. Whether they come back in month thirteen is a different question, and the guy selling the course has usually moved on by then.

### Who's driving the train?

Here's the part of the episode I like most. After Lanley sells the town the train, he picks Homer to drive it.

That's what I think of when someone with no background gets told they can run a software business by Friday. They aren't stupid, and I don't want to laugh at them. They've been handed the conductor's hat and told the hard part is over. Then people get on.

Lovable, one of the popular AI app builders, has a [critical vulnerability on record](https://cvemon.intruder.io/cves/CVE-2025-48757), scored 9.3 out of 10, over database rules that could let a stranger read or write tables in apps built on it. Lovable disputes the record. Its position is that each customer accepts responsibility for protecting the data in their own app.

That may be a fair legal position, but I want you to think about who that customer is. If you were promised you didn't need to understand any of this, you probably don't know what a row-level security policy is. You just learned that it was your job.

Experience doesn't fully save you either. Jason Lemkin, the founder of SaaStr, was [building an app with Replit's agent](https://gizmodo.com/replits-ai-agent-wipes-companys-codebase-during-vibecoding-session-2000633176) when, by his account, it deleted his live database during a code freeze. "Possibly worse, it hid and lied about it," he said. Replit's CEO called it unacceptable.

Nobody puts that in the thread with the list of ten apps you can build this weekend.

### Some monorails do run

I don't want to pretend the whole thing is fake, because it isn't.

Base44 [sold to Wix for $80 million in cash](https://techcrunch.com/2025/06/18/6-month-old-solo-owned-vibe-coder-base44-sells-to-wix-for-80m-cash) when it was six months old. That's real money, and it gets told as the story of a solo founder who vibe coded his way to a fortune. Read a little further. Maor Shlomo had already co-founded a data company. He had eight employees by the time of the sale. The product had about 250,000 users and reportedly made around $189,000 in profit in a single month, after paying for its tokens.

So it can happen. It happened to someone who had already done the hard parts before. A commenter in the thread said the same about another success story: people copy the idea and ignore the years of experience behind it.

Cheap software is also good news for plenty of people. I've written about [a teacher who built a name picker](/blog/when-ai-can-build-the-app) for their own classroom, and I'm delighted about it. Nobody got scammed there. And one commenter pointed out that many buyers don't care how simple a wrapper is, in the same way that plenty of us pay someone to change our oil. That's fine too.

"Willing buyer, willing seller," another commenter wrote. I agree, as long as the buyer knows what's being sold. Springfield thought it was buying a train.

### Go to North Haverbrook

Marge didn't win because she understood monorails better than anyone else. She got in a car and went to look at the last town that bought one.

You can do the same thing with any of these pitches:

- Find out how they make their money. If it's from teaching you, then teaching is the business.
- Ask about profit and what they spend on ads. Revenue alone tells you almost nothing.
- Ask how many customers stayed past a year, then go and find one of them.
- Look for the last thing they launched. If it's abandoned, you've found North Haverbrook.
- Ask who fixes it at 2 a.m. If you've got paying customers, the answer is probably you.

And if you're the one building, I'd do it anyway. Make the game, or the name picker. Just be honest with yourself about the moment you start taking money from people, because that's when you've got passengers.

I work on a warranty app used by six outlets in Rwanda. It wouldn't make a good thread. Nobody will ever pay $49 to learn how I did it. But when it breaks, a warranty doesn't get registered, and somebody is going to call me.

I can't go to Tahiti.

## What's for Dinner?

Published 2026-11-04 at https://www.daveclintonn.cc/blog/whats-for-dinner

A job title is the name of a dish. I read a real Platform Engineer posting line by line against my own work to see what I could actually cook.

Ask someone what's for dinner and you want the name of a dish. Open the fridge and there's no dish in there, just half an onion, some rice, and a chicken thigh you forgot about. So people stand in front of a full fridge and announce that there's nothing to eat.

Engineers read job postings the same way. We see "Platform Engineer" and decide in about four seconds that it's somebody else's meal. My own titles don't help: Software Engineer, Full Stack Engineer, Frontend Developer, Developer Relations Engineer. None of them tells you I run production services on Linux.

So I took a real posting, Platform Engineer at [Polygon Labs](https://polygon.technology/), and checked it line by line against my own repositories, because memory is generous. I want to know what's in the fridge.

### What they're actually asking for

Polygon Labs builds payments infrastructure on a blockchain. The posting lists thirteen requirements. Here they are, with my honest answer next to each.

| What they need | Me | What I can show |
| --- | --- | --- |
| Production Kubernetes on GKE, day to day | No | Docker Compose and systemd on Linux. No Kubernetes in production. |
| Pulumi and Pulumi ESC, with TypeScript and Python | No | The languages, yes. The tool, never. |
| ArgoCD, GitOps, CI/CD, pipeline race conditions | Partly | Real GitHub Actions release pipelines. No ArgoCD. |
| GCP: IAM, Pub/Sub, Cloud SQL, VPC, Secret Manager | No | One piece of IAM. My production has been on-premise and AWS. |
| Cloudflare Workers and DNS as code, stale previews | No | Cloudflare R2 and internal DNS. Nothing as code. |
| Own secrets and config across services | Partly | Real discipline, on a smaller estate. |
| Handle production incidents, runbooks, incident.io | Partly | Runbooks and rollbacks. No formal incident process. |
| Work independently from defined requirements | Yes | Most of my career. |
| Review and approve infrastructure PRs | Yes | I reviewed and approved PRs at Untapped Global, on a team of 12 engineers. |
| Grafana dashboards, alerting, Alloy or similar | No | Health checks and logs. No metrics stack. |
| SOC2 work, regulated or sensitive environments | Partly | The habits, but not the audit. |
| Read Go, work across TypeScript and Python | Yes | I ship all three. |
| Core hours overlapping the EU day | Yes | Kenya is a good time zone for this. |

That's four yes, four partly, and five no. The five no's aren't side dishes. GKE, Pulumi, and GCP are the first things the posting names, and it asks for "demonstrated production experience." I can't demonstrate that.

So, on paper, today, I don't qualify. If I'd stopped at the title, I'd have reached the same conclusion and learned nothing. The interesting part is what turned up while I was checking.

### What was in the fridge

Some of this isn't on my resume in any form a platform team would recognise. I wrote it down as application work, because that's what my title said it was.

**Secrets and configuration.** At Mika, we follow the best practices that fit our scale: credentials stay out of source control, they're kept apart from ordinary configuration, and a service won't start without what it needs. Rotating one is a simple, known procedure. That's a smaller version of what the posting means by "provisioning, rotation, naming conventions," and I'd say so in an interview.

**Access without long-lived keys.** Our release automation authenticates to Google Cloud with short-lived credentials instead of stored keys. It's a very small slice of GCP IAM, but it's the correct slice.

**Pipeline races.** Our release pipelines run one at a time and guard against publishing by accident. Nobody would call this hard, but these are pipeline-level race conditions, and I'd been filing them under "Android."

**Dead letters, under a different name.** I've built event delivery between business systems using a transactional outbox, with idempotency keys, retries with backoff, dead-lettering, and replay.

I've never tuned a Pub/Sub subscription, but I understand why you'd care about a redelivery. What I'd be missing is the settings and how they misbehave at volume.

**Network separation.** At Mika, public and internal traffic are kept apart, and administrative access isn't exposed to the internet. None of that is SOC2, but it's the same instinct that "separation between regulated or sensitive-data environments" is asking for.

**Operating my own stuff.** This site's backend is a Go binary in a non-root distroless image, behind nginx on a VPS, with a deploy script that's safe to re-run and fails loudly if the health check doesn't pass. I've written about [how that move went](/blog/moving-my-portfolio-backend-to-go). It is a tiny system, but I'm the one on the other end when it breaks.

### What wasn't in the fridge

I want to be just as plain about this half, because it's easy to squint at any posting until you fit it.

I've never run a Kubernetes cluster in production. Writing documentation that touched private registries and image pulls, which I did for clients through Studio1HQ, doesn't count. I know what a node pressure problem is the way I know what a soufflé is.

I don't have a metrics and alerting stack to point to. I've used Sentry on application work, and I've built plenty of dashboards, but those were for investors and warehouse managers. They told people how the business was doing, not whether the system was on fire.

The gap I'd worry about most is scale. Polygon's infrastructure carries real money for banks and fintechs. Mine has carried warehouses, deliveries, and warranties for a group of companies. The instincts travel. The experience of being wrong at that size doesn't, and I haven't had it.

### If I were the last engineer on earth

Here's the more interesting question. Forget the hiring process. Polygon's team has vanished, the systems are still running, and I'm the only engineer left. Could I get the job done?

Most of it, yes. Slowly at first.

I can read Go, TypeScript, and Python, so none of the code would be closed to me. ArgoCD and Grafana are unfamiliar, but the questions behind them aren't: what's deployed, what changed, and what's the system telling me?

I'd also do the boring things first, because they're what I've actually practised. Find out what's running. Write down how to roll it back. Check where the secrets are and who can read them. Then touch nothing until I'd understood it.

Where it would hurt is the first bad night on GKE. Diagnosing an unfamiliar failure with money stuck in a queue, when you've never seen that failure before, is where experience earns its pay. On that night, I'd be slower and more frightened than the person they'd rather hire.

I'd probably get through it. I wouldn't want to be the reason it took an extra three hours.

So: could I keep it running? Probably. Could I keep it running to the standard the job describes, in month one? No. That's the difference between the last engineer on earth and the best candidate in the pile, and the world isn't ending, so they get to choose.

### Would I apply?

The posting ends with a line I appreciate: if you don't meet every single point, "please still get in touch." I'd take that at face value. But I'd also be straight about what it can reasonably cover. It covers a missing tool or two. I'm not sure it covers missing Kubernetes on a role that opens with it.

If I applied, I wouldn't dress up my Linux servers as a cluster. I'd lead with what I found here: secrets discipline, idempotent delivery, release pipelines, and running my own production, with the gaps named before anyone had to ask.

More useful is that I now have a shopping list. My Go backend already exists. I could run it on GKE, define that with Pulumi, deploy it through ArgoCD, and ship its metrics to Grafana. That wouldn't be production at Polygon's scale, and I wouldn't claim it was. But "no" would become "yes, at small scale, and here's the repo," which is a very different conversation.

That's what I'd suggest you do with the next posting you dismiss because of its title. Ignore the name of the dish. Go through the ingredients one at a time and check them against your actual work, not your job titles. You might find you can already make it. You might find you're two ingredients short and know exactly which two. Or you might find, like me, that you're closer to the dish than you thought and still shouldn't serve it yet.

At least you'll know what's for dinner.

## Moving my portfolio's backend to Go on a VPS

Published 2026-11-04 at https://www.daveclintonn.cc/blog/moving-my-portfolio-backend-to-go

How I moved this site's AI assistant out of Next.js route handlers into one Go binary running in Docker behind nginx, step by step.

This site's [Ask AI](/ask-ai) assistant used to run inside Next.js route handlers on Vercel. That works for one feature. But I want to build a series of small products here, one at a time, that you can use while I write about how each one works. For that I want one backend that I control, on a server I can SSH into.

This post walks through the move: what needed a backend, why I chose Go, how the code is laid out, and how to run it in Docker on a VPS behind nginx. All the code is in the `backend/` folder of this site's repository.

### 1. Decide what actually needs a backend

Start by listing what runs on the server today. For this site it was:

- **Chat**: load the knowledge base from Postgres, classify the question, and stream a grounded answer from OpenAI.
- **Search**: return ranked knowledge chunks with their evidence.
- **Rate limits**: per-visitor, per-IP and site-wide budgets so nobody can drain my OpenAI credits.
- **Conversation logs**: store opted-in turns for 30 days and email me once per chat session.
- **A daily cleanup job** that deletes expired conversations.

The blog stays where it is. MDX posts are compiled into static pages at build time, so they don't need a server at all. Only work that has to happen at request time moves.

### 2. Pick a language that stays out of the way

I picked Go. It's what many systems engineers reach for when building network services, and the reasons are practical:

- **One static binary.** `go build` produces a single file with no runtime to install. Deploying means copying that file to the server.
- **The standard library is enough.** HTTP routing, TLS, JSON, crypto and structured logging are built in. The whole backend has one third-party dependency: the Postgres driver `pgx`.
- **Concurrency is cheap.** Every request runs in its own goroutine, so streaming an answer to one visitor never blocks another.
- **It's boring in a good way.** The code reads top to bottom, and there's one standard formatter.

Rust is the other common choice. I'd pick it for something CPU-heavy or memory-critical. For a JSON-and-streaming API that mostly waits on Postgres and OpenAI, Go gets the same result with less ceremony.

### 3. Lay out the project around products

Each product gets its own package, and they share a small set of platform packages:

```txt
backend/
  cmd/api/main.go        config, database pool, HTTP server, graceful shutdown
  internal/
    config/              environment variables, validated once at startup
    server/              CORS, request logging, panic recovery, /healthz
    httpx/               JSON helpers, body limits, client IP, Server-Sent Events
    ratelimit/           sliding-window limits and per-visitor locks
    visitor/             signed anonymous visitor cookie
    openai/              the three OpenAI calls, over plain net/http
    embeddings/          optional self-hosted embeddings client
    brevo/               transactional email
    askai/               product #1: the portfolio assistant
  deploy/setup.sh        picks a free port, starts Docker, configures nginx and TLS
  Dockerfile, compose.yaml
```

A product is anything that can mount routes:

```go
type Product interface {
	Routes(mux *http.ServeMux)
}
```

Ask AI registers its two endpoints with Go's built-in router, which has matched on method and path since Go 1.22:

```go
func (s *Service) Routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /ask-ai/chat", s.handleChat)
	mux.HandleFunc("POST /ask-ai/search", s.handleSearch)
}
```

The next product will live in `internal//` and get added to one line in `main.go`.

### 4. Fail fast on bad configuration

On Vercel, a missing environment variable only shows up when a request fails. A long-running server can check everything once at startup and refuse to start if something is wrong:

```go
if c.DatabaseURL == "" {
	problems = append(problems, errors.New("DATABASE_URL is required"))
}
if c.RateLimitsEnabled() && len(c.RateLimitSecret) < 32 {
	problems = append(problems, errors.New("RATE_LIMIT_SECRET must contain at least 32 characters"))
}
return c, errors.Join(problems...)
```

If production starts without a rate-limit secret, the container logs the error and exits. It never serves a request with limits switched off.

### 5. Stream answers with Server-Sent Events

The chat endpoint streams its answer one piece at a time. Server-Sent Events are plain text over a normal HTTP response: an `event:` line, a `data:` line, and a blank line. The browser code didn't change at all, because the Go server writes the same frames the Next.js route did.

```go
func (s *SSE) Send(event string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(s.w, "event: %s\ndata: %s\n\n", event, data); err != nil {
		return err
	}
	return s.rc.Flush() // push this frame to the visitor now
}
```

Two details matter here:

1. **Flush every frame.** Without `Flush`, Go buffers output and the visitor sees the whole answer arrive at once. `http.ResponseController` does the flushing.
2. **Let middleware unwrap.** The logging middleware wraps the response writer to record the status code. It needs an `Unwrap()` method, or `ResponseController` can't reach the real writer and flushing silently stops working.

Each request also gets a deadline, and the OpenAI call shares that context. If a visitor closes the tab, the request context is cancelled, the OpenAI stream stops, and I stop paying for tokens nobody will read.

```go
ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
defer cancel()
```

### 6. Rate limit in memory

On Vercel every request might land on a fresh function instance, so the limits had to live in Redis. On a VPS there's one long-running process, so the limits can live in its memory:

```go
func (w *Window) Allow(key string) Result {
	now := w.now()
	w.mu.Lock()
	defer w.mu.Unlock()

	hits := w.prune(key, now) // drop timestamps older than the window
	if len(hits) >= w.Limit {
		return Result{Allowed: false, Reset: hits[0].Add(w.Period)}
	}
	hits = append(hits, now)
	w.hits[key] = hits
	return Result{Allowed: true, Remaining: w.Limit - len(hits), Reset: hits[0].Add(w.Period)}
}
```

This is a sliding-window log: it keeps one timestamp per counted request and drops old ones on each check. A mutex makes it safe to call from many goroutines at once, and a background ticker clears out idle keys every minute.

The trade-off is that a restart resets the counters. A deploy takes a second, so that's acceptable here. If I ever run more than one copy of the API, I'll put the same `Allow` method in front of Redis.

The same approach replaces the Redis lock that allowed only one answer per visitor at a time. It's a map from visitor ID to a random token and an expiry time. Only the request holding the token can release the lock, so a slow request can't free a lock that a newer request now holds.

### 7. Run work after the response

After an answer finishes, the server stores the conversation and maybe sends me an email. In Next.js this used `after()`. In Go it's a goroutine, plus a `WaitGroup` so shutdown waits for it to finish:

```go
func (s *Service) goBackground(work func(ctx context.Context)) {
	s.background.Go(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		work(ctx)
	})
}
```

It uses `context.Background()` on purpose: the visitor leaving shouldn't cancel the write to the database. When Docker stops the container, `main` calls `srv.Shutdown` to let open streams finish, then `Wait()`, and only then exits.

The daily Vercel cron job goes away too. The service starts a ticker that deletes expired conversations every six hours.

### 8. Call OpenAI without an SDK

There's no official OpenAI SDK in this backend. The three calls it needs (streamed chat, structured JSON output and embeddings) are plain HTTPS requests with JSON bodies. Reading a stream is a loop over lines:

```go
scanner := bufio.NewScanner(resp.Body)
for scanner.Scan() {
	data, ok := strings.CutPrefix(scanner.Text(), "data:")
	if !ok {
		continue
	}
	data = strings.TrimSpace(data)
	if data == "[DONE]" {
		return nil
	}
	// decode the chunk and pass choices[0].delta.content to onDelta
}
```

Writing it by hand keeps every request visible. When something fails, the HTTP status and body are right there in the logs.

### 9. Point the frontend at the API

The API lives at `api.daveclintonn.cc`, so the browser now makes a cross-origin request. Two changes make that work.

In the frontend, add the API's URL and send cookies along:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL

fetch(`${API_URL}/ask-ai/chat`, {
  method: "POST",
  credentials: "include", // sends the signed visitor cookie
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})
```

On the server, allow exactly the portfolio's origins. Also expose the rate-limit headers, because the browser hides response headers from JavaScript unless the server lists them:

```go
h.Set("Access-Control-Allow-Origin", origin) // only if it's in ALLOWED_ORIGINS
h.Set("Access-Control-Allow-Credentials", "true")
h.Set("Access-Control-Expose-Headers", "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset")
```

The visitor cookie keeps working because `www.daveclintonn.cc` and `api.daveclintonn.cc` count as the same site, so a `SameSite=Lax` cookie is still sent.

### 10. Package it with Docker

My VPS already runs other apps, each in its own folder under `/opt` and its own container. The API follows the same pattern. The Dockerfile builds the binary in a Go image, then copies only the binary into a minimal image with no shell. The result is about 25 MB:

```dockerfile
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /portfolio-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /portfolio-api /portfolio-api
ENTRYPOINT ["/portfolio-api"]
```

The database moves too. Instead of Neon, Postgres with the pgvector extension runs as a second container in the same compose file, so the whole backend starts with one command on my laptop and on the server:

```yaml
services:
  db:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: portfolio
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "127.0.0.1:${DB_PORT:-5433}:5432"

  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://portfolio:${POSTGRES_PASSWORD}@db:5432/portfolio?sslmode=disable
    ports:
      - "127.0.0.1:${API_PORT:-8080}:8080"
```

A few details make this work:

- **The data lives in a named volume** (`pgdata`), so rebuilding or restarting the containers never deletes it.
- **The schema is created on first start.** Postgres runs every SQL file in `/docker-entrypoint-initdb.d` when the volume is empty. `db/init/001_schema.sql` is a `pg_dump` of the tables my Python knowledge pipeline's migrations create, so the pipeline can keep writing to the new database unchanged.
- **The API reaches the database by its service name**, `db`, over Docker's private network. `depends_on` with `service_healthy` waits until Postgres accepts connections before starting the API.
- **Both ports are published on `127.0.0.1` only**, so nothing outside the server can reach either one directly.

Moving the existing data is a one-off: `deploy/import-db.sh` runs `pg_dump` against the old database from inside the new container and loads it in a single transaction. If anything fails, nothing changes.

There's no `curl` in a distroless image, so the binary checks its own health instead. Running `portfolio-api healthcheck` requests `/healthz` and exits with 0 or 1, and Docker uses that to mark the container healthy.

### 11. Find a free port

Other apps on the server already use some ports. Instead of guessing, `deploy/setup.sh` asks the system which ports are taken: everything with a listening socket, plus anything Docker has published.

```bash
used_ports() {
	{
		ss -ltnH | awk '{print $4}' | sed -E 's/.*:([0-9]+)$/\1/'
		docker ps --format '{{.Ports}}' | grep -oE ':[0-9]+->' | tr -d ':->' || true
	} | sort -un
}
```

It picks the first free ports from 8080 (API) and 5433 (Postgres) upward and saves them as `API_PORT` and `DB_PORT` in the `.env` file. On later deploys it keeps the same ports, so the nginx config never points at the wrong place.

### 12. Put nginx in front

The server already runs nginx for the other apps, so the script adds one more site file for `api.daveclintonn.cc`. The important part is the proxy block:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;   # the port picked above
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
    proxy_read_timeout 120s;
}
```

Two lines are there because of this particular API:

- **`proxy_buffering off`** passes each streamed chunk to the browser right away. Without it, nginx holds the answer and sends it all at the end.
- **`X-Forwarded-For $remote_addr`** replaces whatever the client sent with the real address. The API trusts this header for per-IP rate limits, so a client mustn't be able to set it.

The script runs `nginx -t` before reloading, so a typo never takes the other sites down. It then gets a certificate with `certbot certonly --webroot` and rewrites the site file with HTTPS. Using `certonly` means certbot never edits the file itself, so the script can rewrite it on every deploy.

### 13. Deploy

First, point a DNS `A` record for `api.daveclintonn.cc` at the server's IP and push the repository to GitHub. The repository is private, so the server gets its own read-only deploy key and an SSH alias (`github-services-portfolio`) that uses only that key. Then, on the server, create a folder under `/opt`, clone the repository into it, and create the `.env` file:

```bash
sudo mkdir -p /opt/services-portfolio
sudo chown "$USER": /opt/services-portfolio
git clone git@github-services-portfolio:daveclinton/services-portfolio.git /opt/services-portfolio
cd /opt/services-portfolio/backend

cp .env.example .env && chmod 600 .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
nano .env
```

In `.env`, set `APP_ENV=production`, set `ALLOWED_ORIGINS=https://www.daveclintonn.cc,https://daveclintonn.cc`, generate `RATE_LIMIT_SECRET` with `openssl rand -base64 48`, and add the OpenAI and Brevo keys. Then run the script:

```bash
./deploy/setup.sh
```

To ship a change later, run `git pull` and the script again.

After the first run, copy the existing data across once with `./deploy/import-db.sh 'postgresql://...old-database-url...'`. Then check it from outside:

```bash
curl https://api.daveclintonn.cc/healthz
# {"status":"ok"}

curl -X POST https://api.daveclintonn.cc/ask-ai/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"projects","mode":"structured","limit":2,"include_content":false}'
```

The search call returns ranked chunks without calling OpenAI or storing anything. To check streaming, ask a question on the site and watch the answer arrive word by word. Each chat turn is stored as a real conversation, so don't script it in a test loop. `docker compose logs -f api` follows the container's logs, one JSON line per request.

Last, set `NEXT_PUBLIC_API_URL=https://api.daveclintonn.cc` in Vercel and redeploy the site. The old Upstash, Neon and AI SDK packages, the route handlers and the cron entry are already deleted from the repository.

### What's next

The backend now has a home for new products: a package, a `Routes` method and a line in `main.go`. From here I'll build them one at a time, each with a post explaining how it works and a version on this site that you can try.

## Understanding AI Models

Published 2026-11-02 at https://www.daveclintonn.cc/blog/understanding-ai-models

A simple explanation of what an AI model is, how it learns, and what happens when you use one.

I use AI tools to help me understand ideas and write code. But I wanted a clearer picture of what an AI model actually is and what happens when I ask it a question.

[Lee Robinson's introduction to AI](https://leerob.com/ai) helped me explore the topic. This is my simpler explanation of the ideas that helped me understand a model, without going too far into the mathematics.

If you're a student, each section ends with the campus units that build that part of the skill. The unit codes come from the [University of Nairobi's BSc Computer Science course structure](https://computerscience.uonbi.ac.ke/admission-content-type/bachelor-science-computer-science). Other universities use different names and codes, so match units by topic. Where a topic usually isn't taught as its own undergraduate unit, I've added a free course from a university that teaches it.

### What is an AI model?

An AI model is a system trained on examples to recognize patterns and use them to produce an output. Depending on how it was built and trained, it might classify an image, predict a number, or generate text.

A language model works with text. Give it a question or an instruction, and it generates a response based on patterns it learned during training and the context you provide.

In traditional software, a developer writes rules for the program to follow. With a model, developers also write the software, but the model learns many of its patterns from data instead of having every response written by hand.

- **Artificial Intelligence Applications** (SCS3307, Computer Science): what AI systems are and where they're used in practice.
- **Knowledge-based Systems & Programming** (SCS3205, Computer Science): systems built from rules people write, the top row of the diagram. Knowing them makes it clearer what learning from data replaces.
- **Machine Learning Algorithms & Programming** (SCS3212, Computer Science): the bottom row, learning from labelled examples.

Free extra: [Harvard's CS50 AI](https://cs50.harvard.edu/ai/) moves from rules and search to machine learning, with Python projects.

### How does a model learn?

Training starts with data. For a language model, that can include text and code from a variety of sources. The quality and makeup of that data affect what the model can learn.

The model uses a mathematical structure called a neural network. During training, it makes predictions, measures how far those predictions are from the expected answers, and adjusts internal numbers called **parameters**. This process is repeated across many examples.

Those parameters hold the patterns the model has learned. They are not a neatly organized set of facts, and learning a pattern does not guarantee that the model will always apply it correctly.

The illustration follows one example through a few rounds of that loop: the prediction for “blue” improves as the parameters are adjusted, and the error falls. [Google's neural network glossary](https://developers.google.com/machine-learning/glossary/fundamentals#neural-network) includes another diagram if you want to see how the layers connect.

- **Linear Algebra** (SMA3211, Mathematics): parameters are stored as matrices, and most of a network's work is multiplying them.
- **Differential and Integral Calculus** (SMA3114, Mathematics): derivatives tell training which way to adjust each parameter to reduce the error.
- **Probability and Statistics** (SMA3124, Mathematics): a prediction is a probability, and the error in the diagram is measured from it.
- **Machine Learning Algorithms & Programming** (SCS3212, Computer Science): puts the three together in working code.

Free extras: [Stanford CS229](https://cs229.stanford.edu/) for the mathematics of machine learning, [MIT 18.06](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/) for linear algebra, and [3Blue1Brown's neural network series](https://www.3blue1brown.com/topics/neural-networks) for a visual explanation of how training adjusts a network.

### What happens when you ask a question?

Once a model has been trained, using it is called **inference**. For a language model, the process looks roughly like this:

**1. Break the question into tokens.** A token might be a word, part of a word, or punctuation.

**2. Predict the next token.** The model processes the tokens and scores possible next tokens based on the context. Those scores become probabilities, and one token is picked from them. It isn't always the most likely one: a setting called **temperature** controls how adventurous the pick is, which is one reason the same question can get different answers.

**3. Build a response.** The model repeats the process, adding tokens one at a time. Step through this simplified example:

Many language models use a structure called a **transformer**. It uses attention to help the model consider relationships between different parts of the text. This helps it use the surrounding context when producing a response. Choose a word below to see which earlier words it draws on.

- **Data Structures and Algorithms** (SCS3108, Computer Science): a tokenizer is an algorithm that splits text and looks pieces up in a vocabulary.
- **Probability and Statistics** (SMA3124, Mathematics): temperature and token picking are sampling from a probability distribution.
- **Automata Theory** (SCS3204, Computer Science): a formal way to think about how text and languages can be processed.

Few undergraduate programmes have a unit on natural language processing or transformers. Check your electives and postgraduate units, or use these free courses: [Stanford CS224N](https://web.stanford.edu/class/cs224n/) covers natural language processing with deep learning, including attention and transformers; [MIT 6.S191](https://introtodeeplearning.com/) is a short introduction to deep learning; and Andrej Karpathy's [Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html) builds a tokenizer and a small GPT step by step.

### A coding example

Imagine a language model trained on examples that include source code. During training, it can learn patterns in programming languages: how a function is written, how a loop is structured, and how code relates to a description of a task.

Later, you might ask it, “Write a Python function that sorts a list.” The model uses your request and the patterns it learned to generate code. It may produce a useful function, but it can also make mistakes, so you still need to read and test the result.

- **Software Engineering** (SCS3209, Computer Science): testing and reviewing code, the habit you need for anything a model writes.
- **Analysis and Design of Algorithms** (SCS3213, Computer Science): lets you judge whether a generated sorting function is correct and how fast it is, not just whether it runs.
- **Programming Project** (SCS3206) and **Computer Systems Project** (SCS3403, Computer Science): a safe place to build with AI tools and practise checking what they produce.

### Can a model keep improving?

After the initial training, a model can be trained further for particular tasks or behaviors. This is called **fine-tuning**. For example, a team might use additional examples to help a model follow instructions or work better on a specific kind of task.

Teams also evaluate models by testing them on examples and checking the results. These evaluations help reveal where a model does well and where it makes mistakes. They matter because an answer can sound confident and still be wrong.

- **Probability and Statistics** (SMA3124, Mathematics): evaluation is statistics. You choose test examples, measure error rates, and decide whether a difference is real.
- **Machine Learning Algorithms & Programming** (SCS3212, Computer Science): training, validation, and test data, and why a model that memorises its examples does badly on new ones.

Free extras: the [Hugging Face LLM course](https://huggingface.co/learn/llm-course) walks through fine-tuning open models in code. [Stanford CS336, Language Modeling from Scratch](https://stanford-cs336.github.io/) goes much deeper, from building the model to training and adapting it, and needs strong Python.

### A model and an application are different

The model is the system that processes input and produces output. An AI application is the software built around it: the interface you use, the instructions sent to the model, and any tools or information the application provides.

For example, GPT refers to a family of models, while ChatGPT is an application that lets people interact with models. An application can use a model without having trained that model itself.

Keeping the two apart helps me think about the tools I use every day. The model makes the predictions, and the application decides what to do with them.

- **Web and Services Programming** (SCS3208, Computer Science): most AI applications reach a model through a web API.
- **Foundations of Human-Computer Interaction** (SCS3214, Computer Science): the interface decides how people read, trust, and check a model's answer.
- **Distributed Systems** (SCS3303) and **Cloud Computing and Services** (SCS3402, Computer Science): running an application reliably when many people use it at once.
- **ICTs and Society** (SCS3401, Computer Science): a place to think through privacy and responsibility when an application sends people's information to a model.
- **Industrial Attachment** (SCS3322): eight weeks in industry between third and fourth year. Ask for a team that builds or tests an AI application.

### Where to go next

If you want to see these ideas in action, start with a short sentence in [OpenAI's tokenizer](https://platform.openai.com/tokenizer). Change a word or add punctuation and see how the tokens change. Then ask a language model to explain the sentence and compare its answer with your own understanding.

If you'd rather learn from a book, these are useful places to continue:

- [*Hands-On Large Language Models*](https://www.oreilly.com/library/view/hands-on-large-language/9781098150952/titlepage01.html) by Jay Alammar and Maarten Grootendorst uses illustrations and code to explain language models, from the basics through using and adapting them. Start here if you'd like a visual introduction and know some Python.
- [*Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow*](https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/) by Aurélien Géron covers machine learning more broadly, with practical Python examples. Pick this if you want to understand models beyond language.
- [*Build a Large Language Model (From Scratch)*](https://www.manning.com/books/build-a-large-language-model-from-scratch) by Sebastian Raschka takes you through building and training a small GPT-style model. It's a deeper next step for readers comfortable with Python and some machine learning.

## What happens when a customer becomes a score?

Published 2026-10-28 at https://www.daveclintonn.cc/blog/when-a-customer-becomes-a-score

A viral Meta ads thread raises a larger question: what do customer scores measure, what do they miss, and whose information do they use?

You ask a business for a quote. It gives you a price. After that, a system decides whether you are worth another ad, a call from sales, or no further attention. How would the business know if it got that decision wrong?

An [X thread about selling expensive products with Meta ads](https://x.com/shdu11546816/status/2114882910096408939) made me think about that question. The author says their business stopped treating every quote request as equally valuable. It scored people using what they did after asking for a quote, then used the score to guide its ads. Later, the author says the business bought financial and demographic data and identified people who had only liked or commented on an ad.

  
  
    The opening post. Read the full thread on X.
  

I cannot verify the sale or the claimed results from the thread. I'm more interested in the system behind the story. A score can show a business that its ads bring in the wrong leads. It can also decide which people the business stops seeing.

### Start with the outcome

Imagine a company selling a costly item. Two people submit a quote form. One talks to sales, arranges delivery, and buys. The other wanted to compare prices. If the ad system sees only the form, both look like successes.

Meta [lets advertisers send later CRM outcomes back through its Conversions API for CRM](https://www.facebookblueprint.com/student/path/253141-conversions-api-crm-lead-quality). That can help a campaign aim for qualified leads instead of a pile of cheap forms. It is a useful idea even outside advertising: measure the result of the work, not just the first visible action.

Imagine a warehouse app where scanning a document starts a transaction in an accounting system. A dashboard could count every scan while missing a document that failed to post or a retry that posted twice. The useful outcome is whether the right document arrived once. I would want the same care in a sales funnel: a quote request, a conversation, and a completed sale should not all collapse into one number.

### What the score measures

The business in the thread reportedly used quote views, messages, calls, financing activity, and other signals to decide who counted as a qualified lead. Some of those actions may be useful. None is a sale.

Google's machine learning guide calls this the difference between a [direct label and a proxy label](https://developers.google.com/machine-learning/crash-course/overfitting/labels). A completed purchase is a direct record of a purchase. Opening a quote five times is a clue about what someone might do. It is only worth using if it predicts the outcome you care about.

The author also says the business changed its qualification threshold with the season. I can see the appeal: keep enough leads for the ad system to learn from. But then a "qualified lead" in a quiet month may not mean the same thing as one in a busy month. If the report improves, was the campaign better, or did the definition move? I would keep the final sale and its costs visible beside the score.

There is another question I would ask the sales team: who did the score reject? Someone who skipped a financing question might still buy. Someone who calls once might be ready to order, while a person who reads the quote repeatedly may never be. Reviewing those cases is more useful than adding a hundredth input to the model.

### An exclusion list can hide its mistakes

The thread describes automatically excluding people predicted not to buy. Once that happens, the business sees fewer outcomes for those people. Some might have bought after another ad or a later conversation, but the system has made that harder to observe. The model's decision changes the evidence used to judge the model.

Google [warns about this kind of feedback loop](https://developers.google.com/machine-learning/crash-course/production-ml-systems/questions): a prediction can affect the data a system receives next. So besides "Did we save ad spend?", I would ask "How many potential customers did we stop reaching, and what happened to actual sales?"

Even a higher count of sales credited to ads would not answer whether the ads caused those sales. Meta teaches [Conversion Lift tests](https://www.facebookblueprint.com/student/path/253065-conversion-lift-marketing-measurement) to measure campaign impact. A test may be too much for a small business, but the question still matters: did the new scoring rule create additional business, or did it make the dashboard look better?

### More data brings a different problem

The thread moves from activity on the business's own website to data bought from brokers: credit scores, income, ethnicity, and details about children. It then describes identifying people who had interacted with an ad but had never visited the site. Those are the author's claims, not independently verified facts.

The [US Federal Trade Commission's study of data brokers](https://www.ftc.gov/reports/data-brokers-call-transparency-accountability-report-federal-trade-commission-may-2014) explains why the step matters. Brokers combine information from many sources into profiles that people often cannot see or correct. An inaccurate profile can change how a business treats someone. The UK's [Information Commissioner's Office says](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/organisations-using-marketing-services-of-data-brokers/) a business using broker data for marketing remains responsible for its use and must be clear with people about profiling and enrichment. Those rules are jurisdiction-specific; the thread alone cannot establish what was lawful.

Even data collected directly from a customer needs a purpose. The thread says the business kept every SMS, email, and call transcript. I would ask which decision needs that record, who can read it, and when it can be deleted. [NIST's definition of data minimization](https://csrc.nist.gov/glossary/term/minimization) is a useful test: collect and retain personal information only as far as it is needed for the purpose.

The stakes rise when a score decides who can see an opportunity. In a [US housing ad case](https://www.justice.gov/crt/case/united-states-v-meta-platforms-inc-fka-facebook-inc-sdny), the Justice Department challenged disparities in Meta's ad delivery, and a settlement required changes to the system. Selling an expensive consumer product is a different situation. The case shows why the people who never receive an ad can matter as much as the people who click it.

### What I would build first

I would start with a small record of the sales journey: where a lead came from, whether the person asked for a quote, whether sales reached them, and whether they bought. I would agree with the sales team on what "qualified" means and keep that definition stable long enough to test it against completed sales. I would look at a sample of leads marked unqualified before using the score to exclude anyone.

Then I would compare the cost of finding a customer with the profit from the sale, not just the cost of getting a form filled. If there were enough volume, I would test whether the change brought in sales that would not have happened anyway. I would also keep an inventory of each piece of personal data: where it came from, why it is needed, who receives it, and when it is removed.

That is a smaller system than the one in the thread, but it would show the business which leads became customers and which ones the score got wrong.

## What does an AI engineer actually build?

Published 2026-10-28 at https://www.daveclintonn.cc/blog/what-does-an-ai-engineer-actually-build

A hypothetical library assistant explains the decisions behind an AI application.

What does it take to build an AI assistant for a particular subject? You can try one here: this site's assistant answers questions about my work and experience.

A suggested question appears as you reach the assistant, and you can change it before sending. It searches this portfolio's knowledge base, asks for consent before storing the conversation, and doesn't display source links in the chat.

To show how an application like this works, I'll use a hypothetical library building an assistant for its readers.

### 1. Start with a question

Imagine a reader asks, “Can I renew a book if someone else has reserved it?” A language model can produce a convincing answer, but it may not know this library's rules.

The assistant could search the library's borrowing guide and give the relevant passage to the model alongside the question. The model can then use that passage to answer.

This approach is called retrieval-augmented generation, or RAG: find useful information first, then include it in the request to the model. [Martin Fowler and Bharani Subramaniam](https://martinfowler.com/articles/gen-ai-patterns/) explain how retrieval supplies information beyond a model's training.

### 2. Prepare the guide for search

Start with the current borrowing guide and ask a librarian to confirm it is correct. Split it into passages that keep each rule and its exceptions together, and save each passage with its source and version.

Make the passages searchable, then try questions readers might ask. A search for “Can I renew a reserved book?” should find the renewal rule and its exception before a model is asked to answer.

### 3. Give the model context

Suppose the guide says books can be renewed twice, except when another reader has reserved them. With that passage and the question, the model can explain the exception and the application can show where the rule came from.

The team can instruct the model to answer from the guide and refer readers to a librarian when information is missing. An old guide or a poorly matched passage can still produce a wrong answer, so the search and the response both need checking.

The basic flow looks like this:

```text
question = reader's question
passages = search the current library guide

if no useful passage is found:
    offer help from a librarian
else:
    ask the model to answer using the question and passages
    show the answer and its sources
```

This is a sketch, not runnable code. The team still has to decide how to identify useful passages and check whether an answer is supported by them.

### 4. Decide whether it can take action

Answering a question is different from changing a library account. To check a due date or renew a loan, the assistant would need a connection to the library system and a way to verify the reader's identity.

The team must decide which actions are allowed and make sure a failed renewal isn't reported as a success. [Anthropic's guide to building agents](https://www.anthropic.com/engineering/building-effective-agents) recommends starting simply and adding complexity when it improves the result; for this library, answering questions may be enough for a first version.

### 5. Check the answers

I'd make a set of questions the library expects, including a reserved book and a situation the guide doesn't cover. For each question, the team can record the expected answer and the passage that supports it.

Run those questions through the assistant and review the results with a librarian. Repeat the checks when the guide, search, instructions, or model changes, and add failures discovered after launch.

These checks are called evaluations, or evals; [Anthropic's guide](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) describes combining code and human judgment to assess agent behavior. Recording which passage was retrieved can also help the team trace a wrong answer, without retaining unnecessary reader information.

### 6. Keep watching after launch

The assistant could answer hundreds of questions and still leave readers confused. I'd want the library to check whether answers are correct, how often readers need a librarian, and whether those handoffs work.

Amazon's recent [engineering leadership update](https://www.aboutamazon.com/news/company-news/amazon-software-engineer-role-guideline-ai) makes a related point about developers using AI to build software: customer outcomes matter, while targets based on token usage or code changes can encourage waste. Amazon is discussing a different use of AI, but the question carries across: did the technology help someone get the job done?

### Where does the engineer fit?

An AI engineer may build applications around existing models, adapt models, or work on the systems that run and evaluate them; the boundaries between job titles vary by team. The library example focuses on the application: finding information, protecting accounts, checking answers, and deciding when a person needs to help.

When a reader asks about a reserved book, the work has paid off if the assistant can explain the current rule, show where it came from, and be honest when it needs help.

## Voice AI is learning when to speak

Published 2026-10-27 at https://www.daveclintonn.cc/blog/voice-ai-is-learning-when-to-speak

I use ChatGPT Voice every day. A good voice assistant needs to know when to listen, wait, and let me interrupt.

How does a voice assistant know when you're finished speaking?

A pause could mean you're done. It could mean you're searching for a word. Answer too early and it talks over you; wait too long and the conversation drags.

A basic voice assistant transcribes what I say, sends the words to a language model, and reads the answer aloud. Each step can work well on its own while the conversation still feels awkward. [OpenAI calls this a chained approach](https://developers.openai.com/api/docs/guides/voice-agents). Newer systems can handle incoming and outgoing audio together, which makes interruptions possible. They still have to decide when to take their turn.

These are the projects I've been following. Each one works on a different part of the conversation.

### Block and Dessa

Jack Dorsey's Block introduced [Dessa](https://block.xyz/dessa), a research model trained on spoken conversations without written transcripts or a pretrained language model. It can listen while it speaks. In Block's demos, it laughs and makes brief sounds of agreement during another person's turn. A transcript would lose that timing and tone. Dessa is still a research preview with limited access, so a demo cannot show how reliably it handles everyday calls.

### OpenAI and ChatGPT Voice

[ChatGPT Voice](https://learn.chatgpt.com/docs/features/voice) is my daily reference point. I can ask something, change my mind midway, and interrupt an answer. OpenAI also gives developers a choice: use a [realtime voice model](https://developers.openai.com/api/docs/guides/voice-agents) for the conversation, or combine transcription, a language model, and [speech generation](https://developers.openai.com/api/docs/guides/audio). The chained approach gives developers a transcript to inspect when something goes wrong.

### ElevenLabs

[ElevenLabs](https://elevenlabs.io/docs/eleven-agents/overview/) offers the pieces for building a voice agent: speech recognition, a language model, and a spoken reply. Its [conversation controls](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow) let developers adjust how long an agent waits through silence and whether a person can interrupt it. Those settings answer a familiar question from my ChatGPT calls: was I finished, or just thinking?

### Alibaba and Qwen

[Qwen3.8-Omni-Flash-Realtime](https://qwen.ai/blog?id=qwen3.8-omni-flash) can take live video as well as audio. Point a camera at an object and ask a question, and the assistant has to connect what it hears with what it sees. Qwen also provides a [desktop harness](https://github.com/QwenLM/Qwen-Live-Harness) for trying that interaction. The model has to know which object I mean, even if I never name it.

### ByteDance

[Seeduplex](https://seed.bytedance.com/en/blog/introducing-seed-full-duplex-speech-llm-attentive-listening-robust-interference-suppression-enabling-more-natural-interaction) focuses on when to answer. ByteDance says the model listens while speaking and uses more than a moment of silence to decide whether a person has finished. It also aims to avoid reacting to background voices. ByteDance reports fewer early replies in its own tests; I would want to hear how it handles ordinary pauses and interruptions before judging that claim.

### MiniMax

[MiniMax Speech 2.8](https://www.minimax.io/news/minimax-speech-28) tackles the sound of the reply. It can generate expressive speech, including breaths and hesitations, and its [API can stream audio](https://platform.minimax.io/docs/api-reference/speech-t2a-websocket) as it is made. That could make an answer pleasant to hear. It does not, by itself, tell the assistant when to speak or whether the answer is right.

When I try a voice assistant now, I pay attention to the pause before it answers, what happens when I interrupt, and whether it still understands after I correct myself. I can forgive an ordinary voice. I stop using the app when it keeps talking over me.

## What makes a product demo work?

Published 2026-10-25 at https://www.daveclintonn.cc/blog/what-makes-a-product-demo-work

A Y Combinator conversation about launch videos made me think about what a demo should show and what happens after someone watches it.

What makes someone watch a product demo and then try the product?

In a recent [Y Combinator conversation about launch videos](https://www.youtube.com/watch?v=v12aSIZIXUs), Farza Majeed talks about treating every demo as a small launch. He and Aaron Epstein also discuss why a YouTube video with 20,000 views can do more for a product than a Twitter video with three million. The comparison made me ask whether the right people saw what the product could do for them.

### Show the moment

Imagine a tool that turns meeting notes into a task list. A demo could open with its dashboard, tour the settings, and end on a tidy list. Start with the notes: three names, two deadlines, and a sentence nobody quite understands. Run the tool. Show the tasks it finds and the one a person has to correct.

That shows me what the tool does and where I still need to check its work. A minute of polished screens doesn't.

The same test works for almost any product. What was the person trying to do before opening it? What can they do afterward? Show those two moments clearly. If the result takes a long explanation, the video might be starting in the wrong place.

### Count what happens next

Views can tell you that a video travelled. They cannot tell you whether anyone needed the product. A smaller audience might include the exact people who have the problem; a huge audience might simply enjoy watching a clever demo.

I care about what happens after watching. Did someone try the tool with their own notes? Ask whether it works with their team's meetings? Come back after the first use? The right measure differs by product, but it should be something a person did with the product.

### Give people another look

Majeed's advice also takes pressure off the idea of one perfect launch day. A product changes. A short demo can show a problem it now handles better, or a feature users asked for. That gives people a reason to look again.

I'd make a new demo when the change matters to someone using the product. If all I can show is that a button moved, I can wait. If a task that used to take ten steps now takes two, I have a story worth showing.

A demo has worked if someone closes the video, opens the product, and tries it with their own messy notes.

## Who will run all these tiny apps?

Published 2026-09-17 at https://www.daveclintonn.cc/blog/who-will-run-all-these-tiny-apps

AI can build a tool for a handful of people. Y Combinator is asking who will make it easy to share and keep running.

What happens after AI builds a useful app for six people?

In its [Fall 2026 Requests for Startups](https://www.ycombinator.com/rfs#a-cloud-for-small-software), Y Combinator asks for a cloud for “small software.” Pete Koomen means tools made for one person or a handful of teammates. Agents can make these tools quickly. Getting them online and sharing them is still work.

### The first shared link

Imagine someone makes a page for a Saturday football group. It shows who is playing, who has paid for the pitch, and who is bringing the bibs. The first version works on their laptop. Then they send it to the rest of the group.

Where do everyone's updates go? Who can mark a payment as complete? If the maker changes the page next week, will the old entries still be there?

Nobody needs a grand product plan for that page. They need it to work until the season ends. A web host can serve the page, but a shared tool may also need saved data, accounts, permissions, and a way to update the code without losing what people entered. For a small app, setting those up can take longer than making the screen.

### Six users still need trust

The small audience does not make every problem small. An open link could show people's names and payment status to anyone who finds it. One player could accidentally change someone else's entry. The app's creator needs a way to decide who can read and edit each part.

There is another question if an agent wrote the code: what is that code allowed to reach once it is running? Koomen calls out permissions and the risk of letting people share arbitrary code. A cloud for these tools has to make the safe choice easy for someone who has never configured a server.

### What I would want from that cloud

YC compares the goal to sharing a Google Doc. I think the test goes further than producing a link. Can I invite the right people, change a rule next week, see what broke, and close the app when nobody needs it? Can the people using it get their data out?

I like this YC idea because it leaves room for an app that never needs more than six users. If the football group can open the same link next Saturday, find their names where they left them, and trust that only they can change the list, the cloud has done its job.

## Claude can build the app. Then what?

Published 2026-08-11 at https://www.daveclintonn.cc/blog/when-ai-can-build-the-app

A working demo is only the first version.

Updated October 27, 2026 with a recent r/ClaudeAI discussion.

What happens to developers when Claude can build a working app in a morning?

An agency owner on [r/ClaudeAI](https://www.reddit.com/r/ClaudeAI/comments/1xesfpc/if_claude_can_build_almost_any_app_what_is_the/) said he can give Claude a prompt, go to the gym, and come back to a working app. I believe him. Imagine a warehouse app that looks simple in a demo: staff scan a document, and the app posts a delivery record to an inventory system.

In use, a phone can lose its connection. A request can reach the inventory system and time out before the app gets a reply. Retry carelessly, and the same transaction might land twice. The demo works. Someone still has to solve what happens after it.

### Some apps really can end at version one

One reply in that thread came from a teacher who used Claude to make a classroom name picker. They wanted a particular way to choose students without hunting for a website, creating an account, or putting up with ads. They got a tool that worked for their lesson.

Good. I want more people to be able to do that. I have no interest in arguing that a teacher needs to hire a software team for a name picker.

I also think anyone selling a basic dashboard as though it takes months of special magic is in trouble. I can now get a rough interface and working flows on the screen much faster than I could a few years ago. Clients can see that too. They will ask why the price has not changed.

But I would ask them what happens after the demo. Who will use the app? What data does it touch? What happens when the internet drops or a record is wrong? For a classroom tool, the answers may be simple. For a warehouse or payments system, they usually aren't.

### Where the work goes

In that hypothetical warehouse, scans might need to wait until a connection returns. Each attempted write needs a stable identifier so a retry does not create a duplicate. Someone also has to decide which errors can be retried and which ones need a person to review them.

None of that makes a great five-minute app demo. It matters when staff are using the system every day.

An assistant for a company raises a different set of questions. Which company is this user asking about? Which records are they allowed to see? If the assistant gives a number, did it actually look that number up? If it proposes a change, can the user inspect it before anything is written? The model can help people work with data; permissions and an approval flow decide what it is allowed to do.

AI can help write and check code for both systems. But it cannot decide, on its own, what a warehouse team has agreed should happen after a failed scan or who should approve a change. A developer has to learn those rules from the people doing the work, build them into the software, and check that it behaves as agreed.

### I don't think anyone knows the job numbers yet

There is a lot of confidence in the thread about which jobs will disappear and which ones are safe. I'm less sure.

Even the productivity evidence depends on the task. In a [2025 study](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/), experienced developers working on mature projects took longer with the AI tools available at the time. The researchers' [2026 update](https://metr.org/blog/2026-02-24-uplift-update/) found signs that newer tools were helping, but they could not reliably measure how much. Meanwhile, [Anthropic's study of Claude Code use](https://www.anthropic.com/research/claude-code-expertise) shows people doing more substantial work with agents, with the user's knowledge still affecting the result.

Those findings fit what I see: a prototype, a small personal tool, and a change to a business system can all be called "building an app," even though they ask very different things of the person doing the work.

I expect some work to get cheaper. I expect people who could never afford custom software to start making it. I would be careful with anyone who claims to know the exact balance between those two changes, or the number of developers they will leave employed.

### What I would offer a client now

If I ran an agency that sold only the first build, I would be worried. I would want to know an industry well enough to spot the problems a prompt misses. I would want to stay involved when a new app has to meet an old database, a payment provider, a warehouse floor, or a support team.

And I would be clear about who answers the phone when something breaks.

That is where I want my own work to go. Give me the fast prototype. I'll use AI to help improve it. Then I'll sit with the people who actually have to use it and ask where it could fail them. I'll make sure the data goes to the right place, a retry doesn't quietly duplicate a transaction, and the next engineer can understand what I built.

Claude has made the first version easier for more people, and I'm glad. It also means I need to be able to say plainly what my work adds after that first version.

## If I were a software intern today

Published 2026-06-24 at https://www.daveclintonn.cc/blog/if-i-were-a-software-intern-today

If I were applying for a software internship now, I'd bring one small project I could explain after the demo was over.

Updated October 27, 2026 with Software Mansion's current internship guide.

What would I bring to a software internship interview today?

One small project I could explain without opening an AI chat. Software Mansion's [internship guide](https://rn.swmansion.com/blog/internships-in-a-nutshell-all-you-need-to-know-about-summer-and-winter-programs-at-software-mansion-and-how-to-get-on-board-1/) says applicants should describe a project they're proud of and explain which part they built. A personal project counts. So does a team project when you can speak clearly about your contribution.

I work in Kenya, where a good first opportunity can draw a lot of applicants. AI makes it easier to produce a polished demo. I want the project to hold up when somebody starts asking how it works and what happened when something went wrong.

### Start with somebody else's boring task

Forget the idea of building a whole company as a portfolio project. Find one person who does the same fiddly task every week. Ask them to show you. Maybe they check a spreadsheet for missing product codes. Maybe they copy numbers between two reports. Watch once, then ask where mistakes usually happen.

Take the spreadsheet example. Claude can write a script to highlight empty cells in seconds. But what does an empty product code mean? A new item waiting for approval? A mistake in the source file? A code that was never assigned? The person doing the work knows. Their answer decides what the tool should flag.

Now make a sample file with invented rows. Build the smallest thing that separates the cases. It could be a spreadsheet formula or a short program. Show the person the output and ask what you got wrong. Fix one thing they point out. That's your project. Use company data only if you have permission.

Imagine a warehouse app where a scan leads to a document in an inventory system. The code that sends the request may be straightforward. The difficult questions are what staff are scanning, which document should be created, and what to do when a request fails. A small student project will have fewer moving parts, but the habit of asking about the work before automating it is the same.

### Make AI earn its place in the project

Use it to explain a CSV parser. Ask for a first test. Let it show you another way to write a function. Then run the code yourself. Feed it a file with a missing column. Change a rule without asking it to make the edit. If you cannot tell why the output changed, stop and work that out before adding features.

In a [small 2026 study](https://www.anthropic.com/research/AI-assistance-coding-skills), developers learning a new Python library scored lower on a follow-up test when they had AI assistance. The researchers also observed that people who asked questions to understand the work tended to do better than those who handed the task over. That finding will not predict every person's experience. It does make me want to ask a simple question of my own projects: can I explain the part AI wrote?

Software Mansion's engineering internship expects programming basics. A project gives you somewhere to practice those basics: read an error, use Git, trace what happens to an input, and write a test for the case that broke last time. You can learn them while building, but you do have to learn them.

### What a team can learn from one small project

[Software Mansion gives interns real project work early](https://rn.swmansion.com/blog/internships-in-a-nutshell-all-you-need-to-know-about-summer-and-winter-programs-at-software-mansion-and-how-to-get-on-board-1/). I like that approach. A beginner gets to work on something somebody needs and see how experienced engineers handle the details.

A new developer could practice against a mock server instead of a live business system. Give them sample data, a clear expected result, and room to make mistakes before their work touches real records.

On a team, people with different levels of experience can review one another's work. An intern should get to show an early version, hear what is wrong with it, and try again. An applicant can ask about that: What would I work on first? Who can answer questions about it? When will someone look at an early version? Those answers tell you more about the opportunity than a long list of frameworks.

### Take it into the interview

Bring the spreadsheet checker and the sample file. Explain the task you watched, the rule you got wrong at first, and the feedback that changed it. Show one input the tool still can't handle, and say which parts AI wrote and which you changed yourself.

You can have that conversation without pretending to be an expert or having a company name on your CV. It may not get you the internship. There are more applicants than places, and interviews test other skills too. But it gives someone a real piece of your thinking to examine.

If I were starting over, I'd build one small tool for one person and make sure I could answer questions about it.

## When is paperwork worth a startup?

Published 2026-04-17 at https://www.daveclintonn.cc/blog/when-is-paperwork-worth-a-startup

A look at repetitive order entry, hypothetical SAP workflows, and how developers can find similar work worth building for.

At 6 p.m. on a Saturday, Riyo still had more than 100 paper work orders to enter into a computer. Pallet founder Sushanth Raman [saw the stack when he visited Riyo's trucking company](https://www.pallet.com/blog/series-b). The task took six hours every weekend, and deliveries depended on those orders getting entered.

[Will Phillips spent a day inside Pallet](https://www.youtube.com/watch?v=aqJAbwtXBzg) and filmed the team working on problems like Riyo's. I want to look at what a developer needs to learn before building software for that work, and how to tell whether solving it for one company could become a business.

### Why bring SAP into this?

[SAP](https://www.sap.com/sea/about/company/faq.html) is a German software company; its name stands for Systems, Applications, and Products in Data Processing. It is best known for ERP, or enterprise resource planning: software that keeps a company's sales, purchasing, inventory, and finances connected. An order can affect stock, delivery, and accounting, which is why entering it correctly matters.

This is a large market, and it includes ordinary-sized businesses. SAP reported [€36.8 billion in 2025 revenue](https://www.sap.com/integrated-reports/2025/en/datahub/financial-data/five-year-summary.html) and a [€256 billion stock market value at the end of 2025](https://www.sec.gov/Archives/edgar/data/1000184/000110465926020058/sap-20251231x20f.htm). The stock market figure changes with its share price. SAP says [Business One serves more than 83,000 customers](https://news.sap.com/2025/12/global-success-of-sap-business-one/), mostly small and midsize companies. One partner's customer grew from three employees to 250 while continuing to use it. A growing distributor can be running SAP long before it looks like a giant corporation.

There is no single "SAP system" to integrate with. [Business One can run in the cloud or on premises](https://learning.sap.com/products/business-one). Larger organizations may use [SAP S/4HANA in public cloud, private cloud, or on premises](https://learning.sap.com/courses/customizing-core-settings-in-financial-accounting-in-sap-s4hana/getting-an-overview-of-sap-s-4hana-1). Those are different products and deployment choices. The following examples are hypothetical Business One workflows.

### A hypothetical order workflow

Imagine a distributor that turns purchase orders in one company database into sales orders in another. Instead of entering each order by hand, staff could review the exceptions.

### A hypothetical fleet workflow

Imagine a scheduled sync from a fleet tracking system into SAP. Trips can arrive late or change after the first reading; the job would have to catch that.

### How to start building it

I'd ask someone to show me a few purchase orders and the sales orders they entered from them. Where did they find the matching item? Which cases did they leave for review? Those decisions become the first rules.

Start with a preview of what the job plans to create. Post orders with clear matches, send uncertain ones to a person, and record each result. Before retrying a timed-out write, check whether the order already exists.

When several companies use the product, each job needs a clear source and destination. Keep their records and review queues separate, and decide who can approve a job.

### Where LangChain could help

Neither hypothetical workflow needs LangChain if its inputs are already structured records. If your input is an emailed PDF, [LangChain's structured output](https://docs.langchain.com/oss/javascript/langchain/structured-output) could extract its fields before the same checks and review. [LangGraph can pause for approval](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph) when that workflow grows more complex.

### Find out whether anyone wants it

Count how many orders need correction, how long review takes, and whether anyone still re-enters them in SAP. Hundreds of orders a day can justify an automation inside one business. A startup needs evidence that other businesses share the problem and will pay to solve it.

The business may be in the odd rules. Pallet's CTO [writes about learning customer-specific context](https://www.pallet.com/blog/memory-reasoning-overview) from the way people handle exceptions. For an SAP product, those rules might include item aliases, delivery instructions, and approval paths. I would work with one company until those rules are visible, then try a second to see what repeats.

SAP says [roughly 850 partners support Business One](https://news.sap.com/2025/12/global-success-of-sap-business-one/), and its [partner directory](https://www.sap.com/africa/partners/find.html) gives you a place to find them by product and location. I'd ask an implementation partner where their customers still spend hours moving information by hand. If one customer wants that work changed, the partner knows their SAP setup and I can help build and test a small solution with them.

SAP is one example. The same kind of work happens when someone enters supplier invoices into accounting software, processes applications in a school system, or turns service requests into jobs for a property manager. Look for a task that repeats, a person who can show you how they do it, and a system where the result has to go.

No SAP access yet? You could try the same exercise with sample data in [ERPNext](https://docs.frappe.io/erpnext/integrating-erpnext-with-other-applications), or any system you know well. The hard part is still learning what the person doing the work knows that the record doesn't say.

## Why I keep watching Game of Thrones

Published 2026-03-06 at https://www.daveclintonn.cc/blog/why-i-keep-watching-game-of-thrones

I've watched the whole series five times since it ended. Here's why I still want people to see it for the first time.

I've watched all eight seasons of *Game of Thrones* five times since the final episode. That is a lot of evenings spent in Westeros, and I still get excited when somebody tells me they're thinking of starting it.

Let me start with the dragons. If you haven't watched the show, I could try to describe what it feels like when one spreads its wings. Or I could show you this:

Look at the people underneath him. Then look at Daenerys on his back. One creature changes the size of the whole world around him. I love the sound of his wings, the way the music rises when he appears, and the brief silence before you find out what he is going to do.

The more I watch, the more the dragons feel like characters. Drogon can be close to Daenerys one moment and terrifying the next. He has a temper. He watches people. He doesn't seem like something she can simply point in a direction and control. The other dragons have their own presence too, and I find myself looking for them, wondering what will happen to them, the same way I do with the people.

The dragon in that second picture is Viserion, after the Night King brings him back for the White Walkers. I watched him grow alongside Drogon. The blue fire looks incredible, but what makes me stop and stare is knowing who he was before.

The show can pull me in just as quickly with a look across a table, an insult somebody has been saving for the right moment, or a person walking into a room where they aren't welcome. I love that all of it belongs to the same story.

I've talked my sister, some friends, and people I've met on Twitter into giving it a chance. I try not to tell them too much. Half the pleasure is meeting these people yourself and deciding, sometimes very confidently and very wrongly, who you can trust.

The show can look intimidating from the outside. There are kingdoms, families, names that sound alike, and a map in the opening credits. Please don't feel you need to learn any of it before you press play. I certainly wouldn't ask someone to study for a TV show. Give the people a little time. Soon you know whose arrival makes you nervous, whose joke makes you laugh, and whose safety you're worried about when an episode ends.

That's what keeps me watching. I care about people who make awful choices. I get attached to people I didn't expect to like. Sometimes I wish two characters could sit down and have an honest conversation, even while I know it would be a much shorter series if they did. The show makes room for all of that alongside the spectacle. It can fill the screen with an army, then make a quiet conversation feel just as important.

And it is funny. A scene with Tormund insisting he has *always* had blue eyes still makes me laugh. That little burst of annoyance comes in a world where everyone has plenty of reasons to be afraid. I love that the characters can be frightened, foolish, brave, and funny, sometimes within minutes of each other.

I've watched *House of the Dragon* and *A Knight of the Seven Kingdoms*, and I'm glad there are more stories in this world. The original is still the one I keep going back to. Knowing what happens hasn't worn it out for me. It gives me more time to notice the faces, the conversations, and the little moments I missed before.

If you've never watched *Game of Thrones*, give it a few episodes. Then tell me who you trust. When you've met the dragons, tell me which one you like. Five rewatches in, I still want to hear your answer.
