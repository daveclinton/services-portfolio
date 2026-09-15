/**
 * Every string the homepage renders lives here, so layout work never has to
 * touch copy. Replace these values with your own and the page follows.
 */

export type BrandIconName = "github" | "x" | "zenn"

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
  contactLabel: "Contact",
} as const

export const featuredTweet = {
  name: site.name,
  handle: profile.handle,
  avatar: profile.avatarSrc,
  href: "https://x.com/daveclintonn/status/2099397383477993558",
  date: "September 14, 2026",
  dateTime: "2026-09-14",
  verified: false,
  content: [
    "Turns out, doing it yourself can be quite the adventure.",
    "I recently bought a bare metal Mini PC for $100, installed Ubuntu, and still I couldn’t get the wireless keyboard and mouse to work.",
    "Now I’ve got the Mini PC running alongside my Mac, with Ubuntu handling my Linux…",
  ],
  links: [
    {
      label: "https://t.co/g9vtYEhUrC",
      href: "https://t.co/g9vtYEhUrC",
    },
    {
      label: "pic.twitter.com/4EAK7KDXXH",
      href: "https://t.co/4EAK7KDXXH",
    },
  ],
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
  date: string
  description: string
}

export const backgroundItems: TimelineEntry[] = [
  {
    id: "2026-09",
    date: "2026 Sep",
    description:
      "I am currently building internal tools on mobile, web and backend for Mika (an Appliances and Logistics company)",
  },
  {
    id: "2024 Sept",
    date: "2025 Jun",
    description:
      "Contracted by Givesuite to build modern donation and payment user interfaces that feel right",
  },
  {
    id: "2022 May",
    date: "2024 May",
    description:
      "I worked on the web platforms team at Untapped. Shipped investor dashboards and data visualization surfaces for investment and operations teams",
  },
  {
    id: "2021 Jan",
    date: "2022 Feb",
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
  { label: "X", href: "https://x.com/daveclintonn", icon: "x" },
  { label: "Linkedin", href: "https://www.linkedin.com/in/clintondavid46/", icon: "zenn" },
  { label: "GitHub", href: "https://github.com/daveclinton", icon: "github" },
]

export const email = {
  label: "info@me.com",
  href: "maze-golds-8l@icloud.com",
} as const

export const aiButton = {
  label: "Ask an AI",
  /** Shown in the tooltip and used as the link's accessible name. */
  description: "Ask an AI about my work and experience",
  /** Point this at your own assistant once you have one. */
  href: "https://chatgpt.com/",
} as const

export const footer = {
  name: profile.name,
} as const
