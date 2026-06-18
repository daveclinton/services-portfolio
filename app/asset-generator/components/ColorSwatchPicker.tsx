import type { CSSProperties, Ref } from 'react'
import { getColorWithOpacity } from '../utils/'

export function ColorSwatchPicker({
  label,
  value,
  isOpen,
  topPicks,
  containerRef,
  triggerRef,
  opacity = 100,
  disabled = false,
  onToggle,
  onChange,
}: {
  label: string
  value: string
  isOpen: boolean
  topPicks: readonly string[]
  containerRef?: Ref<HTMLDivElement>
  triggerRef?: Ref<HTMLButtonElement>
  opacity?: number
  disabled?: boolean
  onToggle: () => void
  onChange: (color: string) => void
}) {
  const previewColor = getColorWithOpacity(value, opacity / 100)
  const isTransparent = value === 'transparent'

  return (
    <div className="color-picker-row" ref={containerRef}>
      <span className="color-picker-row__label">{label}</span>
      <div
        className="color-picker-container"
        role="group"
        aria-label={`${label} color`}
      >
        <div className="color-picker__top-picks">
          {topPicks.map((color) => {
            const pickTransparent = color === 'transparent'
            return (
              <button
                key={color}
                type="button"
                className={`color-picker__button ${
                  color.toLowerCase() === value.toLowerCase() ? 'active' : ''
                } ${pickTransparent ? 'is-transparent' : ''}`}
                style={
                  pickTransparent ? undefined : ({ '--swatch-color': color } as CSSProperties)
                }
                aria-label={color}
                title={color}
                disabled={disabled}
                onClick={() => onChange(color)}
              />
            )
          })}
        </div>

        <div className="ButtonSeparator" aria-hidden="true" />

        <button
          ref={triggerRef}
          type="button"
          className={`color-picker__button color-picker__button--trigger ${
            isOpen ? 'active' : ''
          } ${isTransparent ? 'is-transparent' : ''}`}
          style={isTransparent ? undefined : ({ '--swatch-color': previewColor } as CSSProperties)}
          aria-label={`Open ${label} color picker`}
          aria-expanded={isOpen}
          disabled={disabled}
          data-openpopup={label}
          title={`${label} color`}
          onClick={onToggle}
        />
      </div>
    </div>
  )
}