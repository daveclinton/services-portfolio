import { SectionLabel } from "@/components/portfolio/section-label"
import { WorkCard } from "@/components/portfolio/work-card"
import { works } from "@/lib/portfolio-data"

export function OtherWorksSection() {
  return (
    <section aria-labelledby="other-works" className="mt-12 sm:mt-14">
      <SectionLabel id="other-works">Other works</SectionLabel>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {works.map((work) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
    </section>
  )
}
