import { BrandIcon } from "@/components/portfolio/brand-icons"
import { socialLinks } from "@/lib/portfolio-data"

export function SocialLinks() {
  return (
    <nav aria-label="Social links">
      <ul className="flex items-center gap-3 sm:gap-4">
        {socialLinks.map((link) => (
          <li key={link.label} className="flex">
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              title={link.label}
              className="flex size-12 shrink-0 items-center justify-center rounded-md transition-opacity outline-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <BrandIcon name={link.icon} className="size-8" />
              <span className="sr-only">{link.label} (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
