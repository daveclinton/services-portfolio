"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { askAi, site } from "@/lib/portfolio-data"

const links = [
  { href: "/blog", label: "Writing" },
  { href: "/experience", label: "Experience" },
  { href: askAi.href, label: "Ask AI" },
]

export function SiteNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={compact ? "site-nav site-nav-compact" : "site-nav"} aria-label="Site">
      <Link href="/" className="site-nav-home">
        {site.name}
      </Link>
      <ul>
        {links.filter((link) => !compact || link.href !== askAi.href).map((link) => {
          // "page" for the exact page, "true" when inside the section (e.g. a post).
          const current =
            pathname === link.href
              ? "page"
              : pathname.startsWith(`${link.href}/`)
                ? "true"
                : undefined
          return (
            <li key={link.href}>
              <Link href={link.href} aria-current={current}>
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
