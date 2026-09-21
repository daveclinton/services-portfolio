import { SectionLabel } from "@/components/portfolio/section-label"
import { Timeline } from "@/components/portfolio/timeline"
import { backgroundItems } from "@/lib/portfolio-data"

export function BackgroundSection() {
  return (
    <section aria-labelledby="background" className="mt-10">
      <SectionLabel id="background">WORK EXPERIENCE</SectionLabel>
      <Timeline items={backgroundItems} />
    </section>
  )
}
