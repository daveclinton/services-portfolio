import { EmailLink } from "@/components/portfolio/email-link"
import { SectionLabel } from "@/components/portfolio/section-label"
import { SocialLinks } from "@/components/portfolio/social-links"

export function ContactSection() {
  return (
    <section
      id="links"
      aria-labelledby="links-heading"
      className="mt-12 scroll-mt-10 sm:mt-14"
    >
      <SectionLabel id="links-heading">Links / Contact</SectionLabel>

      <div className="mt-5 flex items-center gap-3 sm:gap-4">
        <SocialLinks />
        <EmailLink />
      </div>
    </section>
  )
}
