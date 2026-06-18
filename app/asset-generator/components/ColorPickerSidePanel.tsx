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
type ColorPickerPlacement = 'bottom-start' | 'top-start'
type ColorPickerPosition = { top: number; left: number; placement: ColorPickerPlacement }

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
  const [position, setPosition] = useState<ColorPickerPosition>({
    top: 0,
    left: 0,
    placement: 'bottom-start',
  })

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
      const panelElement = panelRef && 'current' in panelRef ? panelRef.current : null
      const panelWidth = panelElement?.offsetWidth ?? Math.min(320, window.innerWidth - viewportPadding * 2)
      const panelHeight = panelElement?.offsetHeight ?? 360

      let placement: ColorPickerPlacement = 'bottom-start'
      let top = rect.bottom + gap

      if (top + panelHeight > window.innerHeight - viewportPadding) {
        const topAbove = rect.top - gap - panelHeight
        if (topAbove >= viewportPadding) {
          top = topAbove
          placement = 'top-start'
        } else {
          top = Math.max(
            viewportPadding,
            Math.min(top, window.innerHeight - panelHeight - viewportPadding),
          )
        }
      }

      let left = rect.left
      if (left + panelWidth > window.innerWidth - viewportPadding) {
        left = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding)
      }
      left = Math.max(viewportPadding, left)

      setPosition({ top, left, placement })
    }

    updatePosition()
    const frame = window.requestAnimationFrame(updatePosition)

    const panelElement = panelRef && 'current' in panelRef ? panelRef.current : null
    const resizeObserver =
      panelElement && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updatePosition)
        : null
    resizeObserver?.observe(panelElement as Element)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, isMobile, isOpen, panelRef])

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
      data-placement={position.placement}
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
                className={`color-picker__button color-picker__button--large ${
                  colorMatch?.name === name ? 'active' : ''
                } ${isTransparent ? 'is-transparent' : ''}`}
                style={{ '--swatch-color': isTransparent ? undefined : swatchColor } as CSSProperties}
                title={PALETTE_LABELS[name]}
                aria-label={PALETTE_LABELS[name]}
                onClick={() => applyColor(swatchColor)}
              >
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
                  className={`color-picker__button color-picker__button--large ${
                    shadeColor.toLowerCase() === value.toLowerCase() ? 'active' : ''
                  }`}
                  style={{ '--swatch-color': shadeColor } as CSSProperties}
                  aria-label={`Shade ${index + 1}`}
                  onClick={() => applyColor(shadeColor)}
                >
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
