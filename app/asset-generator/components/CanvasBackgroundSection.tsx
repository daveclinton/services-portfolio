import type { Ref } from 'react'
import { getTopPicksForTarget } from '../lib/color-palette'
import { ColorSwatchPicker } from './ColorSwatchPicker'

/** Excalidraw: canvas background is always reachable — not gated on selection. */
export function CanvasBackgroundSection({
  backgroundColor,
  backgroundOpacityValue,
  isOpen,
  isSelected = false,
  containerRef,
  triggerRef,
  onToggle,
  onColorChange,
  onOpacityChange,
}: {
  backgroundColor: string
  backgroundOpacityValue: number
  isOpen: boolean
  isSelected?: boolean
  containerRef?: Ref<HTMLDivElement>
  triggerRef?: Ref<HTMLButtonElement>
  onToggle: () => void
  onColorChange: (color: string) => void
  onOpacityChange: (opacity: number) => void
}) {
  return (
    <section
      className={`canvas-background-section${isSelected ? ' is-selected' : ''}`}
      aria-label="Canvas background"
      aria-current={isSelected ? 'true' : undefined}
    >
      <h3 className="canvas-background-section__label">Canvas background</h3>
      <ColorSwatchPicker
        label="Background"
        value={backgroundColor}
        isOpen={isOpen}
        topPicks={getTopPicksForTarget('bg')}
        containerRef={containerRef}
        triggerRef={triggerRef}
        opacity={backgroundOpacityValue}
        onToggle={onToggle}
        onChange={onColorChange}
      />
      <div className="text-properties-opacity canvas-background-section__opacity">
        <label>
          <span className="opacity-label">Opacity</span>
          <div className="opacity-slider-container">
            <input
              type="range"
              min="0"
              max="100"
              value={backgroundOpacityValue}
              className="opacity-slider"
              aria-label="Canvas background opacity"
              onChange={(event) => onOpacityChange(Number.parseInt(event.target.value, 10))}
            />
            <span className="opacity-value">{backgroundOpacityValue}%</span>
          </div>
        </label>
      </div>
    </section>
  )
}