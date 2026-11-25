import type { ChatWorkflow, IntentName as AskAiIntent } from "@/lib/ai-client"

export type BrandIconName = "github" | "x" | "linkedin"

export const site = {
  name: "David Clinton",
  legalName: "David Clinton Hellen",
  alternateNames: ["David Clinton Hellen", "Dave Clinton", "daveclintonn"],
  jobTitle: "Software Engineer",
  title: "David Clinton | Software Engineer in Kenya",
  description:
    "David Clinton is a software engineer in Nairobi, Kenya. He solves everyday business problems and designs systems that run and scale.",
  url: "https://www.daveclintonn.cc",
  location: { country: "Kenya", countryCode: "KE" },
} as const

export const profile = {
  name: "David Clinton",
  handle: "@daveclintonn",
  role: "Software Engineer 🇰🇪",
  initials: "DC",
  avatarSrc: "/david.webp",
  contactHref: "#links",
  contactLabel: "Contact Me",
} as const

export const introduction = {
  paperspaceWriting: "https://blog.paperspace.com/author/david-clinton/",
  studio1hq: "https://www.studio1hq.com/",
} as const

export const workLinks = {
  mika: "https://mikaappliances.com/",
  givesuite: "https://givesuite.com/",
  elementPay: "https://www.elementpay.net/",
  untapped: "https://untapped-global.com/who-we-are",
} as const

export const intro = {
  headline: "I solve everyday problems with systems that run and scale.",
} as const

export type TimelineEntry = {
  id: string
  slug: string
  company: string
  iconSrc?: string
  location?: string
  arrangement?: string
  start: string
  end?: string
  description: string
  highlights?: string[]
}

export const ongoingRoleLabel = "Present"

export function formatRoleDates({
  start,
  end,
}: Pick<TimelineEntry, "start" | "end">) {
  return `${start} – ${end ?? ongoingRoleLabel}`
}

export const backgroundItems: TimelineEntry[] = [
  {
    id: "2025-10",
    slug: "mika",
    company: "Mika (Ideal Appliances)",
    iconSrc: "/mika.webp",
    location: "Kenya",
    start: "Oct 2025",
    description:
      "I build and support the systems that Mika’s employees use to serve thousands of customers across Kenya, Uganda and Rwanda.",
    highlights: [
      "Automated the copying of orders between companies, which staff said took about 20 minutes for each order.",
      "Built an AI assistant that answers staff questions and asks for approval before it changes anything.",
      "Reviewed about 30,000 repair cases and gave the finance team evidence of the problems found.",
      "Built systems that help teams follow sales, deliveries and repairs from start to finish.",
      "Support systems connected to business records that grow by about 480,000 documents a year across five companies.",
      "Took over two systems from a previous developer and kept them running for the people who depend on them.",
      "Wrote a handbook so that other people can run and support the company’s systems.",
    ],
  },
  {
    id: "2024-05",
    slug: "studio1hq",
    company: "Studio1HQ",
    iconSrc: "/studio1hq.webp",
    arrangement: "Remote, contract",
    start: "May 2024",
    description:
      "I research, build and write practical guides and sample applications for developers.",
  },
  {
    id: "2024-01",
    slug: "tai-ora",
    company: "Tai Ora",
    arrangement: "Remote, contract",
    start: "Jan 2024",
    end: "Sep 2026",
    description:
      "I added AI chat with a choice of providers, worked on the web and mobile apps, and deployed the back end on AWS.",
  },
  {
    id: "2024-09",
    slug: "givesuite",
    company: "GiveSuite · Element Pay",
    arrangement: "Remote, contract",
    start: "Sep 2024",
    end: "Jun 2025",
    description:
      "I improved online payment experiences, moved financial data from SAP HANA to PostgreSQL at GiveSuite, and built the web screens for a stablecoin payments platform at Element Pay.",
  },
  {
    id: "2022-05",
    slug: "untapped-global",
    company: "Untapped Global",
    iconSrc: "/untapped.webp",
    location: "Nairobi, Kenya",
    arrangement: "Hybrid",
    start: "May 2022",
    end: "May 2024",
    description:
      "I worked on the investment platform that processed investors’ transactions, and on the internal platform the team used to run the business.",
    highlights: [
      "Built a guided tour for new investors, which the platform did not have.",
      "Built the dashboard where investors could see their portfolio in charts.",
      "Built the KYC screens that replaced manual checks, with third-party tools that help prevent money laundering and detect fraud.",
      "Connected Plaid, which investors used to fund their investments.",
      "Worked on the internal management platform that the teams used in their daily work.",
      "Connected financial information from other services and helped bring in new data as it arrived.",
      "Reviewed code in a team of 12 engineers and worked between design and back-end teams.",
    ],
  },
  {
    id: "2021-01",
    slug: "paperspace",
    company: "Paperspace (now DigitalOcean)",
    iconSrc: "/paperspace.webp",
    arrangement: "Remote",
    start: "Jan 2021",
    end: "Feb 2022",
    description:
      "This was my first job in tech. I worked in AI before ChatGPT made it mainstream.",
    highlights: [
      "Ran experiments on powerful computers and explained how developers could get more from them.",
      "Wrote six articles about teaching computers to recognize images, training AI models and measuring performance.",
    ],
  },
]

