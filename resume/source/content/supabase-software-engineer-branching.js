// Resume for Supabase, Software Engineer - Branching (Remote, Global).
module.exports = {
  output: "Supabase_Software_Engineer_Branching.pdf",
  name: "David Clinton Hellen",
  headline: "Software Engineer | Go, TypeScript, Job Automation, and Cloud Deployment",
  contact: [
    ["Mombasa, Kenya (UTC+3, remote)", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "skills", "experience", "projects", "writing", "education"],

  summary:
    "Software engineer with five years of experience building production systems in Go, TypeScript, and Python. Builds scheduled jobs, release automation, and retry and failure handling that behave predictably when a step fails. Deploys containerized services on AWS and Linux with health checks and rollback steps, has carried on-call for production services, and has worked across several remote teams.",

  skills: [
    ["Languages", "Go, TypeScript, Python, SQL, and Bash"],
    ["Job and pipeline reliability", "Scheduled jobs, retries with exponential backoff, timeouts, idempotency keys, dead-letter and replay, preview modes, run logs, and watermarks"],
    ["CI/CD and release", "GitHub Actions, self-hosted runners, signed builds, serialized runs, publishing guards, Workload Identity Federation, versioned releases, and rollback-ready image tags"],
    ["Cloud and containers", "AWS, S3, CloudFront, Docker, Docker Compose, Linux, Nginx, systemd, and Vercel"],
    ["Data", "PostgreSQL, pgvector, Redis, SAP HANA, and MSSQL"],
    ["Observability and security", "Structured JSON logs, journald, health checks, Sentry, secrets kept out of source control, tenant isolation, and role-based access control"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Built a scheduled Go service for fleet trip sync and intercompany sales-order automation, with every run logged to PostgreSQL, a preview mode that shows changes before writing, and an HTTP API for job status.",
        "Added deduplication, watermarks, and transactional writes to the sync and reconciliation pipeline.",
        "Built a transactional outbox for SAP delivery events with stable idempotency keys, exponential backoff, dead-lettering, and replay, plus a client with connect and read timeouts and typed retryable errors.",
        "Built CI/CD for Android releases with GitHub Actions: signed builds, serialized runs, guards against accidental publishing, and Workload Identity Federation for short-lived Google Cloud credentials.",
        "Run releases with versioned release directories, symlink activation, health checks, PostgreSQL backups, and written rollback steps.",
        "Manage on-premises Linux infrastructure with Nginx, systemd, Docker Compose, internal DNS, LAN and DMZ routing, and TLS termination.",
        "Keep credentials out of source control and separate from configuration, with services that refuse to start when a required value is missing.",
        "Built TypeScript dashboard surfaces with React and Next.js, and wrote OpenAPI specs and a production-shaped mock server for app developers.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Deployed the containerized Django backend and admin dashboard on AWS, with media on S3 and CloudFront and Next.js sites on Vercel, and supported the rollout to 3 schools.",
      ],
    },
    {
      role: "Full Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: ["Migrated financial data from SAP HANA to PostgreSQL, tuned payment modules for batches of more than 10,000 records, and worked on deployments."],
    },
    {
      role: "Frontend Developer (Contract)",
      company: "Element Pay",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: ["Built Next.js and TypeScript product and developer pages for a stablecoin payments platform."],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: ["Tested APIs and wrote integration guides and code samples, including private container registry workflows across Docker Hub, GHCR, GCR, ECR, ACR, and Harbor."],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya",
      dates: "May 2022 – May 2024",
      bullets: ["Built investor dashboards in React and Next.js on a team of 12 engineers, reviewing and approving pull requests. Published 3 Apache Superset chart plugins to npm."],
    },
    {
      role: "Technical Author (Contract)",
      company: "Paperspace (now part of DigitalOcean)",
      place: "Remote",
      dates: "Jan 2021 – May 2023",
      bullets: ["Published 6 bylined articles on PyTorch, GPU utilization, training, and benchmarking."],
    },
  ],

  projectsTitle: "Selected Projects",
  projects: [
    {
      title: "Portfolio Backend",
      stack: "Go, Docker, Nginx, PostgreSQL | [Live assistant](https://www.daveclintonn.cc/ask-ai)",
      bullets: [
        "Moved an AI assistant from serverless functions to a single Go binary in a non-root distroless image of about 25 MB, with graceful shutdown and startup config validation.",
        "Wrote a re-runnable Bash deploy script for a shared server that selects free ports, runs `nginx -t` before reload, and fails with logs if `/healthz` does not pass.",
      ],
    },
    {
      title: "HANA Enterprise Intelligence",
      stack: "Django, Next.js, TypeScript, SAP HANA",
      text: "Sole author of a multi-tenant analytics system with encrypted credentials, SQL validation, and a read-only gateway with retries and typed failures.",
    },
  ],

  writing: [
    "[Moving my portfolio's backend to Go on a VPS](https://www.daveclintonn.cc/blog/moving-my-portfolio-backend-to-go) (2026): step-by-step tutorial covering the Go service, Docker packaging, and deployment behind Nginx.",
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
};
