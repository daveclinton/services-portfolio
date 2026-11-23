"use client"

import { StickToBottom } from "use-stick-to-bottom"
import { useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

// Adapted from prompt-kit's ChatContainer (MIT). Keeps the list pinned to the
// newest message while streaming, unless the reader scrolls up.

export type ChatContainerRootProps = React.HTMLAttributes<HTMLDivElement>

function ChatContainerRoot({ children, className, ...props }: ChatContainerRootProps) {
  const reducedMotion = useReducedMotion()
  return (
    <StickToBottom
      className={cn("relative flex overflow-hidden", className)}
      resize={reducedMotion ? "instant" : "smooth"}
      initial="instant"
      role="log"
      {...props}
    >
      {children}
    </StickToBottom>
  )
}

function ChatContainerContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <StickToBottom.Content
      scrollClassName="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain"
      className={cn("flex min-w-0 w-full flex-col", className)}
      {...props}
    >
      {children}
    </StickToBottom.Content>
  )
}

export { ChatContainerRoot, ChatContainerContent }
