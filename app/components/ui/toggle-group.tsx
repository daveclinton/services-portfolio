"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type ToggleGroupContextValue = {
  value?: string
  onValueChange?: (value: string) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({})

type ToggleGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: "single"
  value?: string
  onValueChange?: (value: string) => void
  orientation?: "horizontal" | "vertical"
  spacing?: number
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      className,
      value,
      onValueChange,
      orientation = "horizontal",
      spacing = 2,
      ...props
    },
    ref
  ) => (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div
        ref={ref}
        role="group"
        data-orientation={orientation}
        className={cn(
          "flex flex-wrap",
          orientation === "vertical" ? "flex-col" : "flex-row",
          spacing === 0 ? "gap-0" : spacing === 1 ? "gap-1" : "gap-2",
          className
        )}
        {...props}
      />
    </ToggleGroupContext.Provider>
  )
)
ToggleGroup.displayName = "ToggleGroup"

type ToggleGroupItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, onClick, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    const isActive = context.value === value

    return (
      <button
        ref={ref}
        type="button"
        data-state={isActive ? "on" : "off"}
        aria-pressed={isActive}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
          className
        )}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) context.onValueChange?.(value)
        }}
        {...props}
      />
    )
  }
)
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
