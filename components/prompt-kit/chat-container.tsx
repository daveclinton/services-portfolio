"use client"

import { StickToBottom } from "use-stick-to-bottom"
import { cn } from "@/lib/utils"

// Adapted from prompt-kit's ChatContainer (MIT). Keeps the list pinned to the
// newest message while streaming, unless the reader scrolls up.

export type ChatContainerRootProps = React.HTMLAttributes<HTMLDivElement>

function ChatContainerRoot({ children, className, ...props }: ChatContainerRootProps) {
  return (
    <StickToBottom
      className={cn("relative flex overflow-y-auto", className)}
      resize="smooth"
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
    <StickToBottom.Content className={cn("flex w-full flex-col", className)} {...props}>
      {children}
    </StickToBottom.Content>
  )
}

export { ChatContainerRoot, ChatContainerContent }
