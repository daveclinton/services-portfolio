import type { CanvasRect } from '../../utils/geometry'
import { getRectFromPoints } from '../../utils/geometry'
import type { DrawModifiers, RectangleCornerRadius } from './types'

export const CURSOR_CROSSHAIR = 'crosshair'

export function getCanvasCursorForRectangleTool(tool: string) {
  if (tool === 'rectangle') return CURSOR_CROSSHAIR
  return 'default'
}

export function resolveRectangleBounds(
  origin: { x: number; y: number },
  current: { x: number; y: number },
  modifiers: DrawModifiers = {},
): CanvasRect {
  if (modifiers.altKey) {
    const halfWidth = Math.abs(current.x - origin.x)
    const halfHeight = Math.abs(current.y - origin.y)
    const size = modifiers.shiftKey ? Math.max(halfWidth, halfHeight) : null

    const width = (size ?? halfWidth) * 2
    const height = (size ?? halfHeight) * 2

    return {
      x: origin.x - width / 2,
      y: origin.y - height / 2,
      width,
      height,
    }
  }

  const rect = getRectFromPoints(origin, current)

  if (!modifiers.shiftKey) {
    return rect
  }

  const size = Math.max(rect.width, rect.height)
  const x = current.x < origin.x ? origin.x - size : origin.x
  const y = current.y < origin.y ? origin.y - size : origin.y

  return { x, y, width: size, height: size }
}

export function resizeWithAspectLock(width: number, height: number, lockAspectRatio: boolean, aspectRatio: number) {
  if (!lockAspectRatio) {
    return { width, height }
  }

  if (width / height > aspectRatio) {
    return { width, height: width / aspectRatio }
  }

  return { width: height * aspectRatio, height }
}

export function getUniformCornerRadius(cornerRadius: RectangleCornerRadius | undefined): number {
  if (typeof cornerRadius === 'number') return cornerRadius
  if (!cornerRadius) return 0
  return Math.max(cornerRadius.topLeft, cornerRadius.topRight, cornerRadius.bottomRight, cornerRadius.bottomLeft)
}