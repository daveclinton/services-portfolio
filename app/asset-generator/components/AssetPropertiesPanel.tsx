'use client'

type AssetPropertiesPanelProps = {
  opacity: number
  strokeWidth: number
  showStrokeWidth: boolean
  onOpacityChange: (opacity: number) => void
  onStrokeWidthChange: (strokeWidth: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function AssetPropertiesPanel({
  opacity,
  strokeWidth,
  showStrokeWidth,
  onOpacityChange,
  onStrokeWidthChange,
}: AssetPropertiesPanelProps) {
  const normalizedOpacity = clamp(Math.round(opacity), 0, 100)
  const normalizedStrokeWidth = clamp(Math.round(strokeWidth), 0, 32)

  return (
    <section className="asset-excalidraw-sidebar-section asset-properties-panel">
      <span>Properties</span>

      <label className="asset-property-row">
        <strong>Opacity</strong>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={normalizedOpacity}
          onChange={(event) => onOpacityChange(Number(event.currentTarget.value))}
          aria-label="Selected element opacity"
        />
        <output>{normalizedOpacity}%</output>
      </label>

      {showStrokeWidth ? (
        <label className="asset-property-row">
          <strong>Stroke</strong>
          <input
            type="range"
            min="0"
            max="32"
            step="1"
            value={normalizedStrokeWidth}
            onChange={(event) => onStrokeWidthChange(Number(event.currentTarget.value))}
            aria-label="Selected element stroke width"
          />
          <output>{normalizedStrokeWidth}px</output>
        </label>
      ) : null}
    </section>
  )
}
