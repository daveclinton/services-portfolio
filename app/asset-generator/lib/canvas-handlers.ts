import type { PointerEvent as ReactPointerEvent } from 'react'
import { masterSize } from '../constants'
import type { ShapeType, FrameLayer, ShapeLayer, AssetDocument, IconDesign, DesignLayer } from '../types'
import { CanvasRect, getRectFromPoints, rectsIntersect } from '../utils/'
import { getFrameLayerAtPoint, getShapeLayerAtPoint } from './hit-detection'
import { getFrameLayers, getShapeLayers, getTextLayer } from './layers'
import { createFrameLayer, createShapeLayer, addIconLayer } from '../document'
import { getTextLayerLayout } from '../utils/'

export function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null) {
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * masterSize,
    y: ((event.clientY - rect.top) / rect.height) * masterSize,
  }
}

export function isShapeTool(tool: string): tool is ShapeType {
  return tool === 'rectangle' || tool === 'diamond' || tool === 'ellipse'
}

export function getTextLayerBounds(canvas: HTMLCanvasElement | null, design: IconDesign) {
  if (!canvas) return null

  const textLayer = getTextLayer(design)
  if (!textLayer) return null

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  return getTextLayerLayout(ctx, textLayer).bounds
}

export function isPointInsideTextLayer(point: { x: number; y: number }, bounds: CanvasRect | null) {
  if (!bounds) return false
  const padding = 32

  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  )
}
