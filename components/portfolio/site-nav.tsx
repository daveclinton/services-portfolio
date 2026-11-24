"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { askAi, site } from "@/lib/portfolio-data"

const links = [
  { href: "/blog", label: "Writing" },
  { href: "/experience", label: "Experience" },
  { href: askAi.href, label: "Ask AI" },
]

// Plain bold links on the left, the name on the right, after 37signals.com.
export function SiteNav() {
  const pathname = usePathname()

  return (
    <header className="site-nav">
      <nav aria-label="Site">
        <ul>
          {links.map((link) => (
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
        <Link href="/" className="site-nav-home" aria-label={`${site.name} homepage`} aria-current={pathname === "/" ? "page" : undefined}>
          {site.name}
        </Link>
      </nav>
    </header>
  )
}
