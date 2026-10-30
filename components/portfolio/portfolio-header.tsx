"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles } from "lucide-react"
import { BackHomeButton } from "@/components/portfolio/back-home-button"
import { askAi, profile } from "@/lib/portfolio-data"

export function PortfolioHeader() {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <header className="flex min-w-0 items-center gap-3 sm:gap-5">
      <Image
        src={profile.avatarSrc}
        alt={`${profile.name}'s profile picture`}
        width={64}
        height={64}
        loading="eager"
        className="size-12 shrink-0 rounded-full border border-border object-cover sm:size-16"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
          <span className="truncate text-title font-medium text-foreground sm:text-name-sm">
            {profile.name}
          </span>
          <span className="truncate text-body font-normal text-subtle-foreground sm:text-title">
            {profile.handle}
          </span>
        </h1>
        <p className="truncate text-caption text-muted-foreground sm:text-body">
          {profile.role}
        </p>
        <a
          href={isHome ? profile.contactHref : `/${profile.contactHref}`}
          className="mt-1.5 inline-flex w-fit text-caption font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {profile.contactLabel}
        </a>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {isHome ? (
          <Link
            href={askAi.href}
            aria-label={askAi.description}
            title={askAi.label}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-1 text-xs font-medium text-foreground outline-none transition-transform active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span>Ask AI</span>
          </Link>
        ) : (
          <BackHomeButton />
        )}
      </div>
    </header>
  )
}
