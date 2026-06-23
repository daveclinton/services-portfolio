"use client"

import { useMemo, useRef } from "react"
import { Pipette } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DEFAULT_COLOR_PALETTE,
  DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX,
  DEFAULT_ELEMENT_STROKE_COLOR_INDEX,
  getColorNameAndShadeFromColor,
  getDefaultTopPicks,
  getMostUsedCustomColors,
  type AssetColorPickerType,
} from "../lib/element/colors"
import type { AssetElement } from "../lib/element/types"

const colorPickerHotkeyBindings = [
  "q",
  "w",
  "e",
  "r",
  "t",
  "a",
  "s",
  "d",
  "f",
  "g",
  "z",
  "x",
  "c",
  "v",
  "b",
]

type AssetColorPickerProps = {
  label: string
  value: string
  type: AssetColorPickerType
  elements: readonly AssetElement[]
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
      title={color}
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
  type,
  elements,
  onChange,
}: AssetColorPickerProps) {
  const nativeColorInputRef = useRef<HTMLInputElement>(null)
  const isTransparent = value === "transparent"
  const hexValue = isTransparent ? "ffffff" : value.replace("#", "").slice(0, 6)
  const topPicks = getDefaultTopPicks(type)
  const customColors = useMemo(() => {
    if (type === "canvasBackground") {
      return []
    }

    return getMostUsedCustomColors(elements, type)
  }, [elements, type])
  const colorObj = getColorNameAndShadeFromColor({ color: value })
  const activeShade =
    colorObj?.shade ??
    (type === "elementBackground"
      ? DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX
      : DEFAULT_ELEMENT_STROKE_COLOR_INDEX)
  const baseColors = Object.entries(DEFAULT_COLOR_PALETTE).map(([colorName, colorValue]) => ({
    colorName,
    color: Array.isArray(colorValue) ? colorValue[activeShade] : colorValue,
  }))
  const colorFamily = colorObj ? DEFAULT_COLOR_PALETTE[colorObj.colorName] : null
  const shadeColors: readonly string[] = Array.isArray(colorFamily) ? colorFamily : []

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
        <div className="asset-color-picker-top-picks" role="group" aria-label="Top picks">
          {topPicks.map((color) => (
            <ColorButton
              key={color}
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
              className="asset-color-picker-swatch"
              data-active="true"
              data-transparent={isTransparent}
              style={{ backgroundColor: value }}
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
              {customColors.length > 0 ? (
                <section className="asset-color-picker-section">
                  <h3>Most used custom colors</h3>
                  <div className="asset-color-picker-grid">
                    {customColors.map((color, index) => (
                      <ColorButton
                        key={color}
                        color={color}
                        label={`${label} ${color}`}
                        active={normalizeColor(value) === normalizeColor(color)}
                        hotkey={`${index + 1}`}
                        onSelect={() => onChange(color)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="asset-color-picker-section">
                <h3>Colors</h3>
                <div className="asset-color-picker-grid">
                  {baseColors.map(({ colorName, color }, index) => (
                    <ColorButton
                      key={colorName}
                      color={color}
                      label={`${label} ${colorName}`}
                      active={colorObj?.colorName === colorName}
                      hotkey={colorPickerHotkeyBindings[index]}
                      onSelect={() => onChange(color)}
                    />
                  ))}
                </div>
              </section>

              <section className="asset-color-picker-section">
                <h3>Shades</h3>
                <div className="asset-color-picker-grid">
                  {shadeColors.length > 0 ? (
                    shadeColors.map((color, index) => (
                      <ColorButton
                        key={color}
                        color={color}
                        label={`${label} shade ${index + 1}`}
                        active={normalizeColor(value) === normalizeColor(color)}
                        hotkey={`${index + 1}`}
                        onSelect={() => onChange(color)}
                      />
                    ))
                  ) : (
                    <div className="asset-color-picker-empty-shades">No shades</div>
                  )}
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
