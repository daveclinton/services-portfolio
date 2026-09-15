import type { HTMLAttributes, ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import { XIcon } from "@/components/portfolio/brand-icons"
import { cn } from "@/lib/utils"

// `content` is omitted from the base attributes: HTML has its own `content`
// attribute typed as a string, and ours takes a node.
interface TweetCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "content"> {
  name: string
  handle: string
  content: ReactNode | readonly string[]
  /** Optional avatar URL; falls back to the author's initial. */
  avatar?: string | null
  /** Display date from the source post, e.g. "September 14, 2026". */
  date?: string
  dateTime?: string
  href?: string
  links?: readonly {
    label: string
    href: string
  }[]
  verified?: boolean
}

/**
 * Static social-proof card in the shape of a tweet. Takes props rather than
 * calling an API, so there is no network request or runtime dependency.
 */
export function TweetCard({
  name,
  handle,
  content,
  avatar,
  date,
  dateTime,
  href,
  links = [],
  verified = false,
  className,
  ...props
}: TweetCardProps) {
  const normalizedHandle = handle.replace(/^@/, "")

  return (
    <figure
      {...props}
      data-slot="tweet-card"
      className={cn(
        "flex w-full flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/5 transition-colors hover:bg-card-hover sm:p-6",
        className
      )}
    >
      <header className="flex items-start gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-green text-sm font-medium text-accent-green-foreground"
          >
            {name.charAt(0)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-body font-medium">{name}</span>
            {verified ? (
              <svg
                viewBox="0 0 24 24"
                className="size-4 shrink-0 fill-accent-green"
                aria-label="Verified account"
                role="img"
              >
                <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-1 2.9 1 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l1-2.9-1-2.9 2.6-1.5 1-2.8 3 .3z" />
                <path
                  d="M8.5 12.2l2.3 2.3 4.5-4.6"
                  fill="none"
                  stroke="var(--card)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            ) : null}
          </div>
          <p className="truncate text-caption text-muted-foreground">
            @{normalizedHandle}
          </p>
        </div>

        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open ${name}'s post on X`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <XIcon className="size-4" />
        </a>
      </header>

      <blockquote className="flex flex-col gap-3 text-body text-pretty text-card-foreground">
        {Array.isArray(content) ? (
          content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        ) : (
          <p>{content}</p>
        )}

        {links.length > 0 ? (
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-green underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {link.label}
              </a>
            ))}
          </p>
        ) : null}
      </blockquote>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-4 text-caption text-muted-foreground">
        <span>
          &mdash; {name} (@{normalizedHandle})
        </span>
        {date ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-full outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <time dateTime={dateTime}>{date}</time>
            <ArrowUpRight
              className="size-3.5 shrink-0"
              aria-hidden="true"
            />
          </a>
        ) : null}
      </figcaption>
    </figure>
  )
}
