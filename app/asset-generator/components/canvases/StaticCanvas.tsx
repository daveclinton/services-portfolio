'use client'

import { useEffect, useMemo, useRef } from 'react'
import { getElementsOutsideSafeArea } from '../../lib/common/safeArea'
import { getCanvasPoint } from '../../lib/editor/useEditor'
import { preloadImages } from '../../lib/scene/imageCache'
import { renderStaticScene } from '../../lib/scene/staticScene'
import { TextEditor } from '../TextEditor'
import type { AppState, AssetFile } from '../../lib/editor/types'
import type { AssetElement } from '../../lib/element/types'

type StaticCanvasProps = {
  appState: AppState
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
  onPointerDown: (x: number, y: number, shiftKey?: boolean) => void
  onPointerMove: (x: number, y: number, shiftKey?: boolean) => void
  onPointerUp: (x: number, y: number, shiftKey?: boolean) => void
  onDoubleClick: (x: number, y: number) => void
  onTextCommit: (elementId: string, text: string) => void
  onTextCancel: () => void
}

export function StaticCanvas({
  appState,
  elements,
  files,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onTextCommit,
  onTextCancel,
}: StaticCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)

  const editingElement = appState.editingElementId
    ? elements.find((element) => element.id === appState.editingElementId)
    : null

  const safeAreaViolationIds = useMemo(() => {
    const violations = getElementsOutsideSafeArea(elements)
    return Object.fromEntries(violations.map((element) => [element.id, true as const]))
  }, [elements])

  useEffect(() => {
    preloadImages(files)
  }, [files])

  useEffect(() => {
    const render = () => {
      if (!canvasRef.current) return

      renderStaticScene({
        canvas: canvasRef.current,
        elements,
        files,
        backgroundColor: appState.viewBackgroundColor,
        selectedElementIds: appState.selectedElementIds,
        draftElement: appState.newElement,
        showGuides: true,
        safeAreaViolationIds,
      })
    }

    render()
    window.addEventListener('resize', render)
    return () => window.removeEventListener('resize', render)
  }, [appState, elements, files, safeAreaViolationIds])

  return (
    <div className="asset-excalidraw-canvas" aria-label="1024 by 1024 app icon canvas">
      <canvas
        ref={canvasRef}
        className="asset-excalidraw-canvas-layer asset-excalidraw-canvas-layer--interactive"
        aria-label="Interactive app icon canvas"
        onPointerDown={(event) => {
          if (!canvasRef.current) return
          isDrawingRef.current = true
          canvasRef.current.setPointerCapture(event.pointerId)
          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          onPointerDown(point.x, point.y, event.shiftKey)
        }}
        onPointerMove={(event) => {
          if (!canvasRef.current || !isDrawingRef.current) return
          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          onPointerMove(point.x, point.y, event.shiftKey)
        }}
        onPointerUp={(event) => {
          if (!canvasRef.current) return
          isDrawingRef.current = false
          canvasRef.current.releasePointerCapture(event.pointerId)
          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          onPointerUp(point.x, point.y, event.shiftKey)
        }}
        onDoubleClick={(event) => {
          if (!canvasRef.current) return
          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          onDoubleClick(point.x, point.y)
        }}
        onPointerCancel={() => {
          isDrawingRef.current = false
        }}
      />

      {editingElement?.type === 'text' ? (
        <TextEditor
          element={editingElement}
          onCommit={(text) => onTextCommit(editingElement.id, text)}
          onCancel={onTextCancel}
        />
      ) : null}
    </div>
  )
}