import { getAppIconSafeAreaRect } from './app-icon-bounds'
import { masterSize } from '../constants'

/** Subtle editor-only guide for the 820×820 cross-platform safe area. */
export function renderSafeAreaGuide(ctx: CanvasRenderingContext2D, size = masterSize) {
  const safe = getAppIconSafeAreaRect(size)
  const scale = size / masterSize

  ctx.save()
  ctx.setLineDash([10 * scale, 8 * scale])
  ctx.lineWidth = Math.max(1, 1.5 * scale)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.strokeRect(safe.x, safe.y, safe.width, safe.height)
  ctx.restore()
}