import { SectionLabel } from "@/components/portfolio/section-label"
import { Timeline } from "@/components/portfolio/timeline"
import { backgroundItems } from "@/lib/portfolio-data"

export function BackgroundSection() {
  return (
    <section aria-labelledby="background" className="mt-12 sm:mt-14">
      <SectionLabel id="background">Background</SectionLabel>
      <Timeline items={backgroundItems} />
    </section>
  )
}
