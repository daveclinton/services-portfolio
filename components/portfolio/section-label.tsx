import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function SectionLabel({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="section-label"
      className={cn(
        "text-label font-medium text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}
