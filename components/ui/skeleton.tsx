import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

// https://ui.shadcn.com/docs/components/base/skeleton
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("rounded-lg bg-muted motion-safe:animate-pulse", className)} {...props} />
}
