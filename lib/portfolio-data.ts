/** Shared profile and link content for the portfolio. */

import type { IntentName as AskAiIntent } from "@/lib/knowledge/intent"

export type BrandIconName = "github" | "x" | "linkedin"

export const site = {
  name: "David Clinton",
  title: "DCH",
  description:
    "",
  url: "https://github.com/daveclinton",
  keywords: [
    "Clinton",
    "daveclintonn",
    "Software Engineer",
    "open source",
    "portfolio",
    "daveclinton",
    "",
  ],
} as const

export const profile = {
  name: "Clinton",
  handle: "@daveclintonn",
  role: "Software Engineer 🇰🇪",
  initials: "I",
  avatarSrc: "/david.jpg",
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

export const sponsor = {
  label: "Sponsor my open-source work on GitHub",
  href: "https://github.com/sponsors/daveclinton",
} as const

export type TimelineEntry = {
  id: string
  /** Employer or client, e.g. "Mika". */
  company: string
  /** Optional square app icon shown beside the role, e.g. "/companies/mika.png". */
  iconSrc?: string
  /** Initials used for a grouped avatar when one entry represents several companies. */
  iconInitials?: string[]
  /** Where the work happened, e.g. "Mombasa, Kenya". Omitted when unknown. */
  location?: string
  /** How the work happened, e.g. "Hybrid". Omitted when not stated. */
  arrangement?: string
  /** When the role started, e.g. "2021 Jan". */
  start: string
  /** When it ended, e.g. "2022 Feb". Omitted while the role is ongoing. */
  end?: string
  description: string
}

/** Rendered as the end of the range for the role that is still ongoing. */
export const ongoingRoleLabel = "Currently in this role"

/** "2021 Jan – 2022 Feb", or "2026 Sep – Currently in this role" when ongoing. */
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
    location: "Mombasa, Kenya",
    start: "2025 Oct",
    description:
      "I help warehouse, delivery, and customer service teams spend less time on manual work by automating paperwork and connecting information across the business.",
  },
  {
    id: "2024-09",
    company: "Givesuite · Element Pay · Studio1HQ",
    iconInitials: ["G", "E", "S"],
    start: "2024 Sep",
    end: "2025 Jun",
    description:
      "I improved online payment experiences for GiveSuite and Element Pay and wrote practical guides for developers through Studio1HQ.",
  },
  {
    id: "2022-05",
    company: "Untapped Global",
    iconSrc: "/untapped.png",
    location: "Nairobi, Kenya",
    arrangement: "Hybrid",
    start: "2022 May",
    end: "2024 May",
    description:
      "I turned complex investment data into clear charts so investors and internal teams could understand and explore it.",
  },
  {
    id: "2021-01",
    company: "Paperspace (now DigitalOcean)",
    iconSrc: "/paperspace.webp",
    arrangement: "Remote",
    start: "2021 Jan",
    end: "2022 Feb",
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

export const email = {
  label: "info@me.com",
  href: "mailto:maze-golds-8l@icloud.com",
} as const

export const aiButton = {
  label: "Ask an AI",
  /** Shown in the tooltip and used as the link's accessible name. */
  description: "Ask an AI about my work and experience",
  /** Point this at your own assistant once you have one. */
  href: "https://chatgpt.com/",
} as const

/**
 * The homepage entry point that opens the in-app "ask me anything" chat.
 * Rendered directly under the role in the header.
 */
export const askAi = {
  label: "Ask AI about me",
  /** Used as the link's accessible name. */
  description: "Ask an AI about my background, work, and experience",
  href: "/ask-ai",
  /** Centered prompt above the composer before the first question is asked. */
  title: `What do you want to know`,
  placeholder: "Ask about my work…",
  inputLabel: "Ask about my work",
} as const

/**
 * What the orb says while the answer is being retrieved and written. The
 * server classifies each question (see `lib/knowledge/intent.ts`), so the wait
 * can name what is being looked up instead of a generic "Thinking…".
 */
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

export const footer = {
  name: profile.name,
} as const
