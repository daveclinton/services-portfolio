import Image from "next/image"
import { SectionLabel } from "@/components/portfolio/section-label"
import { SponsorLink } from "@/components/portfolio/sponsor-link"

export function FeaturedSection() {
  return (
    <section aria-labelledby="featured" className="mt-12 sm:mt-14">
      <SectionLabel id="featured">Featured</SectionLabel>

      <div className="mt-5">
        <figure
          data-slot="featured-image-card"
          className="relative h-80 w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/5 sm:h-[28rem]"
        >
          <Image
            src="/workstation.jpg"
            alt="My workstation: ultrawide monitor running Ubuntu beside a MacBook, with a mechanical keyboard and mouse on a standing desk"
            fill
            sizes="(max-width: 640px) 100vw, 680px"
            className="object-cover object-[center_24%]"
            priority
          />
        </figure>
        <SponsorLink />
      </div>
    </section>
  )
}
