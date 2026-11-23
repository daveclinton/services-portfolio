import type { IntentName as AskAiIntent } from "@/lib/ai-client"

export type BrandIconName = "github" | "x" | "linkedin"

export const site = {
  name: "David Clinton",
  legalName: "David Clinton Hellen",
  alternateNames: ["David Clinton Hellen", "Dave Clinton", "daveclintonn"],
  jobTitle: "Software Engineer",
  title: "David Clinton | Software Engineer in Kenya",
  description:
    "David Clinton is a software engineer in Kenya. He turns AI ideas into software companies can rely on, connected to the systems and data they already use.",
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
  headline: "I turn AI ideas into software people can rely on.",
} as const

/** Typical ranges in USD, reviewed 2026-11-23. Keep in sync with the contracting-rate-2026 evidence record. */
export const services = [
  { title: "AI systems and automation", price: "$50–75 an hour" },
  { title: "Full-stack web and mobile", price: "$45–55 an hour" },
  { title: "AI assistant testing", price: "from $500" },
  { title: "Technical articles", price: "$300–600 each" },
] as const

export type TimelineEntry = {
  id: string
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
    company: "Mika (Ideal Appliances)",
    iconSrc: "/mika.webp",
    location: "Kenya",
    start: "Oct 2025",
    description:
      "I build and support the systems that warehouses, shops, delivery teams and repair teams use every day at a group of home appliance companies in Kenya and Rwanda.",
    highlights: [
      "Built SapForge, the main back-end system and staff web application, with about 1,600 automated back-end tests.",
      "Built and run an AI assistant that shows each person only the data they are allowed to see and asks before changing anything.",
      "Support systems connected to an SAP environment that records about 480,000 business documents a year across five group companies.",
      "Automated order entry between group companies, replacing typing that staff estimate took 20 minutes per order.",
      "Built last-mile delivery, after-sales, showroom, consignment and messaging modules, and a Kotlin warehouse app on Google Play.",
      "Reviewed a year of repair and warranty records, about 30,000 cases, and reported the problems to the finance team with evidence for each.",
      "Took over the shop and repair systems from a previous developer and wrote a handbook so others can run and support them.",
    ],
  },
  {
    id: "2024-05",
    company: "Studio1HQ",
    iconSrc: "/studio1hq.webp",
    arrangement: "Remote, contract",
    start: "May 2024",
    description:
      "I research, build and write practical guides and sample applications for developers.",
  },
  {
    id: "2024-01",
    company: "Tai Ora",
    arrangement: "Remote, contract",
    start: "Jan 2024",
    end: "Sep 2026",
    description:
      "I added AI chat with a choice of providers, worked on the web and mobile apps, and deployed the back end on AWS.",
  },
  {
    id: "2024-09",
    company: "GiveSuite · Element Pay",
    arrangement: "Remote, contract",
    start: "Sep 2024",
    end: "Jun 2025",
    description:
      "I improved online payment experiences, moved financial data from SAP HANA to PostgreSQL at GiveSuite, and built the web screens for a stablecoin payments platform at Element Pay.",
  },
  {
    id: "2022-05",
    company: "Untapped Global",
    iconSrc: "/untapped.webp",
    location: "Nairobi, Kenya",
    arrangement: "Hybrid",
    start: "May 2022",
    end: "May 2024",
    description:
      "I turned complex investment data into clear charts so investors and internal teams could understand and explore it.",
  },
  {
    id: "2021-01",
    company: "Paperspace (now DigitalOcean)",
    iconSrc: "/paperspace.webp",
    arrangement: "Remote",
    start: "Jan 2021",
    end: "Feb 2022",
    description:
      "I wrote practical articles that helped developers understand machine learning and make better use of cloud computing.",
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
  description: "Ask an AI about my background, work, and experience",
  href: "/ask-ai",
  title: `What do you want to know`,
  placeholder: "Ask about my work…",
  inputLabel: "Ask about my work",
  // Starter questions shown on the empty chat screen.
  suggestions: [
    "What AI systems has he built?",
    "Is he available for contract work?",
  ],
  workflows: {
    role_fit: { label: "Compare a job description", title: "How does this role match?", placeholder: "Paste the role and its requirements…" },
    interview: { label: "Prepare an interview brief", title: "What should the interview cover?", placeholder: "Paste a job description or describe the role…" },
  },
} as const

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
