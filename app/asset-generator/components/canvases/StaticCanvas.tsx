'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getElementsOutsideSafeArea } from '../../lib/common/safeArea'
import {
  TOUCH_DOUBLE_TAP_DISTANCE,
  TOUCH_DOUBLE_TAP_TIMEOUT,
} from '../../lib/common/constants'
import { getCanvasCursor } from '../../lib/element/text'
import { getCanvasPoint } from '../../lib/editor/useEditor'
import { preloadImages, subscribeToImageCache } from '../../lib/scene/imageCache'
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
  onPointerUp: (
    x: number,
    y: number,
    shiftKey?: boolean,
    altKey?: boolean,
    pointerType?: string,
    isTouchDoubleTap?: boolean,
  ) => void
  onContextMenu?: (x: number, y: number) => void
  onDoubleClick: (x: number, y: number) => void
  onTextChange: (elementId: string, text: string) => void
  onTextCommit: (elementId: string, text: string, viaKeyboard?: boolean) => void
  onImportImage?: (file: File, center?: { x: number; y: number }) => void
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
  onTextChange,
  onTextCommit,
  onImportImage,
}: StaticCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null)
  const [imageVersion, setImageVersion] = useState(0)

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
    return subscribeToImageCache(() => setImageVersion((version) => version + 1))
  }, [])

  useEffect(() => {
    if (!onImportImage) return

    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile()

      if (!file) return
      event.preventDefault()
      onImportImage(file)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onImportImage])

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
  }, [appState, elements, files, safeAreaViolationIds, imageVersion])

  return (
    <div
      className="asset-excalidraw-canvas"
      aria-label="1024 by 1024 app icon canvas"
      onDragOver={(event) => {
        if (!onImportImage) return
        if (!Array.from(event.dataTransfer.types).includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(event) => {
        if (!onImportImage || !canvasRef.current) return
        const file = Array.from(event.dataTransfer.files).find((item) =>
          item.type.startsWith('image/'),
        )
        if (!file) return
        event.preventDefault()
        const point = getCanvasPoint(canvasRef.current, event.clientX, event.clientY)
        onImportImage(file, point)
      }}
    >
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
          let isTouchDoubleTap = false
          if (event.pointerType === 'touch' && !appState.editingElementId) {
            const now = Date.now()
            const last = lastTapRef.current
            if (
              last &&
              now - last.time <= TOUCH_DOUBLE_TAP_TIMEOUT &&
              Math.hypot(point.x - last.x, point.y - last.y) <=
                TOUCH_DOUBLE_TAP_DISTANCE
            ) {
              isTouchDoubleTap = true
              lastTapRef.current = null
            } else {
              lastTapRef.current = { time: now, x: point.x, y: point.y }
            }
          }

          onPointerUp(
            point.x,
            point.y,
            event.shiftKey,
            event.altKey,
            event.pointerType,
            isTouchDoubleTap,
          )
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
          onChange={(text) => onTextChange(editingElement.id, text)}
          onCommit={(text, viaKeyboard) => onTextCommit(editingElement.id, text, viaKeyboard)}
        />
      ) : null}
    </div>
  )
}
