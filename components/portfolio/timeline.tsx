import { TimelineItem } from "@/components/portfolio/timeline-item"
import type { TimelineEntry } from "@/lib/portfolio-data"

export function Timeline({ items }: { items: TimelineEntry[] }) {
  return (
    <div className="relative mt-5">
      <span
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[5px] w-px bg-border"
      />

      <ol className="flex flex-col gap-6">
        {items.map((item) => (
          <TimelineItem key={item.id} date={item.date} description={item.description} />
        ))}
      </ol>
    </div>
  )
}
