import { ArrowUpRight } from "lucide-react"
import { GitHubIcon } from "@/components/portfolio/brand-icons"
import { sponsor } from "@/lib/portfolio-data"

export function SponsorLink() {
  return (
    <a
      href={sponsor.href}
      target="_blank"
      rel="noreferrer noopener"
      className="group mt-3 flex items-center gap-3 rounded-full bg-card py-2 pr-4 pl-2 text-body text-muted-foreground transition-colors outline-none hover:bg-card-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
        <GitHubIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">{sponsor.label}</span>
      <ArrowUpRight
        className="size-4 shrink-0 text-subtle-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden="true"
      />
    </a>
  )
}
