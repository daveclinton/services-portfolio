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
    <Card className="gap-5 rounded-xl py-5 ring-1 ring-foreground/5 [--card-spacing:--spacing(5)] sm:py-6 sm:[--card-spacing:--spacing(6)]">
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
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge
          variant="secondary"
          className="h-7 gap-1.5 rounded-full bg-background px-3 text-xs font-medium text-foreground"
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
 * Stand-in for the project screenshot in the reference: an abstract view of
 * the canvas editor, drawn with CSS so it stays crisp at any width and adds
 * no image weight. Swap in a real screenshot when one exists.
 */
function FeaturedVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative h-32 overflow-hidden rounded-lg bg-[linear-gradient(135deg,#5fa87c_0%,#4f9a6a_46%,#3b7753_100%)] sm:h-40"
    >
      <div className="absolute -top-12 -left-10 size-40 rounded-full bg-white/25 blur-3xl" />
      <div className="absolute -right-10 -bottom-16 size-44 rounded-full bg-[#1d1c1a]/20 blur-3xl" />

      <div className="absolute top-1/2 left-5 h-20 w-28 -translate-y-1/2 -rotate-6 rounded-lg bg-white/15 ring-1 ring-white/25 sm:left-8 sm:h-24 sm:w-36" />

      <div className="absolute top-1/2 left-12 flex h-20 w-28 -translate-y-1/2 rotate-3 flex-col justify-between rounded-lg bg-background/95 p-3 shadow-[0_18px_36px_rgba(20,44,28,0.28)] sm:left-20 sm:h-24 sm:w-36">
        <div className="h-2 w-12 rounded-full bg-accent-green/70" />
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full rounded-full bg-foreground/10" />
          <div className="h-1.5 w-3/4 rounded-full bg-foreground/10" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-4 w-10 rounded-full bg-foreground" />
          <div className="size-4 rounded-full bg-accent-green/70" />
        </div>
      </div>

      <div className="absolute top-1/2 right-6 h-16 w-20 -translate-y-1/2 rotate-6 rounded-lg bg-background/70 sm:right-10 sm:h-20 sm:w-24" />
    </div>
  )
}
