"use client"

import { useMemo, useRef } from "react"
import { Pipette } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const paletteColors = [
  "#1b1b1f",
  "#343a40",
  "#868e96",
  "#c5c5d0",
  "#ffffff",
  "#e03131",
  "#f08c00",
  "#f59f00",
  "#37b24d",
  "#1971c2",
  "#6965db",
  "#9c36b5",
]

const shadeColors = ["#f6f6f9", "#f1f0ff", "#e0dfff", "#c7c4ff", "#6965db", "#4440bf"]
const hotkeys = ["1", "2", "3", "4", "5", "q", "w", "e", "r", "a", "s", "d"]

type AssetColorPickerProps = {
  label: string
  value: string
  colors: string[]
  allowTransparent?: boolean
  onChange: (color: string) => void
}

function normalizeColor(color: string) {
  return color.toLowerCase()
}

function getReadableLabelColor(color: string) {
  if (color === "transparent") {
    return "#1b1b1f"
  }

  const hex = color.replace("#", "")
  if (hex.length !== 6) {
    return "#1b1b1f"
  }

  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.62 ? "#1b1b1f" : "#ffffff"
}

function ColorButton({
  color,
  label,
  active,
  hotkey,
  onSelect,
}: {
  color: string
  label: string
  active: boolean
  hotkey?: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="asset-color-picker-swatch"
      data-active={active}
      data-transparent={color === "transparent"}
      style={{ backgroundColor: color === "transparent" ? "#ffffff" : color }}
      aria-label={label}
      onClick={onSelect}
    >
      <span className="asset-color-picker-button-outline" aria-hidden="true" />
      {hotkey ? (
        <span style={{ color: getReadableLabelColor(color) }} aria-hidden="true">
          {hotkey}
        </span>
      ) : null}
    </button>
  )
}

export function AssetColorPicker({
  label,
  value,
  colors,
  allowTransparent = false,
  onChange,
}: AssetColorPickerProps) {
  const nativeColorInputRef = useRef<HTMLInputElement>(null)
  const isTransparent = value === "transparent"
  const hexValue = isTransparent ? "ffffff" : value.replace("#", "").slice(0, 6)
  const mostUsedColors = useMemo(() => {
    const colorSet = new Set([value, ...colors])
    if (!allowTransparent) {
      colorSet.delete("transparent")
    }
    return Array.from(colorSet).slice(0, 3)
  }, [allowTransparent, colors, value])

  const updateHex = (rawValue: string) => {
    const sanitized = rawValue.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)
    if (sanitized.length === 6) {
      onChange(`#${sanitized}`)
    }
  }

  return (
    <fieldset className="asset-sidebar-fieldset">
      <legend>{label}</legend>
      <div className="asset-color-picker-inline" role="group" aria-label={`${label} colors`}>
        {/* Changed to asset-color-picker-grid for identical layout, spacing & design as popover */}
        <div className="asset-color-picker-grid" role="group" aria-label="Most used colors">
          {mostUsedColors.map((color, index) => (
            <ColorButton
              key={`${color}-${index}`}
              color={color}
              label={`${label} ${color}`}
              active={normalizeColor(value) === normalizeColor(color)}
              onSelect={() => onChange(color)}
            />
          ))}
        </div>

        <div className="asset-color-picker-inline-divider" aria-hidden="true" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="asset-color-picker-swatch asset-color-picker-swatch--active-trigger"
              data-active="true"
              data-transparent={isTransparent}
              style={{ backgroundColor: isTransparent ? "#ffffff" : value }}
              aria-label={`Show ${label.toLowerCase()} color picker`}
              title={`Show ${label.toLowerCase()} color picker`}
            >
              <span className="asset-color-picker-button-outline" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="center"
            sideOffset={10}
            className="asset-color-picker-popover"
          >
            <div className="asset-color-picker-island">
              <section className="asset-color-picker-section">
                <h3>Most used</h3>
                <div className="asset-color-picker-grid">
                  {mostUsedColors.map((color, index) => (
                    <ColorButton
                      key={`${color}-${index}`}
                      color={color}
                      label={`${label} ${color}`}
                      active={normalizeColor(value) === normalizeColor(color)}
                      hotkey={index < 5 ? `${index + 1}` : undefined}
                      onSelect={() => onChange(color)}
                    />
                  ))}
                </div>
              </section>

              <section className="asset-color-picker-section">
                <h3>Colors</h3>
                <div className="asset-color-picker-grid">
                  {allowTransparent ? (
                    <ColorButton
                      color="transparent"
                      label={`${label} transparent`}
                      active={value === "transparent"}
                      hotkey="0"
                      onSelect={() => onChange("transparent")}
                    />
                  ) : null}
                  {paletteColors.map((color, index) => (
                    <ColorButton
                      key={color}
                      color={color}
                      label={`${label} ${color}`}
                      active={normalizeColor(value) === normalizeColor(color)}
                      hotkey={hotkeys[index]}
                      onSelect={() => onChange(color)}
                    />
                  ))}
                </div>
              </section>

              <section className="asset-color-picker-section">
                <h3>Shades</h3>
                <div className="asset-color-picker-grid">
                  {shadeColors.map((color) => (
                    <ColorButton
                      key={color}
                      color={color}
                      label={`${label} ${color}`}
                      active={normalizeColor(value) === normalizeColor(color)}
                      onSelect={() => onChange(color)}
                    />
                  ))}
                </div>
              </section>

              <div className="asset-color-picker-hex-row">
                <span>#</span>
                <input
                  value={hexValue}
                  maxLength={6}
                  aria-label={`${label} hex color`}
                  onChange={(event) => updateHex(event.target.value)}
                />
                <div aria-hidden="true" />
                <button
                  type="button"
                  aria-label={`Choose custom ${label.toLowerCase()} color`}
                  onClick={() => nativeColorInputRef.current?.click()}
                >
                  <Pipette aria-hidden="true" />
                </button>
                <input
                  ref={nativeColorInputRef}
                  type="color"
                  value={isTransparent ? "#ffffff" : value}
                  hidden
                  onChange={(event) => onChange(event.target.value)}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </fieldset>
  )
}