import { isPointInAppIcon } from './app-icon-bounds'
import { getTextLayerResizeRect } from './text-layer-box'
import { masterSize } from '../constants'
import type { DesignLayer, IconDesign, ShapeLayer } from '../types'

const FRAME_EDGE_PADDING = 14
/** Padding around the selection box — generous enough to click, tight enough to reach background nearby. */
const TEXT_HIT_PADDING = 18

function isPointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

function isPointInEllipse(point: { x: number; y: number }, shape: ShapeLayer) {
  const rx = shape.width / 2
  const ry = shape.height / 2
  const cx = shape.x + rx
  const cy = shape.y + ry
  return ((point.x - cx) ** 2) / (rx ** 2 || 1) + ((point.y - cy) ** 2) / (ry ** 2 || 1) <= 1
}

function isPointInDiamond(point: { x: number; y: number }, shape: ShapeLayer) {
  const rx = shape.width / 2
  const ry = shape.height / 2
  const cx = shape.x + rx
  const cy = shape.y + ry
  return Math.abs(point.x - cx) / (rx || 1) + Math.abs(point.y - cy) / (ry || 1) <= 1
}

function isPointOnFrameEdge(
  point: { x: number; y: number },
  frame: Extract<DesignLayer, { type: 'frame' }>,
) {
  const insideX =
    point.x >= frame.x - FRAME_EDGE_PADDING && point.x <= frame.x + frame.width + FRAME_EDGE_PADDING
  const insideY =
    point.y >= frame.y - FRAME_EDGE_PADDING && point.y <= frame.y + frame.height + FRAME_EDGE_PADDING
  if (!insideX || !insideY) return false

  const nearLeft = Math.abs(point.x - frame.x) <= FRAME_EDGE_PADDING
  const nearRight = Math.abs(point.x - (frame.x + frame.width)) <= FRAME_EDGE_PADDING
  const nearTop = Math.abs(point.y - frame.y) <= FRAME_EDGE_PADDING
  const nearBottom = Math.abs(point.y - (frame.y + frame.height)) <= FRAME_EDGE_PADDING

  return nearLeft || nearRight || nearTop || nearBottom
}

function isPointOnShapeStroke(point: { x: number; y: number }, shape: ShapeLayer) {
  const padding = Math.max(8, shape.strokeWidth + 6)
  const outer = {
    x: shape.x - padding,
    y: shape.y - padding,
    width: shape.width + padding * 2,
    height: shape.height + padding * 2,
  }
  const inner = {
    x: shape.x + padding,
    y: shape.y + padding,
    width: Math.max(0, shape.width - padding * 2),
    height: Math.max(0, shape.height - padding * 2),
  }

  if (!isPointInRect(point, outer)) return false
  if (inner.width > 0 && inner.height > 0 && isPointInRect(point, inner)) {
    if (shape.backgroundColor !== 'transparent') return true
    return false
  }
  return true
}

function isPointInShape(point: { x: number; y: number }, shape: ShapeLayer) {
  if (!isPointInRect(point, shape)) return false

  if (shape.backgroundColor === 'transparent') {
    return isPointOnShapeStroke(point, shape)
  }

  if (shape.type === 'ellipse') return isPointInEllipse(point, shape)
  if (shape.type === 'diamond') return isPointInDiamond(point, shape)
  return true
}

function getTextHitRect(layer: Extract<DesignLayer, { type: 'text' }>, ctx: CanvasRenderingContext2D) {
  const rect = getTextLayerResizeRect(ctx, layer, masterSize)

  return {
    x: rect.x - TEXT_HIT_PADDING,
    y: rect.y - TEXT_HIT_PADDING,
    width: rect.width + TEXT_HIT_PADDING * 2,
    height: rect.height + TEXT_HIT_PADDING * 2,
  }
}

function isPointInTextLayer(
  point: { x: number; y: number },
  layer: Extract<DesignLayer, { type: 'text' }>,
  ctx: CanvasRenderingContext2D,
) {
  return isPointInRect(point, getTextHitRect(layer, ctx))
}

function isPointInLayer(
  point: { x: number; y: number },
  layer: DesignLayer,
  ctx: CanvasRenderingContext2D,
) {
  if (layer.type === 'background') {
    return isPointInAppIcon(point)
  }

  if (layer.type === 'text') {
    return isPointInTextLayer(point, layer, ctx)
  }

  if (layer.type === 'frame') {
    return isPointOnFrameEdge(point, layer)
  }

  if (layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse') {
    return isPointInShape(point, layer)
  }

  return false
}

export function hitTestLayerAtPoint(
  design: IconDesign,
  point: { x: number; y: number },
  ctx: CanvasRenderingContext2D,
): DesignLayer['id'] {
  for (let index = design.layers.length - 1; index >= 0; index -= 1) {
    const layer = design.layers[index]
    if (isPointInLayer(point, layer, ctx)) {
      return layer.id
    }
  }

  return 'background'
}