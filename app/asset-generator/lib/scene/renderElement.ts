import type { AssetFile } from '../editor/types'
import { getReadyImage } from './imageCache'
import type { AssetElement } from '../element/types'

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

function drawDiamondPath(ctx: CanvasRenderingContext2D, element: AssetElement) {
  const centerX = element.x + element.width / 2
  const centerY = element.y + element.height / 2

  ctx.beginPath()
  ctx.moveTo(centerX, element.y)
  ctx.lineTo(element.x + element.width, centerY)
  ctx.lineTo(centerX, element.y + element.height)
  ctx.lineTo(element.x, centerY)
  ctx.closePath()
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  element: AssetElement,
) {
  ctx.save()
  ctx.strokeStyle = '#6965db'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8])
  ctx.strokeRect(element.x, element.y, element.width, element.height)
  ctx.restore()
}

export function renderElement(
  element: AssetElement,
  context: CanvasRenderingContext2D,
  isSelected = false,
  files: Record<string, AssetFile> = {},
) {
  context.save()
  context.globalAlpha = element.opacity / 100

  if (element.type === 'image') {
    const file = element.fileId ? files[element.fileId] : undefined
    const image = element.fileId ? getReadyImage(element.fileId, file) : null

    if (image) {
      context.drawImage(image, element.x, element.y, element.width, element.height)
    } else {
      context.fillStyle = '#f1f3f5'
      context.fillRect(element.x, element.y, element.width, element.height)
      context.strokeStyle = '#ced4da'
      context.lineWidth = 2
      context.strokeRect(element.x, element.y, element.width, element.height)
    }

    context.restore()

    if (isSelected) {
      drawSelectionOutline(context, element)
    }

    return
  }

  if (element.type === 'ellipse') {
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2
    context.beginPath()
    context.ellipse(
      centerX,
      centerY,
      element.width / 2,
      element.height / 2,
      0,
      0,
      Math.PI * 2,
    )
  } else if (element.type === 'diamond') {
    drawDiamondPath(context, element)
  } else if (element.type === 'text') {
    const fontSize = element.fontSize ?? 64
    context.font = `700 ${fontSize}px Inter, system-ui, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = element.strokeColor
    context.fillText(
      element.text ?? 'Label',
      element.x + element.width / 2,
      element.y + element.height / 2,
    )
    context.restore()

    if (isSelected) {
      drawSelectionOutline(context, element)
    }

    return
  } else {
    roundedRect(context, element.x, element.y, element.width, element.height, 24)
  }

  if (element.backgroundColor !== 'transparent') {
    context.fillStyle = element.backgroundColor
    context.fill()
  }

  context.strokeStyle = element.strokeColor
  context.lineWidth = element.strokeWidth
  context.setLineDash([])
  context.stroke()

  if (isSelected) {
    context.strokeStyle = '#6965db'
    context.lineWidth = 2
    context.setLineDash([8, 8])
    context.stroke()
  }

  context.restore()
}