// Resume for DigitalOcean, Technical Content Writer (JR: 2026-8196).
module.exports = {
  output: "DigitalOcean_Technical_Content_Writer.pdf",
  name: "David Clinton Hellen",
  headline: "Technical Content Writer | Cloud Infrastructure, AI and Developer Content",
  contact: [
    ["Mombasa, Kenya (open to relocation)", "+254 701 176 923", "clintondavid46@gmail.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "writing", "experience", "moreExperience", "skills", "education", "referees"],

  summary:
    "Technical writer and software engineer who has published developer content since 2021, including bylined GPU and deep learning articles for Paperspace (now part of DigitalOcean) and documentation for AI cloud, media and infrastructure products at Studio1HQ. Researches topics through hands-on testing, runnable code and benchmarks, and writes for developers and technical decision-makers. Deploys and runs production applications on Linux servers and AWS, and has built AI agents with tool calling and human approval, which supports accurate writing on hosting and AI.",

  writingTitle: "Selected Writing",
  writing: [
    "[How to maximize GPU utilization by finding the right batch size](https://www.digitalocean.com/community/tutorials/find-optimal-batch-size) (DigitalOcean, originally Paperspace): profiling, GPU memory limits and multi-GPU tradeoffs.",
    "[Benchmarking GPUs for Mixed Precision Training with Deep Learning](https://blog.paperspace.com/mixed-precision-training-benchmark/) (Paperspace): FP16 and FP32 performance on NVIDIA A100 and V100-class GPUs.",
    "[Computing GPU memory bandwidth with Deep Learning Benchmarks](https://blog.paperspace.com/understanding-memory-bandwidth-benchmarks/) (Paperspace): GDDR memory and theoretical versus measured bandwidth.",
    "[Understanding AI Models](https://www.daveclintonn.cc/blog/understanding-ai-models) (2026): what an AI model is, how it learns and what happens when it runs.",
    "[What does an AI engineer actually build?](https://www.daveclintonn.cc/blog/what-does-an-ai-engineer-actually-build) (2026): the decisions behind an AI application, using a library assistant as the example.",
    "[Who will run all these tiny apps?](https://www.daveclintonn.cc/blog/who-will-run-all-these-tiny-apps) (2026): who makes AI-built tools easy to share and keep running.",
    "Published 11 articles on [my blog](https://www.daveclintonn.cc/blog) in 2026, on AI, engineering and building products.",
  ],

  experienceTitle: "Technical Writing and Developer Relations",
  experience: [
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Wrote tutorials, how-to guides, conceptual documentation, API references and integration guides for developer-tool, AI and infrastructure clients of Studio1HQ, including Ittybit and Nitric/Suga.",
        "Documented AI cloud products covering agents, training, inference, managed inference and serverless AI.",
        "Documented private container registry workflows across Docker Hub, GHCR, GCR, ECR, ACR and Harbor, including credentials, image pulls and security practices.",
        "Wrote a measured tutorial on React Native performance, running repeated trials on a physical phone across 3 release builds and reporting results and limits from the raw data.",
        "Tested APIs hands-on with OpenAPI/Swagger and Postman, and wrote code samples in TypeScript and Python.",
        "Published through GitBook, Docusaurus, Notion and Git-based review while managing parallel client work.",
      ],
    },
    {
      role: "Technical Author (Contract)",
      company: "Paperspace (now part of DigitalOcean)",
      place: "Remote",
      dates: "Jan 2021 – May 2023",
      bullets: [
        "Researched, wrote and published 6 bylined articles for developers on PyTorch, computer vision, GPU utilization, training performance and GPU rendering.",
        "Ran and documented GPU experiments on batch-size tuning, profiling, memory constraints and mixed-precision training, with runnable Python code in Jupyter notebooks.",
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
        "Deploy and run Python and Go services on on-premise Linux servers with Nginx, systemd and Docker Compose, including health checks, backups and rollback steps.",
        "Built an AI agent that answers staff questions through read-only tools as the signed-in user, with human approval for writes and automated tests for its actions.",
        "Wrote OpenAPI specs, integration conventions and a mock server so app developers can work without SAP access.",
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
    ["Content", "Technical blogs, tutorials, how-to guides, API references, integration guides, benchmark write-ups, code samples, research and editing"],
    ["Technical subjects", "Hosting and deployment, compute, GPUs, AI agents, inference, serverless AI, container registries, APIs"],
    ["Publishing and search", "GitBook, Docusaurus, MDX, Notion, GitHub, sitemaps, RSS feeds, Open Graph metadata"],
    ["Cloud and infrastructure", "Linux, Nginx, Docker, AWS, S3, CloudFront, Vercel, PostgreSQL"],
    ["Languages and AI", "Python, Go, TypeScript, Bash, SQL, PyTorch, OpenAI API, tool calling"],
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
  referees: "Available on request.",
};
