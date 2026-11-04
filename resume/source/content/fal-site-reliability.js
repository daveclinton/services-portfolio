// Resume for fal, Software Engineer, Site Reliability.
module.exports = {
  output: "Fal_Software_Engineer_Site_Reliability.pdf",
  name: "David Clinton Hellen",
  headline: "Software Engineer | Production Infrastructure, Reliability and Automation",
  contact: [
    ["Mombasa, Kenya (open to remote)", "+254 701 176 923", "clintondavid46@gmail.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "skills", "experience", "projects", "writing", "education", "referees"],

  summary:
    "Software engineer with five years of experience building production systems, including more than a year building and operating services on on-premise Linux infrastructure for warehouse, fleet and warranty operations. Experienced in Linux networking, DNS and TLS, containerized deployments, CI/CD and fault-tolerant event delivery. Proficient in Python, Go and Bash for tooling and automation, with hands-on experience building AI tools over production data and published work on GPU benchmarking.",

  skills: [
    ["Languages and automation", "Python, Go, Bash, TypeScript, SQL"],
    ["Linux and networking", "systemd, Nginx, UFW, internal DNS, LAN and DMZ routing, TLS termination, TCP/IP, SSH"],
    ["Infrastructure", "On-premise Linux servers, Docker, Docker Compose, AWS, load-balanced API environments, S3, CloudFront"],
    ["CI/CD", "GitHub Actions, self-hosted runners, Workload Identity Federation, release automation, rollback-ready image tags"],
    ["Reliability", "Health checks, backups, rollback runbooks, transactional outbox, idempotency, retries with backoff, dead-letter and replay, reconciliation"],
    ["Logging and monitoring", "Structured JSON logs, journald, health checks, Sentry"],
    ["Data", "PostgreSQL, pgvector, Redis, SAP HANA, MSSQL"],
    ["AI and GPU", "OpenAI API, tool calling, retrieval evaluation, PyTorch, GPU benchmarking"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Manage the on-premise infrastructure behind the company's warehouse, fleet, warranty and after-sales systems, running Python and Go services with Nginx, systemd, Gunicorn, Uvicorn and Docker Compose.",
        "Configure internal DNS and host routing, LAN and DMZ entry points, TLS termination, UFW firewall rules and TCP and SSH connectivity. Diagnose connectivity issues across SAP, databases, telematics and hardware.",
        "Run releases with versioned release directories, symlink activation, health checks, PostgreSQL backups and written rollback steps.",
        "Built a transactional outbox for SAP delivery events with stable idempotency keys, exponential backoff, dead-lettering and replay. Added connect and read timeouts, ETag concurrency checks and typed retryable errors to the SAP client.",
        "Built a scheduled Go service that syncs Wialon fleet trips to SAP HANA, with PostgreSQL run logs, a preview mode and an HTTP API for job status. Added deduplication, watermarks and transactional writes to the sync and reconciliation pipeline.",
        "Built CI/CD for Android releases with GitHub Actions: signed builds, serialized runs, guards against accidental publishing, and Workload Identity Federation for short-lived Google Cloud credentials.",
        "Keep credentials out of source control and separate from configuration, with services that refuse to start when a required value is missing and a known rotation procedure.",
        "Built an AI assistant that answers staff questions through read-only tools as the signed-in user, with human approval for writes and automated tests for its actions and grounding checks.",
        "Replaced manual SAP entry in the warehouse with backend services and a [Kotlin scanner app on Google Play](https://play.google.com/store/apps/details?id=com.dawda.mikawms). Shipped a warranty app used by 6 outlets in Rwanda.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Deployed the containerized Django backend and admin dashboard on AWS, with S3 and CloudFront for media, and supported rollout to 3 schools. Shipped the Flutter app to the App Store and Google Play.",
      ],
    },
    {
      role: "Full Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Migrated financial data from SAP HANA to PostgreSQL and tuned payment modules for batches of more than 10,000 records.",
      ],
    },
    {
      role: "Frontend Developer (Contract)",
      company: "Element Pay",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: ["Built Next.js product and developer pages for a stablecoin payments platform."],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Tested APIs and wrote integration guides and code samples for developer products, using AI agents with human review to research and verify examples.",
      ],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya",
      dates: "May 2022 – May 2024",
      bullets: [
        "Built investor dashboards and integrated financial APIs on a team of 12 engineers, reviewing and approving PRs. Published 3 Apache Superset chart plugins to npm.",
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
        "Migrated an AI assistant from serverless functions to a single Go binary in a non-root distroless image of about 25 MB, running behind Nginx on a VPS.",
        "Wrote a re-runnable Bash deploy script for a shared server that selects free ports, runs `nginx -t` before reload, and fails with logs if `/healthz` does not pass.",
        "Measured memory on a 3.8 GB host with 192 MB free before adopting a self-hosted embedding model that needed about 525 MB, then disabled the model to protect neighboring services.",
        "Added startup config validation, graceful shutdown and a 15-question evaluation that found 5 incorrect refusals.",
      ],
    },
    {
      title: "HANA Enterprise Intelligence",
      stack: "Django, Next.js, SAP HANA, OpenAI | [Source](https://github.com/daveclinton/Hana-Enterprise-Intelligence)",
      bullets: [
        "Sole author of a system that converts business questions into SAP HANA SQL, validates each statement, and executes it read-only through a gateway with retries and typed failures.",
        "Implemented tenant and workspace permissions, encrypted credentials and approved-view catalogs to limit what the model can access.",
      ],
    },
  ],

  writing: [
    "[What's for Dinner?](https://www.daveclintonn.cc/blog/whats-for-dinner) (2026): a line-by-line review of a Platform Engineer job posting against my production experience.",
    "[How to maximize GPU utilization by finding the right batch size](https://www.digitalocean.com/community/tutorials/find-optimal-batch-size) (Paperspace)",
    "[Benchmarking GPUs for Mixed Precision Training with Deep Learning](https://blog.paperspace.com/mixed-precision-training-benchmark/) (Paperspace)",
    "[Computing GPU memory bandwidth with Deep Learning Benchmarks](https://blog.paperspace.com/understanding-memory-bandwidth-benchmarks/) (Paperspace)",
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
    "Jira Fundamentals Badge, Atlassian, 2022",
  ],
  referees: "Available on request.",
};
