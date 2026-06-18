import type { FontWeight } from '../../types'

export const MIN_TEXT_BOX_DRAG = 8

const TEXT_MARGIN = 96

export type TextPlacementResult =
  | { mode: 'point'; x: number; y: number }
  | { mode: 'box'; x: number; y: number; maxWidth: number }

export function clampTextPosition(point: { x: number; y: number }, canvasSize = 1024) {
  return {
    x: Math.min(canvasSize - TEXT_MARGIN, Math.max(TEXT_MARGIN, point.x)),
    y: Math.min(canvasSize - TEXT_MARGIN, Math.max(TEXT_MARGIN, point.y)),
  }
}

export function resolveTextPlacement(
  origin: { x: number; y: number },
  end: { x: number; y: number },
  canvasSize = 1024,
): TextPlacementResult {
  const width = Math.abs(end.x - origin.x)
  const height = Math.abs(end.y - origin.y)
  const isBox = width >= MIN_TEXT_BOX_DRAG || height >= MIN_TEXT_BOX_DRAG

  if (!isBox) {
    return { mode: 'point', ...clampTextPosition(end, canvasSize) }
  }

  const boxX = Math.min(origin.x, end.x)
  const boxY = Math.min(origin.y, end.y)
  const boxWidth = Math.max(32, width)

  return {
    mode: 'box',
    x: clampTextPosition({ x: boxX + boxWidth / 2, y: boxY + Math.max(height, 24) / 2 }, canvasSize).x,
    y: clampTextPosition({ x: boxX + boxWidth / 2, y: boxY + Math.max(height, 24) / 2 }, canvasSize).y,
    maxWidth: boxWidth,
  }
}

export function toggleBoldWeight(current: FontWeight): FontWeight {
  if (current === '900') return '700'
  if (current === '800') return '700'
  return '800'
}

export function getCanvasCursorClass(activeTool: string, selectedLayerId: string, isEditingText: boolean) {
  if (activeTool === 'text') return 'is-text-tool-active'
  if (selectedLayerId === 'text' && !isEditingText) return 'is-text-selected'
  if (selectedLayerId === 'background') return 'is-canvas-selected'
  return undefined
}