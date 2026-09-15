import { ArrowUpRight, GitFork, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { featuredProject, type Stat } from "@/lib/portfolio-data"

const statIcons = { star: Star, fork: GitFork } as const

export function FeaturedProjectCard() {
  return (
    <Card className="gap-5 py-5 [--card-spacing:--spacing(5)] sm:py-6 sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="gap-2">
        <h3 className="text-title font-medium text-card-foreground">
          {featuredProject.name}
        </h3>
        <CardDescription className="max-w-[46ch] text-body text-muted-foreground">
          {featuredProject.description}
        </CardDescription>
        <CardAction>
          <a
            href={featuredProject.href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Open ${featuredProject.name} on GitHub (opens in a new tab)`}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge
          variant="secondary"
          className="h-7 gap-1.5 bg-muted px-3 text-caption font-medium text-foreground"
        >
          <Star className="text-accent-green" aria-hidden="true" />
          {featuredProject.badge}
        </Badge>

        <dl className="flex items-center gap-4 text-caption text-muted-foreground">
          {featuredProject.stats.map((stat: Stat) => {
            const Icon = statIcons[stat.icon]
            return (
              <div key={stat.label} className="flex items-center gap-1.5">
                <Icon
                  className="size-3.5 text-subtle-foreground"
                  aria-hidden="true"
                />
                <dt className="sr-only">{stat.label}</dt>
                <dd className="tabular-nums">{stat.value}</dd>
              </div>
            )
          })}
        </dl>
      </CardContent>

      <CardContent>
        <FeaturedVisual />
      </CardContent>
    </Card>
  )
}

/**
 * Stand-in for the project screenshot, drawn from theme tokens so it follows
 * the active preset until a real product image lands.
 */
function FeaturedVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative h-32 overflow-hidden rounded-lg border border-border bg-muted sm:h-40"
    >
      <div className="absolute inset-3 grid grid-cols-[0.9fr_2fr] gap-3">
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-2">
          <div className="h-2 w-12 rounded-full bg-accent-green/70" />
          <div className="h-1.5 w-full rounded-full bg-foreground/10" />
          <div className="h-1.5 w-4/5 rounded-full bg-foreground/10" />
          <div className="mt-auto grid grid-cols-2 gap-1.5">
            <span className="h-5 rounded-sm bg-muted" />
            <span className="h-5 rounded-sm bg-muted" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-md border border-border bg-background p-3">
          <div className="absolute top-3 right-3 flex gap-1.5">
            <span className="size-2 rounded-full bg-accent-green/70" />
            <span className="size-2 rounded-full bg-subtle-foreground/60" />
          </div>
          <div className="mt-7 grid h-[calc(100%-1.75rem)] grid-cols-3 gap-2">
            <span className="rounded-md bg-card" />
            <span className="rounded-md bg-card" />
            <span className="rounded-md bg-card" />
          </div>
        </div>
      </div>
    </div>
  )
}
