// Resume for Draft.dev: cold email to Mushfiq (CEO) about writing for its DevTools clients.
module.exports = {
  output: "DraftDev_Technical_Writer.pdf",
  name: "David Clinton Hellen",
  headline: "Technical Writer and Software Engineer | Developer Tools, Cloud Infrastructure, and AI",
  contact: [
    ["Mombasa, Kenya (open to relocation)", "+254 701 176 923", "clintondavid46@gmail.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "writing", "experience", "moreExperience", "skills", "education"],

  summary:
    "Technical writer and software engineer who has published developer content since 2021, including 6 bylined GPU and deep learning articles for Paperspace (now part of DigitalOcean). Currently writes for developer-tool, AI, and infrastructure clients at Studio1HQ. Researches topics by building companion apps, writing runnable code, and measuring results. Also runs production Python and Go services on Linux, ships web and mobile applications, and builds AI agents with tool calling.",

  writingTitle: "Selected Writing",
  writing: [
    "[Moving my portfolio's backend to Go on a VPS](https://www.daveclintonn.cc/blog/moving-my-portfolio-backend-to-go) (2026): step-by-step tutorial moving an AI assistant out of Next.js route handlers into one Go binary, running in Docker behind Nginx.",
    "[How to maximize GPU utilization by finding the right batch size](https://www.digitalocean.com/community/tutorials/find-optimal-batch-size) (Paperspace, now on DigitalOcean): profiling, GPU memory limits, and multi-GPU tradeoffs.",
    "[Benchmarking GPUs for Mixed Precision Training with Deep Learning](https://blog.paperspace.com/mixed-precision-training-benchmark/) (Paperspace): FP16 and FP32 performance on NVIDIA A100 and V100-class GPUs.",
    "[Computing GPU memory bandwidth with Deep Learning Benchmarks](https://blog.paperspace.com/understanding-memory-bandwidth-benchmarks/) (Paperspace): GDDR memory and theoretical versus measured bandwidth.",
    "[What does an AI engineer actually build?](https://www.daveclintonn.cc/blog/what-does-an-ai-engineer-actually-build) (2026): the decisions behind an AI application, using a library assistant as the example.",
    "[Understanding AI Models](https://www.daveclintonn.cc/blog/understanding-ai-models) (2026): what an AI model is, how it learns, and what happens when it runs.",
    "Published 13 articles on a [personal blog](https://www.daveclintonn.cc/blog) in 2026, mostly about AI, engineering, and building products.",
  ],

  experienceTitle: "Technical Writing and Developer Relations",
  experience: [
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Own technical articles end to end for clients: research, companion app development, testing and measurement, drafting, diagrams, and review against editorial and SEO guidelines.",
        "Write React Native content on performance measurement, debugging crashes after Expo OTA updates, and tracing chat SDK behavior in production.",
        "Built 3 Android release variants of one app and ran repeated launch, navigation, and scroll trials on a physical phone, using mobile performance monitoring and adb scripts. Reported results and limitations from the raw data for a tutorial on React Native's New Architecture and the React Compiler.",
        "Wrote tutorials, how-to guides, conceptual documentation, API references, and integration guides for developer-tool, AI, and infrastructure clients.",
        "Documented AI cloud products covering agents, training, inference, managed inference, and serverless AI.",
        "Documented private container registry workflows across Docker Hub, GHCR, GCR, ECR, ACR, and Harbor.",
        "Tested APIs hands-on with OpenAPI/Swagger and Postman, wrote code samples in TypeScript and Python, and published through GitBook, Docusaurus, Notion, and Git-based review.",
      ],
    },
    {
      role: "Technical Author (Contract)",
      company: "Paperspace (now part of DigitalOcean)",
      place: "Remote",
      dates: "Jan 2021 – May 2023",
      bullets: [
        "Researched, wrote, and published 6 bylined articles for developers on PyTorch, computer vision, GPU utilization, training performance, and GPU rendering.",
        "Ran and documented GPU experiments on batch-size tuning, profiling, memory constraints, and mixed-precision training, with runnable Python code in Jupyter notebooks.",
        "Turned benchmark results into practical guidance on hardware and training choices.",
      ],
    },
  ],

  moreExperienceTitle: "Software Engineering",
  moreExperience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Deploy and run Python and Go services on on-premises Linux servers with Nginx, systemd, and Docker Compose, including health checks, backups, and rollback steps.",
        "Built an AI agent that answers staff questions through read-only tools as the signed-in user, with human approval for write actions and automated tests for its actions.",
        "Wrote OpenAPI specs, integration conventions, and a mock server so app developers can work without SAP access.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: ["Deployed the containerized Django backend on AWS, with media on S3 and CloudFront and web apps on Vercel."],
    },
    {
      role: "Full Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: ["Migrated financial data from SAP HANA to PostgreSQL and worked on CRM workflows and deployments."],
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
  ],

  skills: [
    ["Content", "Technical articles, tutorials, how-to guides, API references, integration guides, benchmark write-ups, code samples, companion apps, research, and editing"],
    ["Technical subjects", "React Native performance, mobile observability, GPUs, AI agents, inference, serverless AI, container registries, hosting and deployment, and APIs"],
    ["Publishing and search", "GitBook, Docusaurus, MDX, Notion, GitHub, editorial and SEO guidelines, sitemaps, RSS feeds, and Open Graph metadata"],
    ["Cloud and infrastructure", "Linux, Nginx, Docker, AWS, S3, CloudFront, Vercel, and PostgreSQL"],
    ["Languages, frameworks, and AI", "TypeScript, Python, Go, Kotlin, Bash, SQL, React Native, PyTorch, OpenAI API, and tool calling"],
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
};
