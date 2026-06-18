import type { CanvasRect } from '../utils/geometry'
import { resizeWithAspectLock } from './rectangle-tool/geometry'

export const SELECTION_PADDING = 8
export const MIN_RESIZE_SIZE = 24
export const HANDLE_HIT_RADIUS = 14

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export function getSelectionBounds(rect: CanvasRect, padding = SELECTION_PADDING): CanvasRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

export function getResizeHandlePositions(bounds: CanvasRect): Array<{ handle: ResizeHandle; x: number; y: number }> {
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2

  return [
    { handle: 'nw', x: bounds.x, y: bounds.y },
    { handle: 'n', x: centerX, y: bounds.y },
    { handle: 'ne', x: right, y: bounds.y },
    { handle: 'e', x: right, y: centerY },
    { handle: 'se', x: right, y: bottom },
    { handle: 's', x: centerX, y: bottom },
    { handle: 'sw', x: bounds.x, y: bottom },
    { handle: 'w', x: bounds.x, y: centerY },
  ]
}

export function getResizeHandleAtPoint(
  point: { x: number; y: number },
  layerRect: CanvasRect,
  hitRadius = HANDLE_HIT_RADIUS,
): ResizeHandle | null {
  const bounds = getSelectionBounds(layerRect)

  for (const { handle, x, y } of getResizeHandlePositions(bounds)) {
    if (Math.abs(point.x - x) <= hitRadius && Math.abs(point.y - y) <= hitRadius) {
      return handle
    }
  }

  return null
}

export function getCursorForResizeHandle(handle: ResizeHandle): string {
  if (handle === 'nw' || handle === 'se') return 'nwse-resize'
  if (handle === 'ne' || handle === 'sw') return 'nesw-resize'
  if (handle === 'n' || handle === 's') return 'ns-resize'
  return 'ew-resize'
}

function getAnchorPoint(handle: ResizeHandle, rect: CanvasRect) {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  switch (handle) {
    case 'nw':
      return { x: right, y: bottom }
    case 'n':
      return { x: centerX, y: bottom }
    case 'ne':
      return { x: rect.x, y: bottom }
    case 'e':
      return { x: rect.x, y: centerY }
    case 'se':
      return { x: rect.x, y: rect.y }
    case 's':
      return { x: centerX, y: rect.y }
    case 'sw':
      return { x: right, y: rect.y }
    case 'w':
      return { x: right, y: centerY }
  }
}

export function resizeRectFromHandle(
  handle: ResizeHandle,
  rect: CanvasRect,
  point: { x: number; y: number },
  modifiers: { shiftKey?: boolean } = {},
): CanvasRect {
  const anchor = getAnchorPoint(handle, rect)
  const aspectRatio = rect.width / rect.height || 1

  if (handle === 'e') {
    let width = Math.max(MIN_RESIZE_SIZE, point.x - rect.x)
    let height = rect.height
    let x = rect.x
    let y = rect.y
    if (modifiers.shiftKey) {
      const locked = resizeWithAspectLock(width, height, true, aspectRatio)
      width = locked.width
      height = locked.height
      y = rect.y + (rect.height - height) / 2
    }
    return { x, y, width, height }
  }

  if (handle === 'w') {
    let width = Math.max(MIN_RESIZE_SIZE, rect.x + rect.width - point.x)
    let x = rect.x + rect.width - width
    let height = rect.height
    let y = rect.y
    if (modifiers.shiftKey) {
      const locked = resizeWithAspectLock(width, height, true, aspectRatio)
      width = locked.width
      height = locked.height
      x = rect.x + rect.width - width
      y = rect.y + (rect.height - height) / 2
    }
    return { x, y, width, height }
  }

  if (handle === 's') {
    let height = Math.max(MIN_RESIZE_SIZE, point.y - rect.y)
    let width = rect.width
    let x = rect.x
    let y = rect.y
    if (modifiers.shiftKey) {
      const locked = resizeWithAspectLock(width, height, true, aspectRatio)
      width = locked.width
      height = locked.height
      x = rect.x + (rect.width - width) / 2
    }
    return { x, y, width, height }
  }

  if (handle === 'n') {
    let height = Math.max(MIN_RESIZE_SIZE, rect.y + rect.height - point.y)
    let y = rect.y + rect.height - height
    let width = rect.width
    let x = rect.x
    if (modifiers.shiftKey) {
      const locked = resizeWithAspectLock(width, height, true, aspectRatio)
      width = locked.width
      height = locked.height
      y = rect.y + rect.height - height
      x = rect.x + (rect.width - width) / 2
    }
    return { x, y, width, height }
  }

  let width = Math.max(MIN_RESIZE_SIZE, Math.abs(point.x - anchor.x))
  let height = Math.max(MIN_RESIZE_SIZE, Math.abs(point.y - anchor.y))

  if (modifiers.shiftKey) {
    const locked = resizeWithAspectLock(width, height, true, aspectRatio)
    width = locked.width
    height = locked.height
  }

  const x = point.x < anchor.x ? anchor.x - width : anchor.x
  const y = point.y < anchor.y ? anchor.y - height : anchor.y

  return { x, y, width, height }
}