export type SocialLink = {
  label: string
  href: string
  icon: BrandIconName
}

export const socialLinks: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/daveclinton", icon: "github" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/clintondavid46/", icon: "linkedin" },
  { label: "Twitter / X", href: "https://x.com/daveclintonn", icon: "x" },
]

export const otherProfiles: string[] = [
  "https://substack.com/@daveclintonn",
  "https://www.instagram.com/daveclintonn/",
  "https://www.threads.net/@daveclintonn",
  "https://blog.paperspace.com/author/david-clinton/",
]

// The visible link text on the site is "email me", so there is no separate
// display label that can drift out of sync with the real address.
export const email = {
  href: "mailto:maze-golds-8l@icloud.com",
} as const

export const askAi = {
  label: "Ask AI about me",
  description: "Explore my work, compare a role, or scope a project with an evidence-grounded AI assistant",
  href: "/ask-ai",
  title: `What do you want to know`,
  placeholder: "Ask about my work…",
  inputLabel: "Ask about my work",
  followUpLabel: "Ask a follow-up",
  followUpPlaceholder: "Ask a follow-up…",
  workflows: {
    project_scope: { label: "Scope a project", title: "What would you like to build?", placeholder: "Ask a follow-up or refine the proposed project…" },
    role_fit: { label: "Compare a job description", title: "How does this role match?", placeholder: "Paste the role and its requirements…" },
    interview: { label: "Prepare an interview brief", title: "What should the interview cover?", placeholder: "Paste a job description or describe the role…" },
  },
} as const

export const newsletter = {
  href: "/subscribe",
  title: "Follow along",
  description: "Subscribe to my weekly newsletter for instant updates.",
  consent: "By subscribing, you agree to occasional emails from David. Free to read. Unsubscribe anytime.",
} as const

export const aiTaskGroups = [
  {
    id: "explore", label: "Explore my work", description: "Follow a project from the problem to the result.", placeholder: "Ask about a project, outcome, or architecture…",
    tasks: [
      { label: "AI systems", description: "Explore the assistants and automation I have built.", prompt: "Show the AI systems David has built, his contribution, and the problems they solve.", workflow: "chat" },
      { label: "Business outcomes", description: "See what changed for the people using the systems.", prompt: "Show three projects where David's work improved how a business operates, with supporting evidence.", workflow: "chat" },
      { label: "Architecture", description: "Explore documented connections and technical decisions.", prompt: "Show the documented architecture of David's portfolio assistant as an interactive system diagram. Explain its connections and trade-offs.", workflow: "chat" },
      { label: "Career timeline", description: "Explore roles, dates, and related contributions.", prompt: "Show a timeline of David's documented roles and contributions, using only dates supported by the evidence.", workflow: "chat" },
    ],
  },
  {
    id: "hiring", label: "Hiring", description: "Compare the role with demonstrated work and identify what to discuss.", placeholder: "Ask about experience or choose a hiring task…",
    tasks: [
      { label: "Compare a role", description: "Review evidence, related experience, and unverified requirements.", prompt: "", workflow: "role_fit" },
      { label: "Prepare an interview", description: "Build questions around verified projects and the role's needs.", prompt: "", workflow: "interview" },
      { label: "Relevant experience", description: "Start with capabilities supported by published work.", prompt: "Which of David's projects demonstrate backend, integration, and AI engineering experience? Show supporting evidence and what an interviewer should validate.", workflow: "chat" },
    ],
  },
  {
    id: "planning", label: "Plan a project", description: "Turn an idea into a proposed first release to discuss with David.", placeholder: "Describe an idea or choose a planning task…",
    tasks: [
      { label: "Scope an idea", description: "Answer six questions and review a proposed first release.", prompt: "", workflow: "project_scope" },
      { label: "Improve a process", description: "Describe the manual work and what a useful change would achieve.", prompt: "We want to improve an existing manual process: ", workflow: "project_scope" },
      { label: "Connect systems", description: "Identify integration needs, access boundaries, and open questions.", prompt: "We want to connect our existing systems: ", workflow: "project_scope" },
    ],
  },
] as const satisfies readonly { id: string; label: string; description: string; placeholder: string; tasks: readonly { label: string; description: string; prompt: string; workflow: ChatWorkflow }[] }[]

export const askAiStatus: Record<AskAiIntent, string> = {
  general: "Thinking…",
  biography: "Reading the profile…",
  rates: "Checking the rates…",
  experience: "Reviewing roles and companies…",
  projects: "Gathering projects…",
  skills: "Reviewing skills…",
  technologies: "Listing technologies…",
  outcomes: "Pulling together outcomes…",
}
