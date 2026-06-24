"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const FONT_SIZE_OPTIONS = [
  { id: "small", label: "Small", value: 64 },
  { id: "medium", label: "Medium", value: 96 },
  { id: "large", label: "Large", value: 144 },
  { id: "veryLarge", label: "Very large", value: 192 },
] as const

type AssetFontSizePickerProps = {
  value: number
  onChange: (fontSize: number) => void
}

function SizeIcon({ id }: { id: (typeof FONT_SIZE_OPTIONS)[number]["id"] }) {
  if (id === "small") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
        <path
          d="M14.167 6.667a3.333 3.333 0 0 0-3.334-3.334H9.167a3.333 3.333 0 0 0 0 6.667h1.666a3.333 3.333 0 0 1 0 6.667H9.167a3.333 3.333 0 0 1-3.334-3.334"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (id === "medium") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 16.667V3.333L10 15l5-11.667v13.334"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (id === "large") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
        <path
          d="M5.833 3.333v13.334h8.334"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="m1.667 3.333 6.666 13.334M8.333 3.333 1.667 16.667M11.667 3.333v13.334h6.666"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getActiveFontSizeId(value: number) {
  return FONT_SIZE_OPTIONS.reduce((closest, option) => {
    const closestDistance = Math.abs(closest.value - value)
    const optionDistance = Math.abs(option.value - value)
    return optionDistance < closestDistance ? option : closest
  }, FONT_SIZE_OPTIONS[0]).id
}

function clampFontSize(value: number) {
  return Math.min(Math.max(Math.round(value), 16), 320)
}

export function AssetFontSizePicker({ value, onChange }: AssetFontSizePickerProps) {
  const [open, setOpen] = useState(false)
  const [customValue, setCustomValue] = useState(String(clampFontSize(value)))
  const activeId = getActiveFontSizeId(value)
  const normalizedValue = clampFontSize(value)
  const exactOption = FONT_SIZE_OPTIONS.find((option) => option.value === normalizedValue)
  useEffect(() => {
    setCustomValue(String(normalizedValue))
  }, [normalizedValue])
  const applyCustomValue = () => {
    const parsed = Number(customValue)
    if (!Number.isFinite(parsed)) {
      return
    }

    onChange(clampFontSize(parsed))
    setOpen(false)
  }

  return (
    <fieldset className="asset-sidebar-fieldset">
      <legend>Font size</legend>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="asset-combobox-trigger"
            aria-label="Choose font size"
            aria-expanded={open}
            role="combobox"
            data-testid="font-size-combobox"
          >
            <span>
              <SizeIcon id={activeId} />
              <strong>{exactOption?.label ?? "Custom"}</strong>
              <small>{normalizedValue}px</small>
            </span>
            <ChevronsUpDown aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={10}
          className="asset-combobox-popover"
        >
          <div className="asset-combobox-panel">
            <div className="asset-combobox-list" role="listbox" aria-label="Font size">
              {FONT_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={normalizedValue === option.value}
                  className={normalizedValue === option.value ? "is-selected" : undefined}
                  title={option.label}
                  onClick={() => {
                    onChange(option.value)
                    setCustomValue(String(option.value))
                    setOpen(false)
                  }}
                >
                  <span>
                    <SizeIcon id={option.id} />
                    <strong>{option.label}</strong>
                    <small>{option.value}px</small>
                  </span>
                  {normalizedValue === option.value ? <Check aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
            <form
              className="asset-combobox-custom-row"
              onSubmit={(event) => {
                event.preventDefault()
                applyCustomValue()
              }}
            >
              <label>
                Custom
                <input
                  type="number"
                  min="16"
                  max="320"
                  step="1"
                  value={customValue}
                  onChange={(event) => setCustomValue(event.currentTarget.value)}
                  onBlur={() => setCustomValue(String(clampFontSize(Number(customValue))))}
                />
              </label>
              <button type="submit">Apply</button>
            </form>
          </div>
        </PopoverContent>
      </Popover>
    </fieldset>
  )
}
