"use client"

import { Bold, Italic, Type } from "lucide-react"
import {
  ASSET_FONT_STYLE_OPTIONS,
  getAssetFontStyleOption,
  type AssetFontStyle,
} from "../lib/element/fonts"

type AssetFontStylePickerProps = {
  value: string
  onChange: (fontStyle: AssetFontStyle) => void
}

function StyleIcon({ id }: { id: AssetFontStyle }) {
  if (id === "bold") {
    return <Bold aria-hidden="true" />
  }

  if (id === "italic") {
    return <Italic aria-hidden="true" />
  }

  if (id === "bold-italic") {
    return (
      <span className="asset-font-style-combo" aria-hidden="true">
        <Bold />
        <Italic />
      </span>
    )
  }

  return <Type aria-hidden="true" />
}

export function AssetFontStylePicker({ value, onChange }: AssetFontStylePickerProps) {
  const activeOption = getAssetFontStyleOption(value)

  return (
    <fieldset className="asset-sidebar-fieldset">
      <legend>Font style</legend>
      <div className="asset-font-style-list" role="radiogroup" aria-label="Font style">
        {ASSET_FONT_STYLE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={activeOption.id === option.id ? "is-active" : undefined}
            title={option.label}
          >
            <input
              type="radio"
              name="asset-font-style"
              checked={activeOption.id === option.id}
              data-testid={`fontStyle-${option.id}`}
              onChange={() => onChange(option.id)}
            />
            <StyleIcon id={option.id} />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
