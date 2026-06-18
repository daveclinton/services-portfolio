'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { Pencil } from 'lucide-react'
import {
  getColorNameAndShade,
  getShadesForColor,
  getTopPicksForTarget,
  PALETTE_GRID_ORDER,
  getPaletteColor,
  pushRecentColor,
  readRecentColors,
  type PaletteColorName,
} from '../lib/color-palette'
import { normalizeHexColor } from '../utils/'

type ColorPickerTarget = 'bg' | 'fg' | 'shapeStroke' | 'shapeFill' | 'splash'

type ColorPickerSidePanelProps = {
  target: ColorPickerTarget
  label: string
  value: string
  opacity?: number
  isOpen: boolean
  isMobile: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef?: RefObject<HTMLDivElement | null>
  onClose: () => void
  onChange: (color: string) => void
  onOpacityChange?: (opacity: number) => void
}

const PALETTE_LABELS: Record<PaletteColorName, string> = {
  transparent: 'None',
  white: 'White',
  gray: 'Gray',
  black: 'Black',
  bronze: 'Bronze',
  cyan: 'Cyan',
  blue: 'Blue',
  violet: 'Violet',
  grape: 'Grape',
  pink: 'Pink',
  green: 'Green',
  teal: 'Teal',
  yellow: 'Yellow',
  orange: 'Orange',
  red: 'Red',
}

export function ColorPickerSidePanel({
  target,
  label,
  value,
  opacity = 100,
  isOpen,
  isMobile,
  anchorRef,
  panelRef,
  onClose,
  onChange,
  onOpacityChange,
}: ColorPickerSidePanelProps) {
  const [draft, setDraft] = useState(value.toUpperCase())
  const [opacityDraft, setOpacityDraft] = useState(`${opacity}%`)
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const colorMatch = useMemo(() => getColorNameAndShade(value), [value])
  const activeShade = colorMatch?.shade ?? 2
  const shades = useMemo(() => getShadesForColor(value) ?? getShadesForColor(getPaletteColor('yellow', 2)), [value])

  useEffect(() => {
    setDraft(value.toUpperCase())
  }, [value])

  useEffect(() => {
    setOpacityDraft(`${opacity}%`)
  }, [opacity])

  useEffect(() => {
    if (isOpen) setRecentColors(readRecentColors())
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || isMobile || !anchorRef.current) return

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({
        top: Math.max(12, rect.top),
        left: rect.right + 12,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, isMobile, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const applyColor = (color: string) => {
    onChange(color)
    pushRecentColor(color)
    setRecentColors(readRecentColors())
  }

  const commitDraft = () => {
    const nextColor = normalizeHexColor(draft, value)
    setDraft(nextColor.toUpperCase())
    applyColor(nextColor)
  }

  const commitOpacityDraft = () => {
    const parsed = Number.parseInt(opacityDraft.replace(/[^0-9]/g, ''), 10)
    const nextOpacity = Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : opacity))
    setOpacityDraft(`${nextOpacity}%`)
    onOpacityChange?.(nextOpacity)
  }

  const panel = (
    <div
      ref={panelRef}
      className={`color-picker-side-panel Island ${isMobile ? 'color-picker-side-panel--mobile' : ''}`}
      role="dialog"
      aria-label={`${label} color picker`}
      style={isMobile ? undefined : { top: position.top, left: position.left }}
    >
      {recentColors.length ? (
        <section className="color-picker-side-panel__section">
          <h3 className="color-picker__heading">Most used custom colors</h3>
          <div className="color-picker-content--default color-picker-content--recent">
            {recentColors.map((color, index) => (
              <button
                key={`${color}-${index}`}
                type="button"
                className={`color-picker__button color-picker__button--large has-outline ${
                  color.toLowerCase() === value.toLowerCase() ? 'active' : ''
                }`}
                style={{ '--swatch-color': color } as CSSProperties}
                aria-label={color}
                onClick={() => applyColor(color)}
              >
                <span className="color-picker__button-outline" />
                <span className="color-picker__button-index">{index + 1}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="color-picker-side-panel__section">
        <h3 className="color-picker__heading">Colors</h3>
        <div className="color-picker-content--default color-picker-content--grid">
          {PALETTE_GRID_ORDER.map((name) => {
            const entryShade = colorMatch?.name === name ? activeShade : 2
            const swatchColor = getPaletteColor(name, entryShade)
            const isTransparent = swatchColor === 'transparent'
            return (
              <button
                key={name}
                type="button"
                className={`color-picker__button color-picker__button--large has-outline ${
                  colorMatch?.name === name ? 'active' : ''
                } ${isTransparent ? 'is-transparent' : ''}`}
                style={{ '--swatch-color': isTransparent ? undefined : swatchColor } as CSSProperties}
                title={PALETTE_LABELS[name]}
                aria-label={PALETTE_LABELS[name]}
                onClick={() => applyColor(swatchColor)}
              >
                <span className="color-picker__button-outline" />
                <span className="color-picker__button-key">{name.slice(0, 1)}</span>
              </button>
            )
          })}
        </div>
      </section>

      {shades ? (
        <section className="color-picker-side-panel__section">
          <h3 className="color-picker__heading">Shades</h3>
          <div className="color-picker-content--default color-picker-content--shades">
            {shades.map((shadeColor, index) => (
              <button
                key={`${shadeColor}-${index}`}
                type="button"
                className={`color-picker__button color-picker__button--large has-outline ${
                  shadeColor.toLowerCase() === value.toLowerCase() ? 'active' : ''
                }`}
                style={{ '--swatch-color': shadeColor } as CSSProperties}
                aria-label={`Shade ${index + 1}`}
                onClick={() => applyColor(shadeColor)}
              >
                <span className="color-picker__button-outline" />
                <span className="color-picker__button-index">{String(index + 1).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="color-picker-side-panel__section">
        <h3 className="color-picker__heading">Hex code</h3>
        <div className="color-picker__input-label">
          <span className="color-picker__input-hash">#</span>
          <input
            className="color-picker-input"
            value={draft.replace(/^#/, '')}
            spellCheck={false}
            aria-label={`${label} hex color`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitDraft()
                event.currentTarget.blur()
              }
            }}
          />
          <Pencil aria-hidden="true" className="color-picker__input-icon" />
        </div>
      </section>

      {onOpacityChange ? (
        <section className="color-picker-side-panel__section color-picker-side-panel__opacity">
          <h3 className="color-picker__heading">Opacity</h3>
          <div className="opacity-slider-container">
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              className="opacity-slider"
              aria-label={`${label} opacity`}
              onChange={(event) => onOpacityChange(Number.parseInt(event.target.value, 10))}
            />
            <input
              className="color-picker-opacity-input"
              value={opacityDraft}
              aria-label={`${label} opacity percent`}
              onChange={(event) => setOpacityDraft(event.target.value)}
              onBlur={commitOpacityDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitOpacityDraft()
                  event.currentTarget.blur()
                }
              }}
            />
          </div>
        </section>
      ) : null}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <div className="color-picker-side-panel__backdrop" onClick={onClose} aria-hidden="true" />
        {panel}
      </>
    )
  }

  return panel
}

export function getColorPickerLabel(target: ColorPickerTarget) {
  if (target === 'bg') return 'Background'
  if (target === 'fg') return 'Text'
  if (target === 'splash') return 'Splash'
  if (target === 'shapeFill') return 'Fill'
  return 'Stroke'
}

export { getTopPicksForTarget }
export type { ColorPickerTarget }