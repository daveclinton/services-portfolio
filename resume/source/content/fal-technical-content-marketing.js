// Resume for fal, Technical Content Marketing Manager, Infrastructure.
module.exports = {
  output: "Fal_Technical_Content_Marketing_Manager_Infrastructure.pdf",
  name: "David Clinton Hellen",
  headline: "Technical Writer and Software Engineer | AI Infrastructure, GPUs and Developer Content",
  contact: [
    ["Mombasa, Kenya (open to relocation)", "+254 701 176 923", "clintondavid46@gmail.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "writing", "experience", "moreExperience", "skills", "education", "referees"],

  summary:
    "Technical writer and software engineer with five years of experience, including bylined GPU and deep learning articles for Paperspace (now DigitalOcean) and developer documentation for AI cloud, media and infrastructure products at Studio1HQ. Experienced in explaining GPU performance, training, inference, serverless AI and APIs to developers, working from hands-on testing, runnable code and benchmarks. Also builds and operates production services in Go and Python on Linux, which supports accurate technical writing and direct conversations with engineers.",

  writingTitle: "Selected Writing",
  writing: [
    "[Benchmarking GPUs for Mixed Precision Training with Deep Learning](https://blog.paperspace.com/mixed-precision-training-benchmark/) (Paperspace): FP16 and FP32 performance on NVIDIA A100 and V100-class GPUs.",
    "[How to maximize GPU utilization by finding the right batch size](https://www.digitalocean.com/community/tutorials/find-optimal-batch-size) (Paperspace): profiling, GPU memory limits and multi-GPU tradeoffs.",
    "[Computing GPU memory bandwidth with Deep Learning Benchmarks](https://blog.paperspace.com/understanding-memory-bandwidth-benchmarks/) (Paperspace): GDDR memory and theoretical versus measured bandwidth.",
    "[Brilliance behind the sequences of GPU rendering](https://blog.paperspace.com/gpu-rendering-with-core/) (Paperspace): a comparison of Redshift, Octane and V-Ray on cloud GPUs.",
    "[Understanding AI Models](https://www.daveclintonn.cc/blog/understanding-ai-models) (2026): how a model learns and what happens when it runs, for a general technical audience.",
    "[What's for Dinner?](https://www.daveclintonn.cc/blog/whats-for-dinner) (2026): a line-by-line review of a Platform Engineer job posting against my production experience.",
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
        "Documented AI cloud products covering training, inference, managed inference and serverless AI.",
        "Documented private container registry workflows across Docker Hub, GHCR, GCR, ECR, ACR and Harbor, including credentials, image pulls and security practices.",
        "Tested APIs hands-on with OpenAPI/Swagger and Postman, and wrote code samples in TypeScript and Python.",
        "Published through GitBook, Docusaurus, Notion and Git-based review while managing parallel client work.",
      ],
    },
    {
      role: "Technical Author (Contract)",
      company: "Paperspace (now DigitalOcean)",
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
        "Manage on-premise Linux infrastructure and run Python and Go services for warehouse, fleet and warranty systems.",
        "Built a transactional outbox for SAP delivery events with idempotency keys, retries, dead-lettering and replay, and a scheduled Go service that syncs fleet trips to SAP HANA.",
        "Wrote OpenAPI specs, integration conventions and a mock server so app developers can work without SAP access.",
        "Built an AI assistant that answers staff questions through read-only tools, with human approval for writes.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: ["Deployed the containerized Django backend on AWS and shipped the Flutter app to the App Store and Google Play."],
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
  ],

  skills: [
    ["Content", "Technical blogs, tutorials, guides, API references, integration guides, benchmark write-ups, comparative analysis, code samples"],
    ["Technical subjects", "GPU utilization and memory, training performance, inference, serverless AI, container registries, Linux networking, APIs"],
    ["Publishing", "GitBook, Docusaurus, MDX, Notion, GitHub, sitemaps, RSS feeds, Open Graph metadata"],
    ["Languages and ML", "Python, Go, TypeScript, Bash, SQL, PyTorch, TensorFlow/Keras, CUDA, Jupyter"],
    ["Infrastructure and APIs", "Linux, Docker, Nginx, AWS, PostgreSQL, OpenAPI/Swagger, Postman, OpenAI API"],
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
  referees: "Available on request.",
};
