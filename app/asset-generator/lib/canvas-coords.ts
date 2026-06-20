import { isPointInAppIcon } from './app-icon-bounds'

export function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  masterSize: number,
) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / rect.width) * masterSize,
    y: ((clientY - rect.top) / rect.height) * masterSize,
  }
}

/** Scene point only when the pointer is on the app icon — not the square outside it. */
export function getAppIconCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  size: number,
) {
  const point = getCanvasPoint(canvas, clientX, clientY, size)
  return isPointInAppIcon(point, size) ? point : null
}