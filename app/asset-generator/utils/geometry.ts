import { masterSize } from '../constants'
import type { DesignLayer } from '../types'

export type CanvasRect = {
  x: number
  y: number
  width: number
  height: number
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

export function getAppIconRadius(size: number) {
  return size * 0.22
}

export function getRectFromPoints(start: { x: number; y: number }, end: { x: number; y: number }): CanvasRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

export function rectsIntersect(a: CanvasRect, b: CanvasRect) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
}

export function getRectLayerBounds(layer: Extract<DesignLayer, { type: 'frame' | 'rectangle' | 'diamond' | 'ellipse' }>, size = masterSize) {
  const scale = size / masterSize
  return {
    x: layer.x * scale,
    y: layer.y * scale,
    width: layer.width * scale,
    height: layer.height * scale,
  }
}
