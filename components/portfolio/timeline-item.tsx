import { ongoingRoleLabel } from "@/lib/portfolio-data"
import type { TimelineEntry } from "@/lib/portfolio-data"

export function TimelineItem({
  company,
  location,
  arrangement,
  start,
  end,
  description,
}: TimelineEntry) {
  const meta = [location, arrangement].filter(Boolean).join(" · ")

  return (
    <li className="relative pl-7">
      <span
        aria-hidden="true"
        className="absolute top-[5px] left-0 size-[11px] rounded-full bg-accent-green ring-4 ring-background"
      />

      <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
        <time className="text-caption font-medium text-muted-foreground tabular-nums sm:w-40 sm:shrink-0 sm:pt-px">
          <span className="whitespace-nowrap">{start} –</span>{" "}
          <span className="whitespace-nowrap">{end ?? ongoingRoleLabel}</span>
        </time>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-body font-medium text-foreground uppercase">
            {company}
          </p>
          {meta ? (
            <p className="text-caption text-muted-foreground">{meta}</p>
          ) : null}
          <p className="max-w-[52ch] text-body text-foreground/80">
            {description}
          </p>
        </div>
      </div>
    </li>
  )
}
