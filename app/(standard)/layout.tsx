import { TooltipProvider } from "@/components/ui/tooltip"
import { PortfolioHeader } from "@/components/portfolio"

export default function StandardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 grid min-h-[calc(100dvh-20px)] grid-rows-[auto_minmax(0,1fr)]">
      <TooltipProvider>
        <div className="sticky top-0 z-20 bg-background">
          <div className="mx-auto w-full max-w-[680px] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-4 sm:pb-3">
            <PortfolioHeader />
          </div>
        </div>
        <main className="mx-auto flex min-h-0 min-w-0 w-full max-w-[680px] flex-col px-4 sm:px-6">
          {children}
        </main>
      </TooltipProvider>
    </div>
  )
}
