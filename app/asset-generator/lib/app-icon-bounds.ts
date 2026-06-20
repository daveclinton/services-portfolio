import { APP_ICON_SAFE_AREA_MARGIN, APP_ICON_SAFE_AREA_SIZE, masterSize } from '../constants'
import { getAppIconRadius, type CanvasRect } from '../utils/geometry'

/** Matches getAppIconRadius / CSS border-radius on the canvas stage. */
export const APP_ICON_RADIUS_RATIO = 0.22

/** Margin from canvas edge to the safe area (102 px at 1024). */
export function getAppIconSafeAreaMargin(size = masterSize) {
  return APP_ICON_SAFE_AREA_MARGIN * (size / masterSize)
}

/** Centered safe-area rect where critical content should stay. */
export function getAppIconSafeAreaRect(size = masterSize): CanvasRect {
  const margin = getAppIconSafeAreaMargin(size)
  const safeSize = APP_ICON_SAFE_AREA_SIZE * (size / masterSize)

  return {
    x: margin,
    y: margin,
    width: safeSize,
    height: safeSize,
  }
}

/** @deprecated Use getAppIconSafeAreaMargin — kept for existing call sites. */
export function getAppIconContentInset(size = masterSize) {
  return getAppIconSafeAreaMargin(size)
}

/** True when the point lies on the visible rounded-square icon (full 1024 canvas). */
export function isPointInAppIcon(point: { x: number; y: number }, size = masterSize) {
  const { x, y } = point
  if (x < 0 || y < 0 || x > size || y > size) return false

  const radius = getAppIconRadius(size)

  const inCornerDisc = (centerX: number, centerY: number) => {
    const dx = x - centerX
    const dy = y - centerY
    return dx * dx + dy * dy <= radius * radius
  }

  if (x < radius && y < radius) return inCornerDisc(radius, radius)
  if (x > size - radius && y < radius) return inCornerDisc(size - radius, radius)
  if (x < radius && y > size - radius) return inCornerDisc(radius, size - radius)
  if (x > size - radius && y > size - radius) return inCornerDisc(size - radius, size - radius)

  return true
}

export function clampPointToAppIconSafeArea(point: { x: number; y: number }, size = masterSize) {
  const margin = getAppIconSafeAreaMargin(size)
  return {
    x: Math.min(size - margin, Math.max(margin, point.x)),
    y: Math.min(size - margin, Math.max(margin, point.y)),
  }
}

/** @deprecated Use clampPointToAppIconSafeArea. */
export function clampPointToAppIconContent(point: { x: number; y: number }, size = masterSize) {
  return clampPointToAppIconSafeArea(point, size)
}

export function clampRectToAppIconSafeArea(rect: CanvasRect, size = masterSize): CanvasRect {
  const margin = getAppIconSafeAreaMargin(size)
  const maxExtent = size - margin
  const x = Math.max(margin, Math.min(rect.x, maxExtent))
  const y = Math.max(margin, Math.min(rect.y, maxExtent))
  const right = Math.min(rect.x + rect.width, maxExtent)
  const bottom = Math.min(rect.y + rect.height, maxExtent)

  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  }
}

/** @deprecated Use clampRectToAppIconSafeArea. */
export function clampRectToAppIcon(rect: CanvasRect, size = masterSize): CanvasRect {
  return clampRectToAppIconSafeArea(rect, size)
}

export function isPointInAppIconSafeArea(point: { x: number; y: number }, size = masterSize) {
  const safe = getAppIconSafeAreaRect(size)
  return (
    point.x >= safe.x &&
    point.x <= safe.x + safe.width &&
    point.y >= safe.y &&
    point.y <= safe.y + safe.height
  )
}