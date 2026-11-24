import type { ReactNode } from "react"
import { SiteNav } from "@/components/portfolio/site-nav"
import { Signals, type SignalItem } from "@/components/portfolio/signals"
import { email, socialLinks } from "@/lib/portfolio-data"

const SOCIAL_NAMES = { github: "GitHub", linkedin: "LinkedIn", x: "X" } as const

/** The shared frame of Home, Writing and Experience. */
export function NumberedPage({ id, heading, items, children }: { id: string; heading: string; items: SignalItem[]; children?: ReactNode }) {
  return (
    <div className="page numbered">
      {children}
      <SiteNav />
      <main id="content">
        <h1 className="sr-only">{heading}</h1>
        <Signals
          id={id}
          items={items}
          footer={
            <ul aria-label="Contact">
              <li><a href={email.href}>Email</a></li>
              {socialLinks.map((link) => (
                <li key={link.href}><a href={link.href}>{SOCIAL_NAMES[link.icon]}</a></li>
              ))}
            </ul>
          }
        />
      </main>
    </div>
  )
}
