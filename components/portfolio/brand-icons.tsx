import type { ComponentProps, ComponentType } from "react"
import type { BrandIconName } from "@/lib/portfolio-data"
import { cn } from "@/lib/utils"

/**
 * lucide-react no longer ships brand marks, so the three logos the reference
 * needs live here as plain inline SVG. They are decorative: every social link
 * also carries its own visible text label.
 */

type IconProps = ComponentProps<"svg">

export function XIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.63 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 5.9-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.4Z" />
    </svg>
  )
}

export function GitHubIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.2 4.5 18.2 4.8 18.2 4.8c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
    </svg>
  )
}

/** A rounded, stroked "Z" standing in for the Zenn mark. */
export function ZennIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d="M5.5 5.5H18.5L5.5 18.5H18.5" />
    </svg>
  )
}

const brandIcons: Record<BrandIconName, ComponentType<IconProps>> = {
  github: GitHubIcon,
  x: XIcon,
  zenn: ZennIcon,
}

export function BrandIcon({
  name,
  className,
}: {
  name: BrandIconName
  className?: string
}) {
  const Icon = brandIcons[name]
  return <Icon className={className} />
}

/**
 * The concentric orb inside the floating AI button.
 */
export function AiOrb({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#8fcea4_0%,#4f9a6a_46%,#2f6a45_100%)] ring-1 ring-black/5",
        className
      )}
    >
      <span className="absolute inset-[22%] rounded-full bg-background/85" />
      <span className="absolute inset-[38%] rounded-full bg-[#1D1C1A]" />
    </span>
  )
}
