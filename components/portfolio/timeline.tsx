import { TimelineItem } from "@/components/portfolio/timeline-item"
import type { TimelineEntry } from "@/lib/portfolio-data"

export function Timeline({ items }: { items: TimelineEntry[] }) {
  return (
    <ol className="roles">
      {items.map((item) => (
        <TimelineItem key={item.id} {...item} />
      ))}
    </ol>
  )
}
