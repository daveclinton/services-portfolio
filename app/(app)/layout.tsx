import { SiteNav } from "@/components/portfolio/site-nav"
import { VisibleViewport } from "@/components/portfolio/visible-viewport"

/**
 * Layout for the Ask AI chat. The whole page is pinned to the part of the
 * screen the reader can actually see, so the on-screen keyboard can never
 * cover the message box. Only the message list scrolls.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <VisibleViewport>
      <div className="page page-app chat-page">
        <SiteNav />
        <main id="content" className="flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
    </VisibleViewport>
  )
}
