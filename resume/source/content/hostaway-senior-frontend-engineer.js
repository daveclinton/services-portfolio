// Resume for Hostaway, Senior Frontend Engineer (100% Remote, EMEA).
module.exports = {
  output: "Hostaway_Senior_Frontend_Engineer.pdf",
  name: "David Clinton Hellen",
  headline: "Frontend Engineer | React, TypeScript, JavaScript, and Design Systems",
  contact: [
    ["Mombasa, Kenya (EMEA, UTC+3, remote)", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  order: ["summary", "skills", "experience", "projects", "writing", "education"],

  summary:
    "Frontend engineer with five years of software engineering experience, including more than four years building production applications in React, TypeScript, JavaScript, CSS, and HTML. Builds reusable UI components, data-heavy dashboards, and multi-tenant SaaS interfaces integrated with REST APIs and streaming endpoints. Experienced in frontend performance, automated testing, code review, and Claude Code as part of the daily workflow, and supports released software in production, including on-call.",

  skills: [
    ["Frontend", "React, Next.js, TypeScript, JavaScript, HTML, CSS, Tailwind CSS, Vue, and Angular"],
    ["State management", "React Context, TanStack Query, Zustand, Pinia, and URL-synced state with nuqs"],
    ["UI components and design", "Reusable component libraries, shadcn/ui, Radix UI, theming, responsive design, accessibility (ARIA, keyboard support), and Figma"],
    ["API integration", "REST APIs, OpenAPI, streaming responses with Fetch and ReadableStream, polling, and request cancellation with AbortController"],
    ["Performance", "Memory leak prevention, infinite loading, conditional polling, interaction latency benchmarking, and scroll frame measurement"],
    ["Testing", "Jest, Vitest, and Playwright"],
    ["Production and cloud", "AWS, S3, CloudFront, Vercel, Docker, Nginx, Linux, GitHub Actions, health checks, structured logs, and on-call support"],
    ["Tools", "Git, GitHub code reviews, npm, Vite, Babel, and Claude Code"],
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Mika (Ideal Appliances Ltd)",
      place: "Mombasa, Kenya",
      dates: "Oct 2025 – Present",
      bullets: [
        "Build the Next.js, React 19, and TypeScript administration console for warehouse, warranty, last-mile delivery, and automation workflows, with more than 170 components and 21 routes across several group companies.",
        "Develop a shared data-table library with server-driven infinite loading, URL-synced filters, sortable columns with `aria-sort`, saved column layouts, and keyboard shortcuts, reused across product areas.",
        "Implemented per-user brand themes and light and dark modes, on accessible component primitives from Radix UI and shadcn/ui.",
        "Reduced unnecessary network traffic on live delivery screens with TanStack Query polling that runs only while a route is active or a truck is moving, and scoped cached queries to the selected company to keep tenant data separate.",
        "Built route maps and live delivery tracking with MapLibre GL, integrated with REST APIs and SAP-connected backend services.",
        "Built the streaming interface for an in-production AI assistant, reading responses through Fetch and ReadableStream, with cancellation of in-flight requests, rendered results, and user approval of write actions.",
        "Built Vue 3 and TypeScript operations dashboards that refresh every 60 seconds on unattended TV displays, preventing memory leaks by clearing polling timers and disconnecting ResizeObservers when views unmount.",
        "Monitor and support released software on Linux with Nginx, systemd, health checks, structured logs, database backups, and written rollback steps.",
      ],
    },
    {
      role: "Software Engineer (Contract)",
      company: "Tai Ora",
      place: "Remote",
      dates: "Jan 2024 – Sep 2026",
      bullets: [
        "Primary author of the Next.js, React 19, and TypeScript web application and website revamp, using Tailwind CSS, Radix UI, shadcn/ui, TanStack Query, and Zustand, deployed on Vercel.",
        "Built a multi-model AI chat interface, and integrated streaming conversational features with response timeouts and automated service tests.",
        "Contributed to the Angular admin dashboard on AWS, with media delivered through S3 and CloudFront, and supported rollout to 3 schools.",
      ],
    },
    {
      role: "Developer Relations Engineer (Contract)",
      company: "Studio1HQ",
      place: "Remote",
      dates: "May 2024 – Present",
      bullets: [
        "Benchmarked React Native New Architecture and React Compiler on a physical Android device using 3 Release build variants and scripted trials, measuring launch time, interaction latency, and scroll frame percentiles. Median navigation time measured 43.7 ms, 36.0 ms, and 31.1 ms across the variants.",
        "Built sample applications with Next.js App Router, React 19, tRPC, Zod, and TanStack Query, and wrote integration guides for developer tools in cloud infrastructure, AI, and web data.",
      ],
    },
    {
      role: "Frontend Developer (Contract)",
      company: "Element Pay",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Built and maintained Next.js product and developer interfaces for a stablecoin payments platform, including invoicing, collections, off-ramp, API console, and demo flows.",
      ],
    },
    {
      role: "Full Stack Engineer (Contract)",
      company: "GiveSuite",
      place: "Remote",
      dates: "Sep 2024 – Jun 2025",
      bullets: [
        "Worked on the migration of a legacy system to a new full-stack web experience for donor-facing products, and tuned payment modules for batches of more than 10,000 records.",
      ],
    },
    {
      role: "Frontend Engineer",
      company: "Untapped Global",
      place: "Nairobi, Kenya",
      dates: "May 2022 – May 2024",
      bullets: [
        "Built investor dashboards and the public website in React and Next.js on a team of 12 engineers, reviewing and approving pull requests.",
        "Converted Figma designs into production interfaces, and worked with backend teams on API contracts and data delivery.",
        "Built and published 3 reusable React and TypeScript chart libraries for Apache Superset to [npm](https://www.npmjs.com/~daveclinton), with Jest in the build pipeline.",
        "Integrated third-party financial APIs with error handling and data processing for investor and operations dashboards.",
      ],
    },
  ],

  projectsTitle: "Selected Projects",
  projects: [
    {
      title: "Aqua Prana",
      stack: "Next.js, React, TypeScript, Tailwind CSS, TanStack Query, Expo",
      bullets: [
        "Built the public platform and administration console with shadcn/ui and Radix UI, data tables, and streaming AI chat, alongside an Expo mobile app with a multilingual interface.",
      ],
    },
    {
      title: "Portfolio and AI Assistant",
      stack: "Next.js, React 19, TypeScript, Tailwind CSS | [Live site](https://www.daveclintonn.cc/ask-ai)",
      bullets: [
        "Built a streaming chat interface that cancels in-flight requests on unmount and respects reduced-motion preferences, backed by a containerized Go service.",
      ],
    },
  ],

  writingTitle: "Writing",
  writing: [
    "[Claude can build the app. Then what?](https://www.daveclintonn.cc/blog/when-ai-can-build-the-app) (2026): an article on what remains for engineers after AI coding tools produce a working demo.",
  ],

  education: [
    "Bachelor of Education (Science), Kenyatta University, Kenya, 2015 – 2019",
    "Introduction to Programming Using Python, Udacity, 2020",
  ],
};
