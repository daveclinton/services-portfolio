import { useEffect, useState } from 'react'
import type { Ref } from 'react'
import { colorSwatches } from './constants'
import { getColorWithOpacity, normalizeHexColor } from './utils'

export function ColorSwatchPicker({
  label,
  value,
  isOpen,
  indexLabel,
  containerRef,
  opacity = 100,
  disabled = false,
  onToggle,
  onChange,
  onOpacityChange,
}: {
  label: string
  value: string
  isOpen: boolean
  indexLabel?: string
  containerRef?: Ref<HTMLDivElement>
  opacity?: number
  disabled?: boolean
  onToggle: () => void
  onChange: (color: string) => void
  onOpacityChange?: (opacity: number) => void
}) {
  const [draft, setDraft] = useState(value.toUpperCase())
  const [opacityDraft, setOpacityDraft] = useState(`${opacity}%`)
  const previewColor = getColorWithOpacity(value, opacity / 100)

  useEffect(() => {
    setDraft(value.toUpperCase())
  }, [value])

  useEffect(() => {
    setOpacityDraft(`${opacity}%`)
  }, [opacity])

  const commitDraft = () => {
    const nextColor = normalizeHexColor(draft, value)
    setDraft(nextColor.toUpperCase())
    onChange(nextColor)
  }

  const commitOpacityDraft = () => {
    const parsed = Number.parseInt(opacityDraft.replace(/[^0-9]/g, ''), 10)
    const nextOpacity = Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : opacity))
    setOpacityDraft(`${nextOpacity}%`)
    onOpacityChange?.(nextOpacity)
  }

  return (
    <div className="asset-generator-color-picker" ref={containerRef}>
      <button
        type="button"
        className="asset-generator-color-trigger"
        aria-label={`${label} color`}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={onToggle}
        title={`${label} color`}
      >
        <span>{label}</span>
        <i style={{ backgroundColor: previewColor }} aria-hidden="true" />
        {indexLabel ? (
          <span className="ToolIndexIndicator" aria-hidden="true">
            {indexLabel}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="asset-generator-color-popover" role="dialog" aria-label={`${label} color picker`}>
          <div className="asset-generator-color-preview" style={{ backgroundColor: previewColor }}>
            <span>{value.toUpperCase()}</span>
          </div>

          <div className="asset-generator-color-grid" aria-label="Color swatches">
            {colorSwatches.map((color) => (
              <button
                key={color}
                type="button"
                className={color.toLowerCase() === value.toLowerCase() ? 'is-active' : ''}
                style={{ backgroundColor: color }}
                aria-label={color}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onChange(color)
                }}
                onClick={() => onChange(color)}
              />
            ))}
          </div>

          <div className="asset-generator-color-fields">
            <label>
              <span style={{ backgroundColor: previewColor }} aria-hidden="true" />
              <input
                value={draft}
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
            </label>
            <input
              value={opacityDraft}
              aria-label={`${label} opacity`}
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
        </div>
      ) : null}
    </div>
  )
}

export function PhonePreview({
  title,
  platform,
  canvasRef,
  splashBackgroundColor,
}: {
  title: string
  platform: 'ios' | 'android'
  canvasRef: Ref<HTMLCanvasElement>
  splashBackgroundColor: string
}) {
  return (
    <article className="asset-generator-phone">
      <div className={`asset-generator-phone-frame asset-generator-phone-frame-${platform}`}>
        <div className="asset-generator-phone-island" />
        <div className="asset-generator-phone-screen" style={{ background: splashBackgroundColor }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
      <strong>{title} preview</strong>
    </article>
  )
}
