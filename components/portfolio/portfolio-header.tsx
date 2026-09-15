import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { profile } from "@/lib/portfolio-data"
import { cn } from "@/lib/utils"

export function PortfolioHeader() {
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
        <h1 className="flex items-baseline gap-2 truncate">
          <span className="text-name-sm font-medium text-foreground sm:text-name">
            {profile.name}
          </span>
          <span className="text-name-sm font-normal text-subtle-foreground sm:text-name">
            {profile.handle}
          </span>
        </h1>
        <p className="text-caption text-muted-foreground sm:text-body">
          {profile.role}
        </p>
      </div>

      <a
        href={profile.contactHref}
        className={cn(
          buttonVariants({ variant: "default" }),
          "h-10 shrink-0 rounded-lg px-4 sm:h-11"
        )}
      >
        {profile.contactLabel}
      </a>
    </header>
  )
}
