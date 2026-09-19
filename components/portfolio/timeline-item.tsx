import Link from "next/link"
import { Sparkles } from "lucide-react"
import type { TimelineEntry } from "@/lib/portfolio-data"

export function TimelineItem({ id, date, description }: TimelineEntry) {
  return (
    <li className="relative pl-7">
      <span
        aria-hidden="true"
        className="absolute top-[5px] left-0 size-[11px] rounded-full bg-accent-green ring-4 ring-background"
      />

      <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
        <time className="text-caption font-medium text-muted-foreground tabular-nums sm:w-24 sm:shrink-0 sm:pt-px">
          {date}
        </time>
        <div className="flex min-w-0 flex-col gap-2.5">
          <p className="max-w-[52ch] text-body text-foreground/80">
            {description}
          </p>
          <Link
            href={`/ask-ai/${encodeURIComponent(id)}`}
            aria-label={`Ask AI about this role: ${description.slice(0, 60)}…`}
            className="inline-flex w-fit items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles
              className="size-3.5 shrink-0 text-accent-green"
              aria-hidden="true"
            />
            Ask AI about this role
          </Link>
        </div>
      </div>
    </li>
  )
}
