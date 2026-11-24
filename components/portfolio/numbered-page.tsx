import type { ComponentProps, ReactNode } from "react"
import { SiteNav } from "@/components/portfolio/site-nav"
import { Signals } from "@/components/portfolio/signals"
import { email, socialLinks } from "@/lib/portfolio-data"
import { toneOf } from "@/lib/tone"

const SOCIAL_NAMES = { github: "GitHub", linkedin: "LinkedIn", x: "X" } as const

/** The shared frame of Home, Writing and Experience. */
export function NumberedPage({ heading, children, ...list }: Omit<ComponentProps<typeof Signals>, "footer"> & { heading: string; children?: ReactNode }) {
  return (
    <div className="page numbered">
      {/* Before the first paint, so a shared item never flashes another color. */}
      {list.initial !== undefined ? (
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute("data-tone","${toneOf(list.initial)}")` }} />
      ) : null}
      {children}
      <SiteNav />
      <main id="content">
        <h1 className="sr-only">{heading}</h1>
        <Signals
          {...list}
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
