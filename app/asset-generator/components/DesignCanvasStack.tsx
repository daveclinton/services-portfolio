'use client'

import type { DOMAttributes, Ref } from 'react'

type DesignCanvasStackProps = {
  staticCanvasRef: Ref<HTMLCanvasElement>
  interactiveCanvasRef: Ref<HTMLCanvasElement>
  interactiveClassName: string
  onPointerDown: Exclude<DOMAttributes<HTMLCanvasElement>['onPointerDown'], undefined>
  onPointerMove: Exclude<DOMAttributes<HTMLCanvasElement>['onPointerMove'], undefined>
  onPointerUp: Exclude<DOMAttributes<HTMLCanvasElement>['onPointerUp'], undefined>
  onPointerCancel: Exclude<DOMAttributes<HTMLCanvasElement>['onPointerCancel'], undefined>
  onDoubleClick: Exclude<DOMAttributes<HTMLCanvasElement>['onDoubleClick'], undefined>
}

/** Excalidraw-style stacked static + interactive canvases. */
export function DesignCanvasStack({
  staticCanvasRef,
  interactiveCanvasRef,
  interactiveClassName,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
}: DesignCanvasStackProps) {
  return (
    <div className="asset-generator-canvas-wrapper">
      <canvas
        ref={staticCanvasRef}
        className="asset-generator-canvas static"
        aria-hidden="true"
        tabIndex={-1}
      />
      <canvas
        ref={interactiveCanvasRef}
        aria-label="Master design canvas"
        className={`asset-generator-canvas interactive ${interactiveClassName}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={onDoubleClick}
      />
    </div>
  )
}