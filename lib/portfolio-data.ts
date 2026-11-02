import type { IntentName as AskAiIntent } from "@/lib/knowledge/intent"

export type BrandIconName = "github" | "x" | "linkedin"

export const site = {
  name: "David Clinton",
  legalName: "David Clinton Hellen",
  alternateNames: ["David Clinton Hellen", "Dave Clinton", "daveclintonn"],
  jobTitle: "Software Engineer",
  title: "David Clinton | Software Engineer in Kenya",
  description:
    "David Clinton is a software engineer and writer in Kenya. He builds software and writes about what happens after it ships.",
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
  company: {
    name: "Opesi Mansion",
    href: "https://www.opesimansion.com/",
  },
  firstProduct: {
    name: "9ntyplus",
    href: "https://9ntyplus.com/",
  },
  paperspaceWriting: "https://blog.paperspace.com/author/david-clinton/",
  studio1hq: "https://www.studio1hq.com/",
  gameOfThrones: "https://press.wbd.com/us/property/game-thrones-s1",
} as const

export const workLinks = {
  mika: "https://mikaappliances.com/",
  givesuite: "https://givesuite.com/",
  elementPay: "https://www.elementpay.net/",
  untapped: "https://untapped-global.com/who-we-are",
} as const

export type TimelineEntry = {
  id: string
  company: string
  iconSrc?: string
  location?: string
  arrangement?: string
  start: string
  end?: string
  description: string
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
      "I help warehouse, delivery, and customer service teams spend less time on manual work by automating paperwork and connecting information across the business.",
  },
  {
    id: "2024-09",
    company: "Givesuite · Element Pay · Studio1HQ",
    start: "Sep 2024",
    end: "Jun 2025",
    description:
      "I improved online payment experiences for GiveSuite and Element Pay and wrote practical guides for developers through Studio1HQ.",
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
