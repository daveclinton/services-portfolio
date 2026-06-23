"use client"

import { useMemo, useState } from "react"
import { Code2, PenLine, Search, Type, WholeWord } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ASSET_FONT_OPTIONS,
  getAssetFontOption,
  type AssetFontFamily,
  type AssetFontOption,
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

function FontButton({
  option,
  active,
  onSelect,
}: {
  option: AssetFontOption
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      title={option.label}
      className={active ? "is-active" : undefined}
      data-testid={`font-family-${option.id}`}
      onClick={onSelect}
    >
      <FontIcon id={option.id} />
    </button>
  )
}

export function AssetFontPicker({ value, onChange }: AssetFontPickerProps) {
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
      <div className="asset-font-picker-inline" role="group" aria-label="Font family">
        <div className="asset-font-picker-button-list">
          {ASSET_FONT_OPTIONS.map((option) => (
            <FontButton
              key={option.id}
              option={option}
              active={activeOption.id === option.id}
              onSelect={() => onChange(option.id)}
            />
          ))}
        </div>
        <div className="asset-font-picker-divider" aria-hidden="true" />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="asset-font-picker-trigger"
              data-font-family={activeOption.id}
              title="Show font picker"
              aria-label="Show font picker"
              data-testid="font-family-show-fonts"
            >
              <WholeWord aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={10}
            className="asset-font-picker-popover"
          >
            <div className="asset-font-picker-island">
              <label className="asset-font-picker-search">
                <Search aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  placeholder="Quick search"
                  aria-label="Quick search fonts"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="asset-font-picker-list" role="menu">
                <p>Available fonts</p>
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitem"
                    className={activeOption.id === option.id ? "is-selected" : undefined}
                    title={option.label}
                    onClick={() => onChange(option.id)}
                  >
                    <span>
                      <FontIcon id={option.id} />
                    </span>
                    <strong style={{ fontFamily: option.css }}>{option.label}</strong>
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </fieldset>
  )
}
