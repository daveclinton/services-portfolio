"use client"

import type { ComponentProps } from "react"
import {
  MessageScroller as MessageScrollerPrimitive,
} from "@shadcn/react/message-scroller"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// shadcn/ui's Message Scroller (https://ui.shadcn.com/docs/components/base/message-scroller).
// A new question settles near the top and its answer grows into the space below,
// so nothing moves unless the reader moves it.

function MessageScrollerProvider(props: ComponentProps<typeof MessageScrollerPrimitive.Provider>) {
  return <MessageScrollerPrimitive.Provider {...props} />
}

function MessageScroller({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Root>) {
  return (
    <MessageScrollerPrimitive.Root
      data-slot="message-scroller"
      className={cn("relative flex min-h-0 w-full flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  )
}

function MessageScrollerViewport({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Viewport>) {
  return (
    <MessageScrollerPrimitive.Viewport
      data-slot="message-scroller-viewport"
      className={cn(
        "size-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 data-pending-scroll:invisible",
        className
      )}
      {...props}
    />
  )
}

function MessageScrollerContent({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Content>) {
  return (
    <MessageScrollerPrimitive.Content
      data-slot="message-scroller-content"
      className={cn("flex h-max min-h-full flex-col", className)}
      {...props}
    />
  )
}

function MessageScrollerItem({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      data-slot="message-scroller-item"
      className={cn("min-w-0 shrink-0", className)}
      {...props}
    />
  )
}

function MessageScrollerButton({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Button>) {
  return (
    <MessageScrollerPrimitive.Button
      data-slot="message-scroller-button"
      direction="end"
      aria-label="Scroll to the latest message"
      className={cn(
        "glass-surface absolute bottom-6 left-1/2 -translate-x-1/2 gap-1.5 rounded-full border-border transition-[opacity,scale] duration-150 ease-out data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 motion-reduce:transition-none",
        className
      )}
      render={<Button variant="ghost" size="lg" />}
      {...props}
    >
      <ChevronDown className="size-4" aria-hidden="true" />
      Latest
    </MessageScrollerPrimitive.Button>
  )
}

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
}
