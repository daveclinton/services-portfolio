import type { TimelineEntry } from "@/lib/portfolio-data"

export function TimelineItem({ date, description }: Omit<TimelineEntry, "id">) {
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
        <p className="max-w-[52ch] text-body text-foreground/80">
          {description}
        </p>
      </div>
    </li>
  )
}
