// Resume for Supabase, AI Platform Engineer (Remote, Global).
module.exports = {
  output: "Supabase_AI_Platform_Engineer.pdf",
  name: "David Clinton Hellen",
  headline: "Software Engineer | AI Agents, Evaluation, and Production Backends",
  contact: [
    ["Mombasa, Kenya (UTC+3, remote)", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "skills", "experience", "projects", "writing", "education"],

  summary:
    "Software engineer with five years of experience building production systems, including an AI agent in production that works over live ERP data under permission checks and human approval. Builds least-privilege tool access, grounding checks, automated agent tests, and durable backend workflows in Python and Go. Has built an MCP server and carried on-call for production services, deploys and operates own services on Linux, and publishes technical writing on AI engineering.",

  skills: [
    ["AI systems", "MCP servers, OpenAI and Gemini tool calling, multi-provider chat interfaces, streaming, human approval of agent actions, grounding checks, natural-language queries over SAP HANA, retrieval, evaluation tests"],
    ["Governance and security", "Read-only tools, role-based access control, tenant isolation, approved-view catalogs, SQL validation, field-level encryption, secrets kept out of source control"],
    ["Durable workflows", "Transactional outbox, idempotency keys, retries with exponential backoff, dead-letter and replay, reconciliation, preview modes, run logs"],
    ["Languages", "Python, Go, TypeScript, SQL, and Bash"],
    ["Frameworks and data", "Django, Django REST Framework, FastAPI, Next.js, PostgreSQL, pgvector, Redis, and SAP HANA"],
    ["Operations", "On-call, Linux, Nginx, systemd, Docker Compose, GitHub Actions, Google Cloud Workload Identity Federation, AWS, health checks, structured logs, backups, and rollback runbooks"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Built and run a production AI agent inside SapForge that answers staff questions by calling read-only lookup tools as the signed-in user, so it can only see what that user is permitted to see.",
        "Designed its write path as a review gate: writes are saved as proposed actions and run through the existing API endpoint, with its permission checks, only after the user approves them.",
        "Added a grounding check that sends the model back to the data when it quotes figures it did not look up, with automated tests for agent actions and grounding.",
        "Built a transactional outbox for SAP delivery events: each event is written in the same transaction as the business change under a stable idempotency key, retried with exponential backoff, dead-lettered after the last attempt, and replayable under the same key.",
        "Built a scheduled Go service for fleet trip sync and intercompany sales-order automation, with every run logged to PostgreSQL, a preview mode that shows changes before writing, and an HTTP API for job status.",
        "Built SapForge, the Django REST backend connecting warehouse, eWarranty, and delivery workflows to SAP Business One and SAP HANA for several group companies.",
        "Run these services on Linux with Nginx, systemd, and Docker Compose, including health checks, database backups, and written rollback steps.",
        "Automated Android releases with GitHub Actions, using Google Cloud Workload Identity Federation for short-lived credentials in place of stored service-account keys.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Integrated OpenAI conversations into the Django backend and built a chat interface that supports several model providers.",
        "Deployed the containerized backend on AWS and supported the rollout to 3 schools.",
      ],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Tested APIs and wrote integration guides and code samples for developer-tool, AI, and infrastructure clients, using AI agents with human review to research and verify examples.",
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
      bullets: ["Built Next.js product and developer pages for a stablecoin payments platform."],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya",
      dates: "May 2022 – May 2024",
      bullets: ["Built investor dashboards and published 3 Apache Superset chart plugins to npm."],
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
      title: "HANA Enterprise Intelligence",
      stack: "Django, Next.js, SAP HANA, OpenAI",
      bullets: [
        "Sole author of a multi-tenant system that converts business questions into SAP HANA SQL, validates each statement, and executes it read-only through a gateway with retries and typed failures.",
        "Limited what the model can reach through company and workspace permissions, approved-view catalogs, and credentials encrypted per company.",
      ],
    },
    {
      title: "Portfolio AI Assistant",
      stack: "Go, Docker, Nginx, PostgreSQL | [Live assistant](https://www.daveclintonn.cc/ask-ai)",
      bullets: [
        "Runs a grounded, streaming assistant as a single Go binary with per-visitor, per-IP, and site-wide rate limits, and refuses to start in production without its rate-limit secret.",
        "Ran a 15-question evaluation that found 5 incorrect refusals, and measured host memory before rejecting a self-hosted embedding model that would have put neighboring services at risk.",
      ],
    },
  ],

  writing: [
    "[What does an AI engineer actually build?](https://www.daveclintonn.cc/blog/what-does-an-ai-engineer-actually-build) (2026): the decisions behind an AI application, using a library assistant as the example.",
    "[Moving my portfolio's backend to Go on a VPS](https://www.daveclintonn.cc/blog/moving-my-portfolio-backend-to-go) (2026): step-by-step tutorial moving an AI assistant into one Go binary, running in Docker behind Nginx.",
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
};
