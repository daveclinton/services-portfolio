import type { FrameLayer, ShapeLayer, IconDesign, DesignLayer } from '../types'
import { getFrameLayers, getShapeLayers } from './layers'

export function getFrameLayerAtPoint(design: IconDesign, point: { x: number; y: number }): FrameLayer | null {
  const edgePadding = 14
  return [...getFrameLayers(design)].reverse().find((frame) => {
    const insideX = point.x >= frame.x - edgePadding && point.x <= frame.x + frame.width + edgePadding
    const insideY = point.y >= frame.y - edgePadding && point.y <= frame.y + frame.height + edgePadding
    if (!insideX || !insideY) return false

    const nearLeft = Math.abs(point.x - frame.x) <= edgePadding
    const nearRight = Math.abs(point.x - (frame.x + frame.width)) <= edgePadding
    const nearTop = Math.abs(point.y - frame.y) <= edgePadding
    const nearBottom = Math.abs(point.y - (frame.y + frame.height)) <= edgePadding

    return nearLeft || nearRight || nearTop || nearBottom
  }) ?? null
}

export function getShapeLayerAtPoint(design: IconDesign, point: { x: number; y: number }): ShapeLayer | null {
  return [...getShapeLayers(design)].reverse().find((shape) => {
    if (point.x < shape.x || point.x > shape.x + shape.width || point.y < shape.y || point.y > shape.y + shape.height) {
      return false
    }

    if (shape.type === 'ellipse') {
      const rx = shape.width / 2
      const ry = shape.height / 2
      const cx = shape.x + rx
      const cy = shape.y + ry
      return ((point.x - cx) ** 2) / (rx ** 2 || 1) + ((point.y - cy) ** 2) / (ry ** 2 || 1) <= 1
    }

    if (shape.type === 'diamond') {
      const rx = shape.width / 2
      const ry = shape.height / 2
      const cx = shape.x + rx
      const cy = shape.y + ry
      return Math.abs(point.x - cx) / (rx || 1) + Math.abs(point.y - cy) / (ry || 1) <= 1
    }

    return true
  }) ?? null
}
