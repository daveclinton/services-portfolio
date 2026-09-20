"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { askAi, profile } from "@/lib/portfolio-data"
import { cn } from "@/lib/utils"

export function PortfolioHeader() {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <header className="flex items-center gap-4 sm:gap-5">
      <Avatar
        className="size-14 shrink-0 sm:size-16"
        aria-label={`${profile.name}'s profile picture`}
      >
        {profile.avatarSrc ? (
          <AvatarImage src={profile.avatarSrc} alt={profile.name} />
        ) : null}
        <AvatarFallback className="bg-muted text-title font-medium text-muted-foreground">
          {profile.initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-title font-medium text-foreground sm:text-name-sm">
            {profile.name}
          </span>
          <span className="truncate text-body font-normal text-subtle-foreground sm:text-title">
            {profile.handle}
          </span>
        </h1>
        <p className="text-caption text-muted-foreground sm:text-body">
          {profile.role}
        </p>
        {isHome ? (
          <Link
            href={askAi.href}
            aria-label={askAi.description}
            className="mt-1.5 inline-flex w-fit items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles
              className="size-3.5 shrink-0 text-accent-green"
              aria-hidden="true"
            />
            {askAi.label}
          </Link>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isHome ? null : (
          <Link
            href="/"
            aria-label="Close and return to the portfolio"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-10 rounded-full sm:size-11"
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </Link>
        )}
        <a
          href={isHome ? profile.contactHref : `/${profile.contactHref}`}
          className={cn(
            buttonVariants({ variant: "default" }),
            "h-10 shrink-0 rounded-lg px-4 sm:h-11"
          )}
        >
          {profile.contactLabel}
        </a>
      </div>
    </header>
  )
}
