"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLayoutEffect } from "react"
import { askAi, site } from "@/lib/portfolio-data"
import { enterAdminTheme } from "@/lib/tone"

const links: { href: string; label: string; section?: string }[] = [
  { href: "/blog", section: "/writing", label: "Writing" },
  { href: "/experience", label: "Experience" },
  { href: askAi.href, label: "Ask AI" },
]

// Plain bold links on the left, the name on the right, after 37signals.com.
export function SiteNav() {
  const pathname = usePathname()

  // The public palette is remembered, but never carried into private writing.
  useLayoutEffect(() => {
    if (!pathname.startsWith("/admin/")) return
    return enterAdminTheme()
  }, [pathname])

  return (
    <header className="site-nav">
      <nav aria-label="Site">
        <ul>
          {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  // "page" for the exact page, "true" when inside the section (e.g. a post).
                  aria-current={pathname === link.href ? "page" : [link.href, link.section].some((path) => path && pathname.startsWith(`${path}/`)) ? "true" : undefined}
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
