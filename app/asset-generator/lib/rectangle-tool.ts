import { getRectFromPoints, type CanvasRect } from '../utils/geometry'

export const MIN_SHAPE_SIZE = 24

export function resolveRectangleBounds(
  origin: { x: number; y: number },
  point: { x: number; y: number },
  options: { shiftKey?: boolean; altKey?: boolean } = {},
): CanvasRect {
  const dx = point.x - origin.x
  const dy = point.y - origin.y

  if (options.altKey) {
    const halfWidth = Math.abs(dx)
    const halfHeight = Math.abs(dy)
    let width = halfWidth * 2
    let height = halfHeight * 2

    if (options.shiftKey) {
      const size = Math.max(width, height)
      width = size
      height = size
    }

    return {
      x: origin.x - width / 2,
      y: origin.y - height / 2,
      width,
      height,
    }
  }

  let rect = getRectFromPoints(origin, point)

  if (options.shiftKey) {
    const size = Math.max(rect.width, rect.height)
    rect = {
      x: dx >= 0 ? origin.x : origin.x - size,
      y: dy >= 0 ? origin.y : origin.y - size,
      width: size,
      height: size,
    }
  }

  return rect
}