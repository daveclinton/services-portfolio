import { FeaturedTweetEmbed } from "@/components/portfolio/featured-tweet-embed"
import { SectionLabel } from "@/components/portfolio/section-label"
import { SponsorLink } from "@/components/portfolio/sponsor-link"

export function FeaturedSection() {
  return (
    <section aria-labelledby="featured" className="mt-12 sm:mt-14">
      <SectionLabel id="featured">Featured</SectionLabel>

      <div className="mt-5">
        <FeaturedTweetEmbed />
        <SponsorLink />
      </div>
    </section>
  )
}
