"use client"

import { AiOrb } from "@/components/portfolio/brand-icons"
import { buttonVariants } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href={aiButton.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={aiButton.description}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "h-14 gap-3 rounded-full bg-card px-2 text-card-foreground ring-1 ring-border transition-[background-color,transform] outline-none hover:scale-[1.02] hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-ring/40 motion-reduce:hover:scale-100 sm:h-[72px] sm:gap-4 sm:pr-3.5 sm:pl-6"
                )}
              >
                <span className="hidden text-body font-medium sm:inline">
                  {aiButton.label}
                </span>
                <AiOrb className="size-10 sm:size-12" />
              </a>
            }
          />
          <TooltipContent side="left" sideOffset={10} className="hidden sm:flex">
            {aiButton.description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
