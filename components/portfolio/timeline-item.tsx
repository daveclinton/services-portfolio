import Image from "next/image"

import { ongoingRoleLabel } from "@/lib/portfolio-data"
import type { TimelineEntry } from "@/lib/portfolio-data"

export function TimelineItem({
  company,
  iconSrc,
  iconInitials,
  location,
  arrangement,
  start,
  end,
  description,
}: TimelineEntry) {
  const meta = [location, arrangement].filter(Boolean).join(" · ")

  return (
    <li className="relative pl-12">
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 grid size-8 place-items-center overflow-hidden rounded-[22%] bg-background ring-4 ring-background"
      >
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt=""
            width={32}
            height={32}
            className="size-full object-cover"
          />
        ) : iconInitials ? (
          <span className="relative size-full">
            {iconInitials.slice(0, 3).map((initial, index) => (
              <span
                key={`${initial}-${index}`}
                className={[
                  "absolute grid size-[17px] place-items-center rounded-[25%] border-2 border-background bg-foreground text-[8px] leading-none font-semibold text-background",
                  index === 0
                    ? "top-0 left-1/2 -translate-x-1/2"
                    : index === 1
                      ? "bottom-0 left-0"
                      : "right-0 bottom-0",
                ].join(" ")}
              >
                {initial}
              </span>
            ))}
          </span>
        ) : null}
      </span>

      <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
        <time className="text-caption font-medium text-muted-foreground tabular-nums sm:w-40 sm:shrink-0 sm:pt-px">
          <span className="whitespace-nowrap">{start} –</span>{" "}
          <span className="whitespace-nowrap">{end ?? ongoingRoleLabel}</span>
        </time>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-body font-medium text-foreground uppercase">
            {company}
          </p>
          {meta ? (
            <p className="text-caption text-muted-foreground">{meta}</p>
          ) : null}
          <p className="max-w-[52ch] text-body text-foreground/80">
            {description}
          </p>
        </div>
      </div>
    </li>
  )
}
