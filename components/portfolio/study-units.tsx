import type { ReactNode } from "react"
import { GraduationCap } from "lucide-react"

/** A short aside listing the university units that build the skill a section describes. */
export function StudyUnits({ title = "Study this at university", children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="rounded-lg border border-border bg-card p-4 sm:p-6" aria-label={title}>
      <div className="flex items-center gap-2 text-label font-semibold uppercase text-subtle-foreground">
        <GraduationCap className="size-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-3 text-body [&>*+*]:mt-3">{children}</div>
    </aside>
  )
}
