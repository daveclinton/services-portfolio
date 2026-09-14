import { BrandIcon } from "@/components/portfolio/brand-icons"
import { socialLinks } from "@/lib/portfolio-data"

export function SocialLinks() {
  return (
    <nav aria-label="Social links">
      <ul className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {socialLinks.map((link) => (
          <li key={link.label} className="flex">
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-12 flex-1 items-center justify-center gap-2 text-body text-muted-foreground transition-colors outline-none hover:bg-card-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
            >
              <BrandIcon name={link.icon} className="size-[18px]" />
              {link.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
