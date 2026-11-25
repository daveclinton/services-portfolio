"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  id?: string
  value: string | null
  options: readonly { value: string; label: string }[]
  onValueChange: (value: string | null) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  className?: string
  variant?: "outline" | "ghost"
}

// Base UI owns focus, typeahead, keyboard navigation, and popup positioning.
// https://base-ui.com/react/components/select
export function SelectField({ id, value, options, onValueChange, disabled, placeholder, ariaLabel, className, variant = "outline" }: Props) {
  return <SelectPrimitive.Root items={options} value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectPrimitive.Trigger id={id} aria-label={ariaLabel} render={<Button variant={variant} className={cn("min-w-0 justify-between gap-2 text-caption", className)} />}>
      <SelectPrimitive.Value className="truncate" placeholder={placeholder} />
      <SelectPrimitive.Icon><ChevronDown className="size-4 shrink-0" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner align="start" sideOffset={4} alignItemWithTrigger={false} className="z-50">
        <SelectPrimitive.Popup className="min-w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none">
          <SelectPrimitive.List className="max-h-80 overflow-y-auto">
            {options.map((item) => <SelectPrimitive.Item key={item.value} value={item.value} className="relative flex cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-2.5 text-caption outline-none select-none data-highlighted:bg-muted data-highlighted:text-foreground">
              <SelectPrimitive.ItemText className="min-w-0 break-words">{item.label}</SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className="absolute right-2"><Check className="size-4" /></SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>)}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
}
