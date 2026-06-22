import type { AssetElement } from './types'

export type TransformHandleDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

export type TransformHandle = readonly [x: number, y: number, width: number, height: number]

const HANDLE_SIZE = 14

function pointInHandle(x: number, y: number, handle: TransformHandle) {
  const [hx, hy, hw, hh] = handle
  return x >= hx && x <= hx + hw && y >= hy && y <= hy + hh
}

export function getTransformHandles(
  element: AssetElement,
): Partial<Record<TransformHandleDirection, TransformHandle>> {
  const { x, y, width, height } = element
  const half = HANDLE_SIZE / 2

  return {
    nw: [x - half, y - half, HANDLE_SIZE, HANDLE_SIZE],
    n: [x + width / 2 - half, y - half, HANDLE_SIZE, HANDLE_SIZE],
    ne: [x + width - half, y - half, HANDLE_SIZE, HANDLE_SIZE],
    e: [x + width - half, y + height / 2 - half, HANDLE_SIZE, HANDLE_SIZE],
    se: [x + width - half, y + height - half, HANDLE_SIZE, HANDLE_SIZE],
    s: [x + width / 2 - half, y + height - half, HANDLE_SIZE, HANDLE_SIZE],
    sw: [x - half, y + height - half, HANDLE_SIZE, HANDLE_SIZE],
    w: [x - half, y + height / 2 - half, HANDLE_SIZE, HANDLE_SIZE],
  }
}

export function getTransformHandleAtPosition(
  element: AssetElement,
  x: number,
  y: number,
): TransformHandleDirection | null {
  const handles = getTransformHandles(element)

  for (const direction of ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'] as const) {
    const handle = handles[direction]
    if (handle && pointInHandle(x, y, handle)) {
      return direction
    }
  }

  return null
}

export function getCursorForResizingHandle(handle: TransformHandleDirection | null) {
  switch (handle) {
    case 'n':
    case 's':
      return 'ns-resize'
    case 'e':
    case 'w':
      return 'ew-resize'
    case 'nw':
    case 'se':
      return 'nwse-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
    default:
      return ''
  }
}
