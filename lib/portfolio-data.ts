/**
 * Every string the homepage renders lives here, so layout work never has to
 * touch copy. Replace these values with your own and the page follows.
 */

export type BrandIconName = "github" | "x" | "zenn"

export const site = {
  name: "Inori",
  title: "Inori — CS student & AI engineer",
  description:
    "Portfolio of Inori (@lnkiai): a CS student and AI engineer building open-source developer tools like m3e-canvas and chat-panels.",
  url: "https://github.com/lnkiai",
  keywords: [
    "Inori",
    "lnkiai",
    "AI engineer",
    "CS student",
    "open source",
    "portfolio",
    "m3e-canvas",
    "chat-panels",
  ],
} as const

export const profile = {
  name: "Inori",
  handle: "@lnkiai",
  role: "CS student / AI engineer 🇯🇵",
  initials: "I",
  /** Drop a photo in `public/` and point this at it, e.g. "/avatar.jpg". */
  avatarSrc: null as string | null,
  contactHref: "#links",
  contactLabel: "Contact",
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
  href: "https://github.com/sponsors/lnkiai",
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
  date: string
  description: string
}

export const backgroundItems: TimelineEntry[] = [
  {
    id: "2026-09",
    date: "2026 Sep",
    description:
      "Started working on open-source projects in public, shipping small tools every couple of weeks.",
  },
  {
    id: "2026-04",
    date: "2026 Apr",
    description:
      "Began a CS degree and started writing about the systems and models I build along the way.",
  },
  {
    id: "2025-08",
    date: "2025 Aug",
    description:
      "Started offering an AI chat assistant for small businesses that answers from their own docs.",
  },
  {
    id: "2023-04",
    date: "2023 Apr",
    description:
      "Started building AI-powered apps with React and Python, mostly because I wanted to use them.",
  },
]

export type SocialLink = {
  label: string
  href: string
  icon: BrandIconName
}

export const socialLinks: SocialLink[] = [
  { label: "X", href: "https://x.com/lnkiai", icon: "x" },
  { label: "Zenn", href: "https://zenn.dev/lnkiai", icon: "zenn" },
  { label: "GitHub", href: "https://github.com/lnkiai", icon: "github" },
]

export const email = {
  label: "info@example.com",
  href: "mailto:info@example.com",
} as const

export const aiButton = {
  label: "Ask an AI",
  /** Shown in the tooltip and used as the link's accessible name. */
  description: "Ask an AI about my work",
  /** Point this at your own assistant once you have one. */
  href: "https://chatgpt.com/",
} as const

export const footer = {
  name: profile.name,
} as const
