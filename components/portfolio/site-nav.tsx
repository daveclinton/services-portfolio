"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useId, useState } from "react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { House } from "lucide-react"
import { askAi, site } from "@/lib/portfolio-data"

const links = [
  { href: "/blog", label: "Writing" },
  { href: "/experience", label: "Experience" },
  { href: askAi.href, label: "Ask AI" },
]

export function SiteNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const groupId = useId()
  const reducedMotion = useReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const items = [{ href: "/", label: site.name }, ...links.filter((link) => !compact || link.href !== askAi.href)]
  const active = items.find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))?.href
  const highlighted = focused ?? hovered ?? active

  return (
    <LayoutGroup id={groupId}>
      <motion.nav
        layoutRoot
        className={`site-nav glass-surface rounded-2xl border border-border p-2${compact ? " site-nav-compact" : ""}`}
        aria-label="Site"
        onPointerLeave={() => setHovered(null)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null)
        }}
      >
        <ul>
          {items.map((link) => {
            // "page" for the exact page, "true" when inside the section (e.g. a post).
            const current =
              pathname === link.href
                ? "page"
                : pathname.startsWith(`${link.href}/`)
                  ? "true"
                  : undefined
            return (
              <li key={link.href} className={link.href === "/" ? "site-nav-home-item" : undefined}>
                <Link
                  href={link.href}
                  aria-label={link.href === "/" ? `${site.name} homepage` : undefined}
                  aria-current={current}
                  className={link.href === "/" ? "site-nav-home" : undefined}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setHovered(link.href)
                  }}
                  onFocus={() => setFocused(link.href)}
                >
                  {highlighted === link.href ? (
                    <motion.span
                      aria-hidden="true"
                      className="site-nav-highlight rounded-lg bg-muted"
                      layoutId={reducedMotion === false ? "nav-highlight" : undefined}
                      transition={{ type: "spring", duration: reducedMotion === false ? 0.2 : 0, bounce: 0 }}
                    />
                  ) : null}
                  {link.href === "/" ? <House className="site-nav-home-icon size-4" aria-hidden="true" /> : null}
                  <span className="site-nav-label">{link.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </motion.nav>
    </LayoutGroup>
  )
}
