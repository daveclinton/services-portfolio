import { masterSize } from '../constants'
import type { CanvasRect } from '../utils/geometry'

export function renderTextBoxPreview(ctx: CanvasRenderingContext2D, rect: CanvasRect, size = masterSize) {
  const scale = size / masterSize

  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.setLineDash([6 * scale, 4 * scale])
  ctx.lineWidth = Math.max(1.5, 2 * scale)
  ctx.strokeStyle = '#6965db'
  ctx.strokeRect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale)
  ctx.restore()
}