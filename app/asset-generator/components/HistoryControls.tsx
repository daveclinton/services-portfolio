'use client'

import { Redo2, Undo2 } from 'lucide-react'

type HistoryControlsProps = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function HistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: HistoryControlsProps) {
  return (
    <div className="asset-excalidraw-island asset-history-controls">
      <button
        type="button"
        className="asset-excalidraw-icon-button"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 aria-hidden="true" />
      </button>
      <button
        type="button"
        className="asset-excalidraw-icon-button"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <Redo2 aria-hidden="true" />
      </button>
    </div>
  )
}