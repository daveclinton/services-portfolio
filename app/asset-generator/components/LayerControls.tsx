'use client'

import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp } from 'lucide-react'

type LayerControlsProps = {
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}

export function LayerControls({
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: LayerControlsProps) {
  return (
    <div className="asset-layer-controls">
      <span>Layers</span>
      <div className="asset-layer-controls-grid">
        <button type="button" aria-label="Bring forward" onClick={onBringForward}>
          <ArrowUp aria-hidden="true" />
        </button>
        <button type="button" aria-label="Send backward" onClick={onSendBackward}>
          <ArrowDown aria-hidden="true" />
        </button>
        <button type="button" aria-label="Bring to front" onClick={onBringToFront}>
          <ChevronsUp aria-hidden="true" />
        </button>
        <button type="button" aria-label="Send to back" onClick={onSendToBack}>
          <ChevronsDown aria-hidden="true" />
        </button>
      </div>
      <small>Use [ and ] as shortcuts.</small>
    </div>
  )
}