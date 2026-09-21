/**
 * Every string the homepage renders lives here, so layout work never has to
 * touch copy. Replace these values with your own and the page follows.
 */

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
    "Sofware Engineer",
    "open source",
    "portfolio",
    "daveclinton",
    "",
  ],
} as const

export const profile = {
  name: "Clinton",
  handle: "@daveclintonn",
  role: "Sofware Engineer 🇰🇪",
  initials: "I",
  avatarSrc: "/david.jpg",
  contactHref: "#links",
  contactLabel: "Contact Me",
} as const

export type Stat = {
  label: string
  value: string
  icon: "star" | "fork"
}

export const featuredProject = {
  name: "m3e-canvas",
  href: "https://github.com/lnkiai/m3e-canvas",
  badge: "GitHub Trending #1",
  description:
    "Sketch Material 3 Expressive screens directly inside any React app — a canvas-based editor for motion, colour, and component states.",
  stats: [
    { icon: "star", value: "1,284", label: "GitHub stars" },
    { icon: "fork", value: "126", label: "Forks" },
  ] satisfies Stat[],
} as const

export const sponsor = {
  label: "Sponsor my open-source work on GitHub",
  href: "https://github.com/sponsors/daveclinton",
} as const

export type Work = {
  id: string
  title: string
  description: string
  href: string
  meta: string
}

export const works: Work[] = [
  {
    id: "which-ai-model",
    title: "Which AI model are you?",
    description:
      "A two-minute quiz that reads your answers and tells you which large language model you think most alike.",
    href: "https://lnkiai.com/which-ai-model",
    meta: "Next.js · Quiz",
  },
  {
    id: "chat-panels",
    title: "chat-panels",
    description:
      "Composable chat UI panels for React, with streaming, tool calls, and theming handled for you.",
    href: "https://github.com/lnkiai/chat-panels",
    meta: "TypeScript · React",
  },
]

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
      "I am currently building internal tools for Mika covering Logistics, Aftersales Customer Service, Employee Management, and Warehouse across mobile, web, and backend",
  },
  {
    id: "2024-09",
    company: "Givesuite · Element Pay · Studio1HQ",
    iconInitials: ["G", "E", "S"],
    start: "2024 Sep",
    end: "2025 Jun",
    description:
      "Consulted for three firms at the same time while looking for a new full-time role: Full-Stack Developer at Givesuite, Frontend Developer at Element Pay, and DevRel at Studio1HQ",
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
      "I worked on the web platforms team at Untapped Global. Shipped investor dashboards and data visualization surfaces for investment and operations teams",
  },
  {
    id: "2021-01",
    company: "Paperspace (now DigitalOcean)",
    iconSrc: "/paperspace.webp",
    arrangement: "Remote",
    start: "2021 Jan",
    end: "2022 Feb",
    description:
      "I worked at Paperspace, writing developer facing infrastructure Tutorials on Cloud GPU and Applied Machine Learning Topics",
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
