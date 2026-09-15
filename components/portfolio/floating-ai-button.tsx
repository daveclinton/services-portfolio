"use client"

import { Sparkles } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { aiButton } from "@/lib/portfolio-data"
import { cn } from "@/lib/utils"

/**
 * The floating action from the reference. It is an anchor rather than a
 * <button> because it navigates to an assistant; on narrow screens the label
 * folds away and the accessible name carries the meaning.
 */
export function FloatingAiButton() {
  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={aiButton.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={aiButton.description}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 gap-2 rounded-lg bg-card px-3 text-card-foreground sm:px-4"
              )}
            >
              <span className="hidden text-body font-medium sm:inline">
                {aiButton.label}
              </span>
              <Sparkles
                className="size-4 text-accent-green transition-colors group-hover/button:text-foreground"
                aria-hidden="true"
              />
            </a>
          }
        />
        <TooltipContent side="left" sideOffset={10} className="hidden sm:flex">
          {aiButton.description}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
