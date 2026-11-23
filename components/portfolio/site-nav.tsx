"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react"
import portrait from "@/public/david.webp"
import { askAi, email, site } from "@/lib/portfolio-data"

const links = [
  { href: "/blog", label: "Writing" },
  { href: "/experience", label: "Experience" },
  { href: askAi.href, label: "Ask AI" },
]

// Flush, borderless bar with the mark on the left, monospace links and one
// filled action on the right, after Notion's developer page
// (https://www.notion.com/product/dev). It leaves on scroll down and returns on
// scroll up, using Motion's scrollY event (https://motion.dev/docs/react-use-scroll).
export function SiteNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)

  useMotionValueEvent(scrollY, "change", (current) => {
    if (compact) return
    const previous = scrollY.getPrevious() ?? 0
    if (Math.abs(current - previous) < 4) return
    setHidden(current > previous && current > 160)
  })

  return (
    <motion.header
      className="site-nav"
      animate={{ y: hidden ? "-110%" : "0%" }}
      transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
      onFocusCapture={() => setHidden(false)}
    >
      <nav aria-label="Site">
        <Link href="/" className="site-nav-home" aria-label={`${site.name} homepage`} aria-current={pathname === "/" ? "page" : undefined}>
          <Image src={portrait} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
          <span className="site-nav-name">{site.name}</span>
        </Link>
        <ul>
          {links
            .filter((link) => !compact || link.href !== askAi.href)
            .map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  // "page" for the exact page, "true" when inside the section (e.g. a post).
                  aria-current={pathname === link.href ? "page" : pathname.startsWith(`${link.href}/`) ? "true" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
        </ul>
        <a href={email.href} className="site-nav-action">Email me</a>
      </nav>
    </motion.header>
  )
}
