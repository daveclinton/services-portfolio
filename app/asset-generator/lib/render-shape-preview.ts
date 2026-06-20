import { masterSize } from '../constants'
import { createShapeLayer } from '../document'
import { renderShapeLayer } from '../utils/rendering'
import type { ShapeType } from '../types'
import type { CanvasRect } from '../utils/geometry'

export function renderShapePreview(
  ctx: CanvasRenderingContext2D,
  shapeType: ShapeType,
  rect: CanvasRect,
  size = masterSize,
) {
  const layer = createShapeLayer(shapeType, rect)

  ctx.save()
  ctx.globalAlpha = 0.72
  renderShapeLayer(ctx, layer, size)
  ctx.restore()
}