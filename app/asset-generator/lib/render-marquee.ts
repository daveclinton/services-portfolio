import { masterSize } from '../constants'
import type { CanvasRect } from '../utils/geometry'

export function renderMarquee(ctx: CanvasRenderingContext2D, marquee: CanvasRect, size = masterSize) {
  const scale = size / masterSize

  ctx.save()
  ctx.setLineDash([12 * scale, 8 * scale])
  ctx.lineWidth = Math.max(2, 3 * scale)
  ctx.strokeStyle = '#6965db'
  ctx.fillStyle = 'rgba(105, 101, 219, 0.1)'
  ctx.fillRect(marquee.x * scale, marquee.y * scale, marquee.width * scale, marquee.height * scale)
  ctx.strokeRect(marquee.x * scale, marquee.y * scale, marquee.width * scale, marquee.height * scale)
  ctx.restore()
}