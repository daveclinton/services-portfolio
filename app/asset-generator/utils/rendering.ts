import type { AssetDefinition, DesignLayer, IconDesign } from '../types'
import { masterSize } from '../constants'
import { roundedRect, getRectLayerBounds, getAppIconRadius } from './geometry'
import { getTextLayerLayout } from './text'

function renderFrameLayer(ctx: CanvasRenderingContext2D, layer: Extract<DesignLayer, { type: 'frame' }>, size = masterSize) {
  const scale = size / masterSize
  const x = layer.x * scale
  const y = layer.y * scale
  const width = layer.width * scale
  const height = layer.height * scale
  const radius = 8 * scale

  ctx.save()
  ctx.globalAlpha = layer.opacity
  roundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = layer.backgroundColor
  ctx.fill()
  ctx.lineWidth = Math.max(1, 2 * scale)
  ctx.strokeStyle = layer.strokeColor
  ctx.stroke()

  if (layer.name) {
    ctx.font = `${Math.max(10, 14 * scale)}px Inter, system-ui, sans-serif`
    ctx.fillStyle = '#999999'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(layer.name, x, y - 3 * scale)
  }

  ctx.restore()
}

function drawShapePath(ctx: CanvasRenderingContext2D, layer: Extract<DesignLayer, { type: 'rectangle' | 'diamond' | 'ellipse' }>, scale: number) {
  const x = layer.x * scale
  const y = layer.y * scale
  const width = layer.width * scale
  const height = layer.height * scale

  ctx.beginPath()

  if (layer.type === 'rectangle') {
    roundedRect(ctx, x, y, width, height, Math.min(12 * scale, width / 3, height / 3))
    return
  }

  if (layer.type === 'diamond') {
    ctx.moveTo(x + width / 2, y)
    ctx.lineTo(x + width, y + height / 2)
    ctx.lineTo(x + width / 2, y + height)
    ctx.lineTo(x, y + height / 2)
    ctx.closePath()
    return
  }

  ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2)
  ctx.closePath()
}

function renderShapeLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: 'rectangle' | 'diamond' | 'ellipse' }>,
  size = masterSize,
) {
  const scale = size / masterSize

  ctx.save()
  ctx.globalAlpha = layer.opacity
  drawShapePath(ctx, layer, scale)

  if (layer.backgroundColor !== 'transparent') {
    ctx.fillStyle = layer.backgroundColor
    ctx.fill()
  }

  ctx.lineWidth = Math.max(1, layer.strokeWidth * scale)
  ctx.strokeStyle = layer.strokeColor
  ctx.setLineDash(
    layer.strokeStyle === 'dashed'
      ? [12 * scale, 10 * scale]
      : layer.strokeStyle === 'dotted'
        ? [2 * scale, 8 * scale]
        : [],
  )
  ctx.lineCap = layer.strokeStyle === 'dotted' ? 'round' : 'butt'
  ctx.stroke()
  ctx.restore()
}

export function renderDesign(
  ctx: CanvasRenderingContext2D,
  design: IconDesign,
  size = masterSize,
  options: { hideLayerId?: DesignLayer['id']; selectedLayerId?: DesignLayer['id'] } = {},
) {
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  for (const layer of design.layers) {
    if (options.hideLayerId === layer.id) {
      continue
    }

    if (layer.type === 'background') {
      ctx.save()
      ctx.globalAlpha = layer.opacity
      roundedRect(ctx, 0, 0, size, size, getAppIconRadius(size))
      ctx.fillStyle = layer.color
      ctx.fill()
      ctx.restore()
      continue
    }

    if (layer.type === 'frame') {
      renderFrameLayer(ctx, layer, size)

      if (options.selectedLayerId === layer.id) {
        const scale = size / masterSize
        roundedRect(ctx, layer.x * scale, layer.y * scale, layer.width * scale, layer.height * scale, 8 * scale)
        ctx.lineWidth = Math.max(2, 4 * scale)
        ctx.strokeStyle = '#0076ff'
        ctx.stroke()
      }

      continue
    }

    if (layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse') {
      renderShapeLayer(ctx, layer, size)

      if (options.selectedLayerId === layer.id) {
        const bounds = getRectLayerBounds(layer, size)
        const scale = size / masterSize
        roundedRect(ctx, bounds.x - 8 * scale, bounds.y - 8 * scale, bounds.width + 16 * scale, bounds.height + 16 * scale, 12 * scale)
        ctx.lineWidth = Math.max(2, 4 * scale)
        ctx.strokeStyle = '#0076ff'
        ctx.stroke()
      }

      continue
    }

    if (layer.type === 'text') {
      const scale = size / masterSize
      const { bounds, fontSize, lines, lineHeight, startY, textAnchorX } = getTextLayerLayout(ctx, layer, size)

      ctx.save()
      ctx.globalAlpha = layer.opacity * layer.colorOpacity
      ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`
      ctx.fillStyle = layer.color
      ctx.textAlign = layer.textAlign
      ctx.textBaseline = 'middle'
      lines.forEach((line, index) => {
        ctx.fillText(line, textAnchorX, startY + index * lineHeight)
      })
      ctx.restore()

      if (options.selectedLayerId === layer.id) {
        const padding = 24 * scale
        roundedRect(
          ctx,
          bounds.x - padding,
          bounds.y - padding,
          bounds.width + padding * 2,
          bounds.height + padding * 2,
          22 * scale,
        )
        ctx.lineWidth = Math.max(2, 4 * scale)
        ctx.strokeStyle = '#6965db'
        ctx.stroke()
      }
    }
  }
}

export function renderAsset(definition: AssetDefinition, design: IconDesign) {
  const { width, height } = definition.imageSize
  const dpiScale = definition.dpi / 72
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * dpiScale)
  canvas.height = Math.round(height * dpiScale)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(`Could not render ${definition.name}`)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(dpiScale, dpiScale)

  const logicalSize = Math.min(width, height)
  const offsetX = (width - logicalSize) / 2
  const offsetY = (height - logicalSize) / 2
  ctx.translate(offsetX, offsetY)
  ctx.scale(logicalSize / masterSize, logicalSize / masterSize)
  renderDesign(ctx, design)

  return canvas
}
