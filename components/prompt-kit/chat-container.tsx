"use client"

import { useRef } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"
import { useReducedMotion } from "motion/react"
import { ScrollArea } from "@/components/ui/scroll-area"
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

function ChatContainerContent({
  children,
  className,
  onScrollDirectionChange,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  onScrollDirectionChange?: (direction: "up" | "down") => void
}) {
  const { scrollRef, contentRef, state } = useStickToBottomContext()
  const lastScrollTop = useRef(0)
  const touchPosition = useRef<{ x: number; y: number } | null>(null)

  return (
    <ScrollArea
      className="min-h-0 flex-1"
      viewportRef={scrollRef}
      contentRef={contentRef}
      contentProps={{ ...props, className: cn("flex min-w-0 w-full flex-col", className) }}
      viewportProps={{
        role: "region",
        "aria-label": "Conversation",
        onScroll: (event) => {
          const top = Math.max(0, event.currentTarget.scrollTop)
          const delta = top - lastScrollTop.current
          // Streaming and layout changes are not navigation intent.
          if (state.animation) {
            lastScrollTop.current = top
            return
          }
          if (Math.abs(delta) < 8) return
          lastScrollTop.current = top
          onScrollDirectionChange?.(delta < 0 ? "up" : "down")
        },
        onWheel: (event) => {
          if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
          onScrollDirectionChange?.(event.deltaY < 0 ? "up" : "down")
        },
        onTouchStart: (event) => {
          const touch = event.touches.length === 1 ? event.touches[0] : undefined
          touchPosition.current = touch ? { x: touch.clientX, y: touch.clientY } : null
        },
        onTouchMove: (event) => {
          if (event.touches.length !== 1) {
            touchPosition.current = null
            return
          }
          const previous = touchPosition.current
          const touch = event.touches[0]
          if (!previous || !touch) return
          const delta = previous.y - touch.clientY
          if (Math.abs(delta) < 8 || Math.abs(delta) <= Math.abs(previous.x - touch.clientX)) return
          touchPosition.current = { x: touch.clientX, y: touch.clientY }
          onScrollDirectionChange?.(delta < 0 ? "up" : "down")
        },
        onKeyDown: (event) => {
          if (event.target !== event.currentTarget) return
          if (["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey)) {
            onScrollDirectionChange?.("up")
          } else if (["ArrowDown", "PageDown", "End", " "].includes(event.key)) {
            onScrollDirectionChange?.("down")
          }
        },
      }}
    >
      {children}
    </ScrollArea>
  )
}

export { ChatContainerRoot, ChatContainerContent }
