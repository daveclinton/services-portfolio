// Resume for Coop, Software Engineer, Systems and AI Integration.
module.exports = {
  output: "Coop_Software_Engineer_Systems_AI_Integration.pdf",
  name: "David Clinton Hellen",
  headline: "Software Engineer, Systems and AI Integration",
  // One inner list per line.
  contact: [
    ["Nairobi, Kenya", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "linkedin.com/in/clintondavid46", "github.com/daveclinton"],
  ],

  summary:
    "Software engineer with five years in the industry, the last two and a half spent building backend services and system integrations. At Mika (Ideal Appliances) I connect warehouse, warranty, delivery and fleet systems to SAP Business One and SAP HANA. I also built an internal AI assistant that reads ERP data through permission-checked tools and can only change anything after a person approves it. I work in Python, Go, TypeScript and Kotlin, run my own services on Linux, and write the API documentation for what I build.",

  skills: [
    ["Integration patterns", "REST/JSON APIs, OpenAPI/Swagger, webhooks, scheduled batch jobs, transactional outbox, idempotency keys, retry with exponential backoff, dead-letter and replay, reconciliation, ETag concurrency control"],
    ["Enterprise systems and APIs", "SAP Business One Service Layer, SAP HANA, MSSQL, Wialon, Meta WhatsApp Cloud API, Africa's Talking SMS, Paystack, Firebase Cloud Messaging, SendGrid"],
    ["AI integration", "OpenAI and Gemini tool calling, human approval of agent actions, natural-language queries over SAP HANA, retrieval-augmented chat, evaluation tests"],
    ["Security", "JWT, API keys, OTP, role-based access control, tenant isolation, throttling, field-level encryption, HMAC webhook signature checks, secrets kept out of source control"],
    ["Languages", "Python, Go, TypeScript, Kotlin, SQL, Bash, Dart"],
    ["Frameworks and data", "Django, Django REST Framework, FastAPI, Next.js, React, Jetpack Compose, Flutter, PostgreSQL, Redis, SQLite/Room"],
    ["Operations and testing", "Linux, Nginx, systemd, Docker Compose, GitHub Actions, health checks, rollback runbooks, pytest, contract tests, Vitest, Playwright"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Built the Django REST backend that connects warehouse, eWarranty and last-mile delivery workflows to SAP Business One (Service Layer) and SAP HANA for several group companies.",
        "Replaced manual SAP entry in the warehouse. Delivery notes, goods issues and goods receipts are now posted to SAP after staff scan the source documents.",
        "Built an AI assistant that answers staff questions by calling read-only lookup tools as the signed-in user. Writes are saved as proposed actions and run through the existing API endpoint, with its permission checks, only after the user approves them. A grounding check sends the model back to the data when it quotes figures it did not look up; actions and grounding have automated tests.",
        "Built a transactional outbox for delivery events sent to SAP. Each event is written in the same database transaction as the business change under a stable idempotency key, retried with exponential backoff, dead-lettered after the last attempt and replayable under the same key. The SAP Service Layer client behind it uses connect and read timeouts, ETag concurrency checks and typed errors marked retryable or permanent.",
        "Built the Wialon-to-SAP HANA fleet trip sync and intercompany sales-order automations in a Go service. Jobs run on a schedule, every run is logged to PostgreSQL, a preview mode shows changes before writing, and an HTTP API reports job status.",
        "Built two native Kotlin Android apps released on Google Play: a warehouse app with Honeywell scanner support that stores scans in a local queue and syncs them in the background when the network returns, and a warranty and service app for Azone.",
        "Automated signed Android builds, Firebase tester distribution and Play releases with GitHub Actions, using Google Cloud Workload Identity Federation instead of stored service-account keys.",
        "Delivered a warranty registration app used by six outlets in Rwanda. Buyers verify their phone by WhatsApp code and upload receipts through short-lived upload grants. Managers approve each registration, and approved sales create sales orders, delivery notes and goods issues in SAP.",
        "Run these services on company Linux servers behind Nginx and systemd, with separate LAN and DMZ entry points, TLS terminated at the DMZ, health checks, database backups and written rollback steps.",
        "Wrote OpenAPI specs, API conventions, a role-to-endpoint permission matrix and a production-shaped mock server so app developers can work without SAP access.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Worked on the Django REST backend and the Flutter mobile app, and shipped the app to the Apple App Store and Google Play.",
        "Integrated OpenAI conversations into the backend and built a chat interface that supports several model providers.",
        "Deployed the containerised backend and Angular admin dashboard on AWS, with media on S3 and CloudFront and the Next.js sites on Vercel. Supported the rollout to three schools.",
      ],
    },
    {
      role: "Full Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Migrated financial data from SAP HANA to PostgreSQL, tuned payment modules for batches of more than 10,000 records, and worked on CRM workflows and deployments for donor-facing platforms.",
      ],
    },
    {
      role: "Frontend Developer (Contract)",
      company: "Element Pay",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Built Next.js product and developer pages for a stablecoin payments platform, covering invoicing, collections, USDC to M-Pesa off-ramp and the API console.",
      ],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Wrote a measured tutorial on whether React Native's New Architecture and React Compiler make an Android app faster. Built three Release variants of one app, ran repeated launch, navigation and scroll trials on a physical phone using mobile performance monitoring and adb scripts, and reported results and limits from the raw data.",
        "Tested client APIs and wrote documentation, integration guides and code samples for developer tools in cloud infrastructure, AI, media and web data.",
      ],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya (Hybrid)",
      dates: "May 2022 – May 2024",
      bullets: [
        "Built investor dashboards in React and Next.js, integrated third-party financial APIs with error handling, and published three Apache Superset chart plugins to npm.",
      ],
    },
    {
      role: "Technical Author (Contract)",
      company: "Paperspace (now DigitalOcean)",
      place: "Remote",
      dates: "Jan 2021 – May 2023",
      bullets: [
        "Published six articles on PyTorch, GPU utilisation, mixed-precision training and GPU benchmarking.",
      ],
    },
  ],

  projects: [
    {
      title: "HANA Enterprise Intelligence",
      stack: "Django, Next.js, SAP HANA, OpenAI",
      text: "Natural-language analytics over SAP HANA. Users choose approved schemas and views; the system turns a question into SQL, validates it, runs it read-only and returns a table or chart. Database and OpenAI credentials are encrypted per company, and the HANA connection layer retries and returns typed failures.",
    },
    {
      title: "Opesi Mansion",
      stack: "Astro, Paystack, FastAPI",
      text: "My own company. Built the website with Paystack checkout, webhook signature checks (HMAC-SHA512 with constant-time comparison) and stored payment events. Built Opesi Studio, a FastAPI service that removes photo backgrounds for online sellers.",
    },
    {
      title: "Aqua Prana",
      stack: "Django REST Framework, Next.js, Expo",
      text: "Moved a fish-farming platform's API from Next.js routes to Django REST while keeping the same URLs, request bodies and responses, so the mobile app, admin console and website needed no changes.",
    },
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya  |  Aug 2015 – Apr 2019",
  ],
  certifications: [
    "Jira Fundamentals Badge, Atlassian, Oct 2022",
    "Introduction to Programming Using Python, Udacity, Jun 2020 (Credential ID 9SRQKQDN)",
  ],
  referees: "Available on request.",
};
