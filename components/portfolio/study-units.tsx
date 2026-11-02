import type { ReactNode } from "react"
import { ChevronRight, GraduationCap } from "lucide-react"

/**
 * A collapsible aside listing the university units that build the skill a
 * section describes. Closed by default so it doesn't interrupt the article.
 */
export function StudyUnits({ title = "Study this at university", children }: { title?: string; children: ReactNode }) {
  return (
    <details className="group study-units rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-base font-semibold text-foreground hover:bg-muted/60 sm:px-6 [&::-webkit-details-marker]:hidden">
        <GraduationCap className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1">{title}</span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>
      <div className="px-4 pb-4 text-body sm:px-6 sm:pb-6 [&>*+*]:mt-3">{children}</div>
    </details>
  )
}
