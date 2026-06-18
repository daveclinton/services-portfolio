'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, RefObject, Ref } from 'react'
import { Pencil, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
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
type ColorPickerPosition = { top: number; left: number; side: 'left' | 'right' }

type ColorPickerSidePanelProps = {
  target: ColorPickerTarget
  label: string
  value: string
  opacity?: number
  isOpen: boolean
  isMobile: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef?: Ref<HTMLDivElement>
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
  const [position, setPosition] = useState<ColorPickerPosition>({ top: 0, left: 0, side: 'right' })

  const colorMatch = useMemo(() => getColorNameAndShade(value), [value])
  const activeShade = colorMatch?.shade ?? 2
  const shades = useMemo(() => getShadesForColor(value) ?? getShadesForColor(getPaletteColor('yellow', 2)), [value])
  const paletteColors = useMemo(
    () => PALETTE_GRID_ORDER.filter((name) => !(name === 'transparent' && (target === 'bg' || target === 'splash'))),
    [target],
  )

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
      const gap = 10
      const viewportPadding = 12
      const panelWidth = Math.min(320, window.innerWidth - viewportPadding * 2)
      const spaceRight = window.innerWidth - rect.right - viewportPadding
      const spaceLeft = rect.left - viewportPadding
      const side = spaceRight >= panelWidth + gap || spaceRight >= spaceLeft ? 'right' : 'left'
      const left =
        side === 'right'
          ? Math.min(rect.right + gap, window.innerWidth - panelWidth - viewportPadding)
          : Math.max(viewportPadding, rect.left - panelWidth - gap)

      setPosition({
        top: Math.max(viewportPadding, Math.min(rect.top, window.innerHeight - viewportPadding)),
        left,
        side,
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
      className={`color-picker-side-panel ${isMobile ? 'color-picker-side-panel--mobile' : ''}`}
      data-side={position.side}
      role="dialog"
      aria-label={`${label} color picker`}
      style={isMobile ? undefined : { top: position.top, left: position.left }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="color-picker-side-panel__header">
        <div className="color-picker-side-panel__title-row">
          <span
            className={`color-picker-side-panel__preview ${value === 'transparent' ? 'is-transparent' : ''}`}
            style={{ '--swatch-color': value === 'transparent' ? undefined : value } as CSSProperties}
            aria-hidden="true"
          />
          <h2 className="color-picker-side-panel__title">{label}</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="color-picker-side-panel__close"
          aria-label="Close color picker"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </header>

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

      {recentColors.length ? <Separator /> : null}

      <section className="color-picker-side-panel__section">
        <h3 className="color-picker__heading">Colors</h3>
        <div className="color-picker-content--default color-picker-content--grid">
          {paletteColors.map((name) => {
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
        <>
          <Separator />
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
        </>
      ) : null}

      <Separator />

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
        <>
          <Separator />
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
        </>
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
