import { ArrowUpRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import type { Work } from "@/lib/portfolio-data"

export function WorkCard({ work }: { work: Work }) {
  return (
    <Card className="group relative gap-0 rounded-xl py-5 ring-1 ring-foreground/5 transition-colors [--card-spacing:--spacing(5)] hover:bg-card-hover sm:py-6">
      <CardHeader className="gap-2">
        <h3 className="text-title font-medium text-card-foreground">
          {/* The overlay keeps the whole card clickable while the link text stays meaningful. */}
          <a
            href={work.href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${work.title} (opens in a new tab)`}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring/40"
          >
            {work.title}
          </a>
        </h3>
        <CardDescription className="text-body text-muted-foreground">
          {work.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-caption text-muted-foreground">{work.meta}</span>
        <ArrowUpRight
          className="size-4 shrink-0 text-subtle-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </CardContent>
    </Card>
  )
}
