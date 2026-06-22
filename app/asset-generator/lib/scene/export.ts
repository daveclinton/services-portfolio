import { ICON_RADIUS, ICON_SIZE } from '../common/constants'
import { renderElement } from './renderElement'
import type { ExportSceneConfig } from './types'

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clampedRadius = Math.min(radius, width / 2, height / 2)

  ctx.beginPath()
  ctx.moveTo(x + clampedRadius, y)
  ctx.lineTo(x + width - clampedRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius)
  ctx.lineTo(x + width, y + height - clampedRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height)
  ctx.lineTo(x + clampedRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - clampedRadius)
  ctx.lineTo(x, y + clampedRadius)
  ctx.quadraticCurveTo(x, y, x + clampedRadius, y)
  ctx.closePath()
}

export function exportToCanvas({
  elements,
  files,
  backgroundColor,
  exportSize,
}: ExportSceneConfig) {
  const canvas = document.createElement('canvas')
  canvas.width = exportSize
  canvas.height = exportSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not create export canvas context')
  }

  const scale = exportSize / ICON_SIZE

  ctx.save()
  ctx.scale(scale, scale)

  roundedRect(ctx, 0, 0, ICON_SIZE, ICON_SIZE, ICON_RADIUS)
  ctx.fillStyle = backgroundColor
  ctx.fill()

  for (const element of elements) {
    renderElement(element, ctx, false, files)
  }

  ctx.restore()

  return canvas
}