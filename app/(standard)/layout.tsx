import { SiteNav } from "@/components/portfolio/site-nav"

export default function StandardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page page-app">
      <SiteNav />
      <main id="content" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
