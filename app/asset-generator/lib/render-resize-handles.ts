import { masterSize } from '../constants'
import type { CanvasRect } from '../utils/geometry'
import { getResizeHandlePositions } from './resize-handles'

export function renderResizeHandles(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  size = masterSize,
) {
  const scale = size / masterSize
  const handleRadius = Math.max(4, 5 * scale)

  for (const { x, y } of getResizeHandlePositions(rect)) {
    ctx.beginPath()
    ctx.arc(x * scale, y * scale, handleRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = Math.max(1.5, 2 * scale)
    ctx.strokeStyle = '#6965db'
    ctx.stroke()
  }
}