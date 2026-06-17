import { useEffect, useState } from 'react'
import type { Ref } from 'react'
import { colorSwatches } from './constants'
import { normalizeHexColor } from './utils'

export function ColorSwatchPicker({
  label,
  value,
  isOpen,
  indexLabel,
  containerRef,
  onToggle,
  onChange,
}: {
  label: string
  value: string
  isOpen: boolean
  indexLabel?: string
  containerRef?: Ref<HTMLDivElement>
  onToggle: () => void
  onChange: (color: string) => void
}) {
  const [draft, setDraft] = useState(value.toUpperCase())

  useEffect(() => {
    setDraft(value.toUpperCase())
  }, [value])

  const commitDraft = () => {
    const nextColor = normalizeHexColor(draft, value)
    setDraft(nextColor.toUpperCase())
    onChange(nextColor)
  }

  return (
    <div className="asset-generator-color-picker" ref={containerRef}>
      <button
        type="button"
        className="asset-generator-color-trigger"
        aria-label={`${label} color`}
        aria-expanded={isOpen}
        onClick={onToggle}
        title={`${label} color`}
      >
        <span>{label}</span>
        <i style={{ backgroundColor: value }} aria-hidden="true" />
        {indexLabel ? (
          <span className="ToolIndexIndicator" aria-hidden="true">
            {indexLabel}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="asset-generator-color-popover" role="dialog" aria-label={`${label} color picker`}>
          <div className="asset-generator-color-preview" style={{ backgroundColor: value }}>
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
                onClick={() => onChange(color)}
              />
            ))}
          </div>

          <div className="asset-generator-color-fields">
            <label>
              <span style={{ backgroundColor: value }} aria-hidden="true" />
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
            <input value="100%" readOnly aria-label={`${label} opacity`} />
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
}: {
  title: string
  platform: 'ios' | 'android'
  canvasRef: Ref<HTMLCanvasElement>
}) {
  return (
    <article className="asset-generator-phone">
      <div className={`asset-generator-phone-frame asset-generator-phone-frame-${platform}`}>
        <div className="asset-generator-phone-island" />
        <div className="asset-generator-phone-screen">
          <canvas ref={canvasRef} />
        </div>
      </div>
      <strong>{title} preview</strong>
    </article>
  )
}
