"use client"

import { ChevronDown } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { useStickToBottomContext } from "use-stick-to-bottom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Adapted from prompt-kit's ScrollButton (MIT): appears when the reader has
// scrolled away from the newest message.
function ScrollButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { isAtBottom, escapedFromLock, scrollToBottom } = useStickToBottomContext()
  const following = isAtBottom && !escapedFromLock
  const reducedMotion = useReducedMotion()

  return (
    <Button
      variant="outline"
      size="lg"
      aria-label="Scroll to the latest message"
      aria-hidden={following}
      tabIndex={following ? -1 : 0}
      className={cn(
        "gap-1.5 rounded-full bg-background shadow-sm transition-all duration-150 ease-out",
        following
          ? "pointer-events-none translate-y-4 scale-95 opacity-0"
          : "translate-y-0 scale-100 opacity-100",
        className
      )}
      onClick={() => scrollToBottom({ animation: reducedMotion ? "instant" : "smooth" })}
      {...props}
    >
      <ChevronDown className="size-4" aria-hidden="true" />
      Latest
    </Button>
  )
}

export { ScrollButton }
