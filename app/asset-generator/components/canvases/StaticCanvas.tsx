'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getElementsOutsideSafeArea } from '../../lib/common/safeArea'
import { getCanvasCursor } from '../../lib/element/text'
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
  onPointerDown: (x: number, y: number, shiftKey?: boolean, altKey?: boolean) => void
  onPointerMove: (x: number, y: number, shiftKey?: boolean, altKey?: boolean) => void
  onPointerUp: (x: number, y: number, shiftKey?: boolean, altKey?: boolean) => void
  onContextMenu?: (x: number, y: number) => void
  onDoubleClick: (x: number, y: number) => void
  onTextCommit: (elementId: string, text: string, viaKeyboard?: boolean) => void
}

export function StaticCanvas({
  appState,
  elements,
  files,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu = () => {},
  onDoubleClick,
  onTextCommit,
}: StaticCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null)

  const editingElement = appState.editingElementId
    ? elements.find((element) => element.id === appState.editingElementId)
    : null

  const safeAreaViolationIds = useMemo(() => {
    const violations = getElementsOutsideSafeArea(elements)
    return Object.fromEntries(violations.map((element) => [element.id, true as const]))
  }, [elements])

  const cursor = useMemo(() => {
    if (!hoverPoint) {
      return getCanvasCursor(appState, elements, -1, -1)
    }

    return getCanvasCursor(appState, elements, hoverPoint.x, hoverPoint.y)
  }, [appState, elements, hoverPoint])

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
        selectionBox: appState.selectionBox,
        editingElementId: appState.editingElementId,
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
        style={{ cursor }}
        onPointerDown={(event) => {
          if (!canvasRef.current) return
          if (event.button !== 0) return

          if (appState.editingElementId) {
            const active = document.activeElement
            if (active instanceof HTMLElement) {
              active.blur()
            }
            return
          }

          isDrawingRef.current = true
          canvasRef.current.setPointerCapture(event.pointerId)
          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          onPointerDown(point.x, point.y, event.shiftKey, event.altKey)
        }}
        onPointerMove={(event) => {
          if (!canvasRef.current) return

          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          setHoverPoint(point)

          if (!isDrawingRef.current) return
          onPointerMove(point.x, point.y, event.shiftKey, event.altKey)
        }}
        onPointerUp={(event) => {
          if (!canvasRef.current) return
          isDrawingRef.current = false
          canvasRef.current.releasePointerCapture(event.pointerId)
          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          onPointerUp(point.x, point.y, event.shiftKey, event.altKey)
        }}
        onContextMenu={(event) => {
          if (!canvasRef.current) return
          const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
          onContextMenu(point.x, point.y)
        }}
        onPointerLeave={() => {
          setHoverPoint(null)
        }}
        onDoubleClick={(event) => {
          if (!canvasRef.current || appState.editingElementId) return
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
          onCommit={(text, viaKeyboard) => onTextCommit(editingElement.id, text, viaKeyboard)}
        />
      ) : null}
    </div>
  )
}
