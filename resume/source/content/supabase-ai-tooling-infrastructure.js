// Resume for Supabase, Software Engineer - AI Tooling Infrastructure (Remote, Global).
module.exports = {
  output: "Supabase_Software_Engineer_AI_Tooling_Infrastructure.pdf",
  name: "David Clinton Hellen",
  headline: "Software Engineer | Backend Services, API Authorization, and AI Tooling",
  contact: [
    ["Mombasa, Kenya (UTC+3, remote)", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "skills", "experience", "projects", "writing", "education"],

  summary:
    "Software engineer with five years of experience, focused on backend services that handle partial failure, retries, and permissions. Builds and operates Go, Python, and TypeScript services with PostgreSQL and Docker, including a production AI agent whose tools run under the signed-in user's permissions, and has built an MCP server and carried on-call for production services. Experienced in documented APIs, rate limiting, and failure handling across external systems such as SAP. Writes clearly for developers, with published technical work since 2021.",

  skills: [
    ["Languages", "Go, TypeScript, Python, SQL, and Bash"],
    ["APIs and authorization", "REST, OpenAPI/Swagger, JWT, OAuth 2.0, API keys, role-based access control, tenant isolation, rate limiting, typed errors, and backward-compatible migrations"],
    ["Distributed failure handling", "Transactional outbox, idempotency keys, retries with exponential backoff, dead-letter and replay, timeouts, ETag concurrency control, and reconciliation"],
    ["AI services", "MCP servers, OpenAI and Gemini tool calling, streaming over Server-Sent Events, human approval of agent actions, grounding checks, and evaluation tests"],
    ["Data", "PostgreSQL, pgvector, Redis, SAP HANA, and MSSQL"],
    ["Delivery and operations", "On-call, Docker, Docker Compose, GitHub Actions, Linux, Nginx, systemd, AWS, Vercel, structured logs, health checks, Sentry, and rollback runbooks"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Built and run a production AI agent whose read-only tools run as the signed-in user, while writes are saved as proposed actions and run through the existing API endpoint, with its permission checks, only after the user approves them.",
        "Built a transactional outbox for SAP delivery events with stable idempotency keys, exponential backoff, dead-lettering, and replay under the same key.",
        "Built the SAP Service Layer client behind it with connect and read timeouts, ETag concurrency checks, and typed errors marked retryable or permanent.",
        "Built a scheduled Go service for fleet trip sync and sales-order automation, with PostgreSQL run logs, a preview mode, and an HTTP API for job status.",
        "Wrote OpenAPI specs, API conventions, a role-to-endpoint permission matrix, and a production-shaped mock server for app developers.",
        "Operate Python and Go services on Linux with Nginx, systemd, Docker Compose, TLS termination, health checks, PostgreSQL backups, and written rollback steps.",
        "Keep credentials out of source control, with services that refuse to start when a required value is missing. Automated Android releases with GitHub Actions and short-lived Google Cloud credentials.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Integrated OpenAI conversations into the Django backend and built a chat interface that supports several model providers.",
        "Deployed the containerized backend on AWS, with media on S3 and CloudFront and web apps on Vercel.",
      ],
    },
    {
      role: "Full Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: ["Migrated financial data from SAP HANA to PostgreSQL and tuned payment modules for batches of more than 10,000 records."],
    },
    {
      role: "Frontend Developer (Contract)",
      company: "Element Pay",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: ["Built Next.js product and developer pages for a stablecoin payments platform, including the API console."],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: ["Tested APIs and wrote integration guides, references, and code samples in TypeScript and Python for developer-tool, AI, and infrastructure clients."],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya",
      dates: "May 2022 – May 2024",
      bullets: ["Built investor dashboards and integrated financial APIs on a team of 12 engineers, reviewing and approving pull requests."],
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
      title: "Portfolio AI Assistant Backend",
      stack: "Go, Docker, Nginx, PostgreSQL | [Live assistant](https://www.daveclintonn.cc/ask-ai)",
      bullets: [
        "Moved an AI assistant from serverless functions to a single Go binary in a non-root distroless image of about 25 MB, streaming answers over Server-Sent Events.",
        "Added per-visitor, per-IP, and site-wide rate limits, and made production refuse to start without the rate-limit secret. Each request has a deadline, and closing the tab cancels the upstream OpenAI stream.",
        "Wrote a re-runnable Bash deploy script that runs `nginx -t` before reload and fails with logs if `/healthz` does not pass.",
      ],
    },
    {
      title: "HANA Enterprise Intelligence",
      stack: "Django, Next.js, SAP HANA, OpenAI",
      text: "Sole author of a multi-tenant natural-language analytics system with workspace permissions, encrypted credentials, SQL validation, and a read-only gateway with retries and typed failures.",
    },
    {
      title: "Aqua Prana",
      stack: "Django REST Framework, Rust, Next.js, Expo",
      text: "Moved a platform's API from Next.js routes to Django REST while keeping the same URLs, request bodies, and responses, so the mobile app, admin console, and website needed no changes. Built a separate Rust/Axum API foundation with OAuth2, JWT, Argon2, and request limits.",
    },
  ],

  writing: [
    "[Moving my portfolio's backend to Go on a VPS](https://www.daveclintonn.cc/blog/moving-my-portfolio-backend-to-go) (2026): step-by-step tutorial covering streaming, rate limits, and deployment for a Go AI backend.",
    "[What does an AI engineer actually build?](https://www.daveclintonn.cc/blog/what-does-an-ai-engineer-actually-build) (2026): the decisions behind an AI application, using a library assistant as the example.",
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
};
