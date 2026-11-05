// Resume for Supabase, Support Engineer (Remote, EMEA).
module.exports = {
  output: "Supabase_Support_Engineer_EMEA.pdf",
  name: "David Clinton Hellen",
  headline: "Software Engineer and Technical Writer | Debugging, SQL, and Developer Documentation",
  contact: [
    ["Mombasa, Kenya (UTC+3, remote)", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "skills", "experience", "projects", "writing", "education"],

  summary:
    "Software engineer and technical writer with five years of experience helping developers and internal teams use complex systems. Diagnoses production issues across APIs, databases, and Linux servers, has carried on-call for production services, works with PostgreSQL and SQL, and writes tutorials, integration guides, and API documentation for developer products. Has built with Supabase authentication, database, and storage, and with React and Next.js.",

  skills: [
    ["Databases and SQL", "PostgreSQL, SQL, pgvector, SAP HANA, MSSQL, Redis, data migration, backups, and reconciliation"],
    ["Linux and troubleshooting", "Linux, command line, Bash, systemd, journald, Nginx, DNS, TLS, TCP and SSH connectivity tests, health checks, structured logs, and Sentry"],
    ["Web and JavaScript", "TypeScript, JavaScript, React, Next.js, Supabase, Vercel, and REST APIs"],
    ["Developer communication", "Tutorials, how-to guides, API references, integration guides, code samples, OpenAPI/Swagger, Postman, and GitHub pull request reviews"],
    ["Other languages and infrastructure", "Python, Go, Docker, Docker Compose, AWS, S3, and CloudFront"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Diagnose connectivity and integration issues across SAP, databases, telematics, and hardware, using TCP and SSH tests, logs, and health checks on Linux servers.",
        "Operate Python and Go services with Nginx, systemd, and Docker Compose, including PostgreSQL backups, versioned releases, and written rollback steps.",
        "Wrote OpenAPI specs, API conventions, a role-to-endpoint permission matrix, and a production-shaped mock server so app developers can work without SAP access.",
        "Connected warehouse, warranty, and delivery workflows to SAP Business One, SAP HANA, MSSQL, PostgreSQL, and Redis for inventory, service, and reporting data.",
        "Built a fleet trip sync and reconciliation pipeline with deduplication, watermarks, transactional writes, and PostgreSQL run logs.",
        "Built a production AI assistant that answers staff questions through read-only tools as the signed-in user, with human approval for write actions.",
      ],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Test developer workflows hands-on with OpenAPI/Swagger and Postman, and turn the findings into tutorials, API references, integration guides, and code samples in TypeScript and Python.",
        "Write React Native content on performance measurement, debugging crashes after Expo OTA updates, and tracing chat SDK behavior in production.",
        "Documented private container registry workflows across Docker Hub, GHCR, GCR, ECR, ACR, and Harbor, including credentials, image pulls, and security practices.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Worked on the Django backend and Flutter app, deployed the containerized backend on AWS, and supported the rollout to 3 schools.",
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
      bullets: ["Built investor dashboards and integrated financial APIs on a team of 12 engineers, reviewing and approving pull requests. Published 3 Apache Superset chart plugins to npm."],
    },
    {
      role: "Technical Author (Contract)",
      company: "Paperspace (now part of DigitalOcean)",
      place: "Remote",
      dates: "Jan 2021 – May 2023",
      bullets: ["Published 6 bylined articles for developers on PyTorch, GPU utilization, training, and benchmarking."],
    },
  ],

  projectsTitle: "Selected Projects",
  projects: [
    {
      title: "SnapList",
      stack: "Next.js, Supabase",
      text: "Built marketplace workflows using Supabase authentication, database, and storage with server-side integration patterns.",
    },
    {
      title: "Portfolio AI Assistant",
      stack: "Go, Docker, Nginx, PostgreSQL | [Live assistant](https://www.daveclintonn.cc/ask-ai)",
      text: "Deployed and operate a Go backend with PostgreSQL and pgvector on a VPS, with a deploy script that fails with logs if the health check does not pass.",
    },
  ],

  writing: [
    "[Moving my portfolio's backend to Go on a VPS](https://www.daveclintonn.cc/blog/moving-my-portfolio-backend-to-go) (2026): step-by-step tutorial on moving an AI assistant into one Go binary, running in Docker behind Nginx.",
    "[How to maximize GPU utilization by finding the right batch size](https://www.digitalocean.com/community/tutorials/find-optimal-batch-size) (Paperspace, now on DigitalOcean): profiling, GPU memory limits, and multi-GPU tradeoffs.",
    "[Understanding AI Models](https://www.daveclintonn.cc/blog/understanding-ai-models) (2026): what an AI model is, how it learns, and what happens when it runs.",
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
};
