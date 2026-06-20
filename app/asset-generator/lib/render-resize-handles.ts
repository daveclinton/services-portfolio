import { masterSize } from '../constants'
import type { CanvasRect } from '../utils/geometry'
import { getTransformHandlePositions } from './resize-handles'

export function renderTransformHandles(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  size = masterSize,
  options: { rotation?: number; showRotation?: boolean } = {},
) {
  const scale = size / masterSize
  const handleRadius = Math.max(4, 5 * scale)
  const rotation = options.rotation ?? 0
  const showRotation = options.showRotation ?? false
  const centerX = (rect.x + rect.width / 2) * scale
  const centerY = (rect.y + rect.height / 2) * scale

  if (showRotation && rotation !== 0) {
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.beginPath()
    ctx.moveTo(0, -rect.height * scale * 0.5)
    ctx.lineTo(0, -rect.height * scale * 0.5 - 16 * scale)
    ctx.lineWidth = Math.max(1.5, 2 * scale)
    ctx.strokeStyle = '#6965db'
    ctx.stroke()
    ctx.restore()
  } else if (showRotation) {
    ctx.beginPath()
    ctx.moveTo(centerX, rect.y * scale)
    ctx.lineTo(centerX, rect.y * scale - 16 * scale)
    ctx.lineWidth = Math.max(1.5, 2 * scale)
    ctx.strokeStyle = '#6965db'
    ctx.stroke()
  }

  const handles = showRotation
    ? getTransformHandlePositions(rect, rotation)
    : getTransformHandlePositions(rect, rotation).filter((entry) => entry.handle !== 'rotation')

  for (const { handle, x, y } of handles) {
    ctx.beginPath()
    ctx.arc(x * scale, y * scale, handleRadius, 0, Math.PI * 2)
    ctx.fillStyle = handle === 'rotation' ? '#6965db' : '#ffffff'
    ctx.fill()
    ctx.lineWidth = Math.max(1.5, 2 * scale)
    ctx.strokeStyle = '#6965db'
    ctx.stroke()
  }
}

/** @deprecated Use renderTransformHandles */
export function renderResizeHandles(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  size = masterSize,
) {
  renderTransformHandles(ctx, rect, size)
}