import { TEXT_AUTOWRAP_THRESHOLD, TEXT_BOX_MIN_PADDING } from './text-constants'
import type { CanvasRect } from '../utils/geometry'
import type { FontWeight } from '../types'

export function getMinTextBoxWidth(
  ctx: CanvasRenderingContext2D,
  fontFamily: string,
  fontWeight: FontWeight,
  fontSize: number,
) {
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return ctx.measureText('').width + TEXT_BOX_MIN_PADDING * 2
}

/** Mirrors Excalidraw dragNewElement text branch: top locked to origin, width from drag. */
export function resolveTextBoxBounds(
  origin: { x: number; y: number },
  point: { x: number; y: number },
  minWidth: number,
): { rect: CanvasRect; autoResize: boolean } {
  const dragWidth = Math.abs(point.x - origin.x)
  const dragHeight = Math.abs(point.y - origin.y)
  const width = Math.max(dragWidth, minWidth)
  const x = point.x < origin.x ? origin.x - width : origin.x
  const y = origin.y
  const autoResize = dragWidth <= TEXT_AUTOWRAP_THRESHOLD

  return {
    rect: {
      x,
      y,
      width,
      height: Math.max(dragHeight, 1),
    },
    autoResize,
  }
}