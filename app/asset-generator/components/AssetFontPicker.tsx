"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Code2, PenLine, Search, Type } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ASSET_FONT_OPTIONS,
  getAssetFontOption,
  type AssetFontFamily,
} from "../lib/element/fonts"

type AssetFontPickerProps = {
  value: string
  onChange: (fontFamily: AssetFontFamily) => void
}

function FontIcon({ id }: { id: AssetFontFamily }) {
  if (id === "hand-drawn") {
    return <PenLine aria-hidden="true" />
  }

  if (id === "code") {
    return <Code2 aria-hidden="true" />
  }

  return <Type aria-hidden="true" />
}

export function AssetFontPicker({ value, onChange }: AssetFontPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const activeOption = getAssetFontOption(value)
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return ASSET_FONT_OPTIONS
    }

    return ASSET_FONT_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    )
  }, [query])

  return (
    <fieldset className="asset-sidebar-fieldset">
      <legend>Font family</legend>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="asset-combobox-trigger"
            aria-label="Choose font family"
            aria-expanded={open}
            role="combobox"
            data-testid="font-family-combobox"
          >
            <span>
              <FontIcon id={activeOption.id} />
              <strong style={{ fontFamily: activeOption.css }}>{activeOption.label}</strong>
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
            <label className="asset-combobox-search">
              <Search aria-hidden="true" />
              <input
                type="text"
                value={query}
                placeholder="Search fonts"
                aria-label="Search fonts"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="asset-combobox-list" role="listbox" aria-label="Font family">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={activeOption.id === option.id}
                    className={activeOption.id === option.id ? "is-selected" : undefined}
                    title={option.label}
                    onClick={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}
                  >
                    <span>
                      <FontIcon id={option.id} />
                      <strong style={{ fontFamily: option.css }}>{option.label}</strong>
                    </span>
                    {activeOption.id === option.id ? <Check aria-hidden="true" /> : null}
                  </button>
                ))
              ) : (
                <p>No fonts found</p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </fieldset>
  )
}
