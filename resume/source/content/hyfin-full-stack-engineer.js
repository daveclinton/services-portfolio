// Resume for Hyfin, Full-Stack Engineer (GAIA). Remote, Asia or Africa with US overlap.
module.exports = {
  output: "Hyfin_Full_Stack_Engineer.pdf",
  name: "David Clinton Hellen",
  headline: "Full-Stack Engineer | LLM Agents, Data Pipelines, and Financial Data Products",
  contact: [
    ["Nairobi, Kenya (UTC+3, Remote)", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  splitJobs: true,
  order: ["summary", "skills", "experience", "projects", "writing", "education"],

  summary:
    "Full-stack engineer with 6 years of experience building data and AI tools for finance, investment, and operations teams. At Untapped Global, built the investor dashboards and website for a company that finances motorbikes, solar systems, and other income-generating equipment for small businesses in emerging markets. Currently at Mika, a group of home appliance companies in Kenya and Rwanda, building the systems that warehouses, shops, and repair teams use every day, including an AI assistant in production, automated order processing, and checks on financial and stock records. Experienced in taking software from first version to production, working directly with business teams, and supporting systems after launch, including on-call.",

  skills: [
    ["LLM Systems", "Tool-calling agents (OpenAI and Gemini), MCP servers, hybrid retrieval with PostgreSQL full-text search and pgvector, retrieval and grounding evaluation, natural-language-to-SQL queries, streaming, and human approval of agent actions"],
    ["Data Pipelines and Quality", "Scheduled synchronization jobs, transactional outbox, idempotency keys, retries with exponential backoff, dead-lettering and replay, preview runs, run logs, data audits and reconciliation, financial data migration, and Apache Superset"],
    ["Back End", "Python, Django, Django REST Framework, FastAPI, Go, SQL, PostgreSQL, Redis, and SAP HANA"],
    ["Front End", "React, Next.js, TypeScript, Tailwind CSS, TanStack Query, shadcn/ui, data tables, dashboards, and charting"],
    ["Security and Access Control", "Role-based access control, permission-gated financial data, tenant isolation, read-only data gateways, approved-view catalogs, SQL validation, field-level encryption of credentials, and secret removal from Git history"],
    ["Deployment and Operations", "Linux, Nginx, systemd, Docker, Docker Compose, AWS, Vercel, GitHub Actions, health checks, structured logging, backups, rollback runbooks, incident response, and on-call support"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Built and run an AI assistant in production that answers staff questions using live company data. It shows each person only the data they are allowed to see, and it asks for approval before changing anything.",
        "Added a check that makes the assistant look up any figure it quotes instead of guessing, with automated tests to confirm that it behaves correctly.",
        "Reviewed a year of repair and warranty records (about 30,000 cases) against the stock and accounting entries behind them, and reported 17 problems to the finance team with evidence for each.",
        "Built a page that shows managers 14 live checks on the quality of company records, with money amounts visible only to people who have permission.",
        "Corrected the records from a Rwanda stock count covering 1,213 units, keeping 5 sales made after the count intact and setting aside unclear items for review instead of overwriting history.",
        "Automated order entry between group companies and the recording of vehicle trips, replacing manual typing that staff estimate takes 20 minutes per order. Every run is logged, can be previewed before it saves anything, and sends unusual cases to a person for review.",
        "Built a reliable way to send delivery updates to the finance and stock system, so that failed updates are retried and never recorded twice.",
        "Built the main back-end system and staff web application for warehouse work in Kenya and Rwanda. It records goods received, deliveries, returns, and stock counts in SAP only after items are scanned and checked, and it blocks duplicate entries.",
        "Took over the shop sales and repair systems from a previous developer, moved the sales system's code into version control with passwords removed, and wrote a handbook so that others can run and support them.",
        "Deploy and run these systems on Linux servers, with health checks, database backups, and written steps for undoing a bad release.",
      ],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya",
      dates: "May 2022 – May 2024",
      bullets: [
        "Built the company website and the dashboards investors used to follow the small businesses they had funded, using React and Next.js.",
        "Set up and customized Apache Superset so the investment and operations teams could explore up-to-date data and build their own reports.",
        "Connected the dashboards to outside financial data sources, and worked with back-end engineers on the data shown to high-net-worth clients.",
        "Published 3 reusable chart packages for Apache Superset on [npm](https://www.npmjs.com/~daveclinton), and reviewed code on a team of 12 engineers.",
      ],
    },
    {
      role: "Full-Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Moved financial data from SAP HANA to PostgreSQL, and sped up payment processing for batches of more than 10,000 records.",
      ],
    },
    {
      role: "Frontend Developer (Contract)",
      company: "Element Pay",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Built the web screens for a stablecoin payments platform, including invoicing, collecting payments, cashing out, and a console for developers.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Added AI chat to the platform with a choice of AI providers, and deployed the back end on AWS.",
      ],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Write guides and sample applications that show developers how to use AI, infrastructure, and developer tools.",
      ],
    },
  ],

  projectsTitle: "Selected Projects",
  projects: [
    {
      title: "HANA Enterprise Intelligence",
      stack: "Django, Next.js, SAP HANA, OpenAI",
      bullets: [
        "Sole author of a system that answers business questions in plain English by writing database queries, checking that each query is safe, and returning results and charts. It can only read approved data, and each company's access details are encrypted.",
      ],
    },
    {
      title: "Portfolio AI Assistant",
      stack: "Go, Django, PostgreSQL, pgvector, Docker | [Live assistant](https://www.daveclintonn.cc/ask-ai)",
      bullets: [
        "Built an assistant that answers questions about this portfolio by searching a knowledge base with both keyword and meaning-based search (PostgreSQL and pgvector). Tested it against a fixed set of questions, which showed 5 questions it wrongly refused to answer.",
      ],
    },
  ],

  writing: [
    "[What does an AI engineer actually build?](https://www.daveclintonn.cc/blog/what-does-an-ai-engineer-actually-build) (2026): The decisions behind an AI application, from retrieval to evaluation.",
    "[What happens when a customer becomes a score?](https://www.daveclintonn.cc/blog/when-a-customer-becomes-a-score) (2026): What customer scores measure, what they miss, and whose data they use.",
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
};
