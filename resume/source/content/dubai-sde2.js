// Resume for the unnamed Dubai company's SDE roles, shared on X. Rename `output` once the company is known.
module.exports = {
  output: "Dubai_Company_SDE2.pdf",
  name: "David Clinton Hellen",
  headline: "Software Engineer | Backend, Full Stack and Android",
  contact: [
    ["Mombasa, Kenya (open to relocating to Dubai)", "+254 701 176 923", "clintondavid46@gmail.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "skills", "experience", "projects", "education", "referees"],

  summary:
    "Software engineer with five years of experience, including two and a half years building backend services and system integrations. Builds and operates Python and Go services on Linux that connect warehouse, fleet and warranty systems to SAP, with web and Android clients. Experienced in API design, PostgreSQL, fault-tolerant event delivery, CI/CD and AI integration, from system design through deployment and support.",

  skills: [
    ["Languages", "Python, Go, TypeScript, Kotlin, SQL, Bash"],
    ["Backend", "Django, Django REST Framework, FastAPI, REST APIs, OpenAPI, webhooks, scheduled jobs"],
    ["Data", "PostgreSQL, Redis, SAP HANA, MSSQL, SQLite/Room"],
    ["System design", "Transactional outbox, idempotency, retries with backoff, dead-letter and replay, reconciliation, ETag concurrency control, multi-tenant access control"],
    ["Frontend and mobile", "React, Next.js, Kotlin, Jetpack Compose, Flutter"],
    ["Infrastructure", "Linux, Nginx, systemd, Docker Compose, AWS, S3, CloudFront, GitHub Actions"],
    ["Testing", "pytest, contract tests, Vitest, Playwright"],
    ["AI integration", "OpenAI and Gemini tool calling, retrieval-augmented chat, human approval of agent actions, evaluation tests"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Built the Django REST backend that connects warehouse, warranty and last-mile delivery workflows to SAP Business One and SAP HANA for several group companies.",
        "Replaced manual SAP entry in the warehouse: delivery notes, goods issues and goods receipts are now posted to SAP after staff scan the source documents.",
        "Built a transactional outbox for SAP delivery events with stable idempotency keys, exponential backoff, dead-lettering and replay. Added timeouts, ETag concurrency checks and typed retryable errors to the SAP client.",
        "Built a scheduled Go service that syncs Wialon fleet trips to SAP HANA and automates intercompany sales orders, with PostgreSQL run logs, a preview mode and an HTTP API for job status.",
        "Built an AI assistant that answers staff questions through read-only tools as the signed-in user. Writes run only after the user approves them, and actions and grounding checks have automated tests.",
        "Built 2 native Kotlin Android apps released on Google Play, including a [warehouse app](https://play.google.com/store/apps/details?id=com.dawda.mikawms) with Honeywell scanner support and an offline scan queue that syncs in the background.",
        "Shipped a warranty registration app used by 6 outlets in Rwanda, where approved sales create sales orders, delivery notes and goods issues in SAP.",
        "Run these services on on-premise Linux servers with Nginx and systemd, separate LAN and DMZ entry points, health checks, database backups and written rollback steps.",
        "Automated signed Android builds and Google Play releases with GitHub Actions, using Workload Identity Federation for short-lived credentials.",
        "Wrote OpenAPI specs, API conventions and a mock server so app developers can work without SAP access.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Worked on the Django REST backend and Flutter app, and shipped the app to the App Store and Google Play.",
        "Integrated OpenAI conversations into the backend and built a chat interface that supports several model providers.",
        "Deployed the containerized backend and admin dashboard on AWS, with media on S3 and CloudFront, and supported rollout to 3 schools.",
      ],
    },
    {
      role: "Full Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Migrated financial data from SAP HANA to PostgreSQL, tuned payment modules for batches of more than 10,000 records, and worked on CRM workflows and deployments.",
      ],
    },
    {
      role: "Frontend Developer (Contract)",
      company: "Element Pay",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Built Next.js product and developer pages for a stablecoin payments platform, covering invoicing, collections, off-ramp and the API console.",
      ],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Tested client APIs and wrote documentation, integration guides and code samples for developer tools in cloud infrastructure, AI, media and web data.",
      ],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya",
      dates: "May 2022 – May 2024",
      bullets: [
        "Built investor dashboards in React and Next.js, integrated third-party financial APIs, and published 3 Apache Superset chart plugins to npm.",
      ],
    },
    {
      role: "Technical Author (Contract)",
      company: "Paperspace (now DigitalOcean)",
      place: "Remote",
      dates: "Jan 2021 – May 2023",
      bullets: ["Published 6 technical articles on PyTorch, GPU utilization, training and benchmarking."],
    },
  ],

  projectsTitle: "Selected Projects",
  projects: [
    {
      title: "Portfolio Backend",
      stack: "Go, Docker, Nginx, PostgreSQL | [Live assistant](https://www.daveclintonn.cc/ask-ai)",
      bullets: [
        "Moved an AI assistant from serverless functions to a single Go binary on a VPS, with rate limiting, streaming responses, startup config validation and graceful shutdown.",
      ],
    },
    {
      title: "HANA Enterprise Intelligence",
      stack: "Django, Next.js, SAP HANA, OpenAI | [Source](https://github.com/daveclinton/Hana-Enterprise-Intelligence)",
      bullets: [
        "Sole author of a natural-language analytics system that converts questions into SAP HANA SQL, validates each statement and runs it read-only, with encrypted credentials and workspace permissions.",
      ],
    },
    {
      title: "Aqua Prana",
      stack: "Django REST Framework, Next.js, Expo",
      bullets: [
        "Moved a fish-farming platform's API from Next.js routes to Django REST with the same URLs, request bodies and responses, so the mobile app, admin console and website needed no changes.",
      ],
    },
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
  referees: "Available on request.",
};
