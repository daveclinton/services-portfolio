import { masterSize } from '../constants'
import type { DesignLayer } from '../types'
import type { CanvasRect } from '../utils/geometry'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const MIN_LAYER_SIZE = 24
const HANDLE_HIT_RADIUS = 12

export function isResizableLayer(layer: DesignLayer | undefined): layer is Extract<
  DesignLayer,
  { type: 'frame' | 'rectangle' | 'diamond' | 'ellipse' }
> {
  return (
    layer?.type === 'frame' ||
    layer?.type === 'rectangle' ||
    layer?.type === 'diamond' ||
    layer?.type === 'ellipse'
  )
}

export function getResizableLayerRect(layer: Extract<
  DesignLayer,
  { type: 'frame' | 'rectangle' | 'diamond' | 'ellipse' }
>): CanvasRect {
  return {
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
  }
}

export function getResizeHandlePositions(rect: CanvasRect) {
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  return [
    { handle: 'nw' as const, x: rect.x, y: rect.y },
    { handle: 'n' as const, x: centerX, y: rect.y },
    { handle: 'ne' as const, x: rect.x + rect.width, y: rect.y },
    { handle: 'e' as const, x: rect.x + rect.width, y: centerY },
    { handle: 'se' as const, x: rect.x + rect.width, y: rect.y + rect.height },
    { handle: 's' as const, x: centerX, y: rect.y + rect.height },
    { handle: 'sw' as const, x: rect.x, y: rect.y + rect.height },
    { handle: 'w' as const, x: rect.x, y: centerY },
  ]
}

export function getResizeHandleAtPoint(
  point: { x: number; y: number },
  rect: CanvasRect,
  hitRadius = HANDLE_HIT_RADIUS,
): ResizeHandle | null {
  for (const { handle, x, y } of getResizeHandlePositions(rect)) {
    const distance = Math.hypot(point.x - x, point.y - y)
    if (distance <= hitRadius) return handle
  }

  return null
}

export function getCursorForResizeHandle(handle: ResizeHandle) {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
    case 'n':
    case 's':
      return 'ns-resize'
    case 'e':
    case 'w':
      return 'ew-resize'
  }
}

function clampRect(rect: CanvasRect): CanvasRect {
  const width = Math.max(MIN_LAYER_SIZE, Math.min(rect.width, masterSize))
  const height = Math.max(MIN_LAYER_SIZE, Math.min(rect.height, masterSize))
  const x = Math.min(Math.max(rect.x, 0), masterSize - width)
  const y = Math.min(Math.max(rect.y, 0), masterSize - height)

  return { x, y, width, height }
}

function applyAspectRatio(
  rect: CanvasRect,
  anchor: { x: number; y: number },
  aspectRatio: number,
  handle: ResizeHandle,
) {
  let { x, y, width, height } = rect

  if (['nw', 'ne', 'sw', 'se'].includes(handle)) {
    if (width / (height || 1) > aspectRatio) {
      width = height * aspectRatio
    } else {
      height = width / aspectRatio
    }
  }

  if (handle.includes('w')) x = anchor.x - width
  else if (handle.includes('e')) x = anchor.x

  if (handle.includes('n')) y = anchor.y - height
  else if (handle.includes('s')) y = anchor.y

  if (handle === 'e' || handle === 'w') {
    height = Math.max(MIN_LAYER_SIZE, height)
    width = height * aspectRatio
    if (handle === 'w') x = anchor.x - width
  }

  if (handle === 'n' || handle === 's') {
    width = Math.max(MIN_LAYER_SIZE, width)
    height = width / aspectRatio
    if (handle === 'n') y = anchor.y - height
  }

  return clampRect({ x, y, width, height })
}

export function resizeRectFromHandle(
  handle: ResizeHandle,
  startRect: CanvasRect,
  point: { x: number; y: number },
  options: { shiftKey?: boolean } = {},
): CanvasRect {
  const right = startRect.x + startRect.width
  const bottom = startRect.y + startRect.height
  const aspectRatio = startRect.width / (startRect.height || 1)
  let nextRect = { ...startRect }

  switch (handle) {
    case 'e':
      nextRect.width = Math.max(MIN_LAYER_SIZE, point.x - startRect.x)
      break
    case 'w':
      nextRect.width = Math.max(MIN_LAYER_SIZE, right - point.x)
      nextRect.x = right - nextRect.width
      break
    case 's':
      nextRect.height = Math.max(MIN_LAYER_SIZE, point.y - startRect.y)
      break
    case 'n':
      nextRect.height = Math.max(MIN_LAYER_SIZE, bottom - point.y)
      nextRect.y = bottom - nextRect.height
      break
    case 'se':
      nextRect.width = Math.max(MIN_LAYER_SIZE, point.x - startRect.x)
      nextRect.height = Math.max(MIN_LAYER_SIZE, point.y - startRect.y)
      break
    case 'sw':
      nextRect.width = Math.max(MIN_LAYER_SIZE, right - point.x)
      nextRect.height = Math.max(MIN_LAYER_SIZE, point.y - startRect.y)
      nextRect.x = right - nextRect.width
      break
    case 'ne':
      nextRect.width = Math.max(MIN_LAYER_SIZE, point.x - startRect.x)
      nextRect.height = Math.max(MIN_LAYER_SIZE, bottom - point.y)
      nextRect.y = bottom - nextRect.height
      break
    case 'nw':
      nextRect.width = Math.max(MIN_LAYER_SIZE, right - point.x)
      nextRect.height = Math.max(MIN_LAYER_SIZE, bottom - point.y)
      nextRect.x = right - nextRect.width
      nextRect.y = bottom - nextRect.height
      break
  }

  nextRect = clampRect(nextRect)

  if (options.shiftKey) {
    const anchor = {
      x: handle.includes('w') ? right : startRect.x,
      y: handle.includes('n') ? bottom : startRect.y,
    }
    nextRect = applyAspectRatio(nextRect, anchor, aspectRatio, handle)
  }

  return clampRect(nextRect)
}