"use client"

import type { ComponentProps, Ref } from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "@/lib/utils"

// shadcn/ui's Base UI Scroll Area, with the on-demand scrollbar behavior from
// Base UI's example. Refs keep the chat's existing stick-to-bottom behavior.
function ScrollArea({
  className,
  children,
  orientation = "vertical",
  viewportRef,
  contentRef,
  viewportProps,
  contentProps,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  orientation?: "vertical" | "horizontal"
  viewportRef?: Ref<HTMLDivElement>
  contentRef?: Ref<HTMLDivElement>
  viewportProps?: ComponentProps<typeof ScrollAreaPrimitive.Viewport>
  contentProps?: ComponentProps<typeof ScrollAreaPrimitive.Content>
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("group/scroll-area relative min-h-0 min-w-0", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        {...viewportProps}
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className={cn("size-full min-h-0 min-w-0 overscroll-contain rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50", viewportProps?.className)}
        style={{ overflowX: orientation === "vertical" ? "hidden" : undefined, ...viewportProps?.style }}
      >
        <ScrollAreaPrimitive.Content
          {...contentProps}
          ref={contentRef}
          data-slot="scroll-area-content"
          style={{ minWidth: orientation === "vertical" ? 0 : "fit-content", ...contentProps?.style }}
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation={orientation} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({ className, orientation = "vertical", ...props }: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      {...props}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "pointer-events-none flex touch-none p-px opacity-0 transition-opacity duration-150 select-none data-hovering:pointer-events-auto data-hovering:opacity-100 data-scrolling:pointer-events-auto data-scrolling:opacity-100 data-scrolling:duration-0 group-focus-within/scroll-area:pointer-events-auto group-focus-within/scroll-area:opacity-100 data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent motion-reduce:transition-none",
        className
      )}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-muted-foreground/50 hover:bg-muted-foreground"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
