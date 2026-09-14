import { FeaturedProjectCard } from "@/components/portfolio/featured-project-card"
import { SectionLabel } from "@/components/portfolio/section-label"
import { SponsorLink } from "@/components/portfolio/sponsor-link"

export function FeaturedSection() {
  return (
    <section aria-labelledby="featured" className="mt-12 sm:mt-14">
      <SectionLabel id="featured">Featured</SectionLabel>

      <div className="mt-5">
        <FeaturedProjectCard />
        <SponsorLink />
      </div>
    </section>
  )
}
