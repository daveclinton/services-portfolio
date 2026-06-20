import type { DesignLayer, IconDesign, PngAssetDefinition } from '../types'
import { masterSize } from '../constants'
import { getResizableLayerRect, isResizableLayer } from '../lib/resize-handles'
import { renderResizeHandles } from '../lib/render-resize-handles'
import { roundedRect, getAppIconRadius, getRectLayerBounds } from './geometry'
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

function getShapeCornerRadius(layer: Extract<DesignLayer, { type: 'rectangle' | 'diamond' | 'ellipse' }>, scale: number) {
  if (layer.type !== 'rectangle') {
    return Math.min(12 * scale, (layer.width * scale) / 3, (layer.height * scale) / 3)
  }

  if (typeof layer.cornerRadius === 'number') {
    return layer.cornerRadius * scale
  }

  if (layer.cornerRadius && typeof layer.cornerRadius === 'object') {
    return (
      Math.max(
        layer.cornerRadius.topLeft,
        layer.cornerRadius.topRight,
        layer.cornerRadius.bottomRight,
        layer.cornerRadius.bottomLeft,
      ) * scale
    )
  }

  return 0
}

function drawShapePath(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: 'rectangle' | 'diamond' | 'ellipse' }>,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
) {
  ctx.beginPath()

  if (layer.type === 'rectangle') {
    roundedRect(ctx, x, y, width, height, Math.min(getShapeCornerRadius(layer, scale), width / 2, height / 2))
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

export function renderShapeLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: 'rectangle' | 'diamond' | 'ellipse' }>,
  size = masterSize,
) {
  const scale = size / masterSize
  const x = layer.x * scale
  const y = layer.y * scale
  const width = layer.width * scale
  const height = layer.height * scale
  const centerX = x + width / 2
  const centerY = y + height / 2

  ctx.save()
  ctx.globalAlpha = layer.opacity
  ctx.translate(centerX, centerY)
  ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180)
  ctx.translate(-width / 2, -height / 2)
  drawShapePath(ctx, layer, 0, 0, width, height, scale)

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

function renderSelectionChrome(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  size: number,
) {
  const scale = size / masterSize

  if (layer.type === 'background') {
    roundedRect(ctx, 0, 0, size, size, getAppIconRadius(size))
    ctx.lineWidth = Math.max(2, 4 * scale)
    ctx.strokeStyle = '#0076ff'
    ctx.stroke()
    return
  }

  if (layer.type === 'frame') {
    roundedRect(
      ctx,
      layer.x * scale,
      layer.y * scale,
      layer.width * scale,
      layer.height * scale,
      8 * scale,
    )
    ctx.lineWidth = Math.max(2, 4 * scale)
    ctx.strokeStyle = '#0076ff'
    ctx.stroke()
    return
  }

  if (layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse') {
    const bounds = getRectLayerBounds(layer, size)
    roundedRect(
      ctx,
      bounds.x - 8 * scale,
      bounds.y - 8 * scale,
      bounds.width + 16 * scale,
      bounds.height + 16 * scale,
      12 * scale,
    )
    ctx.lineWidth = Math.max(2, 4 * scale)
    ctx.strokeStyle = '#0076ff'
    ctx.stroke()
    return
  }

  if (layer.type === 'text') {
    const { bounds } = getTextLayerLayout(ctx, layer, size)
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

export function renderDesign(
  ctx: CanvasRenderingContext2D,
  design: IconDesign,
  size = masterSize,
  options: { selectedLayerIds?: DesignLayer['id'][]; editingTextLayerId?: DesignLayer['id'] | null } = {},
) {
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  for (const layer of design.layers) {
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
      continue
    }

    if (layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse') {
      renderShapeLayer(ctx, layer, size)
      continue
    }

    if (layer.type === 'text') {
      if (layer.id === options.editingTextLayerId) continue

      const { fontSize, lines, lineHeight, startY, textAnchorX } = getTextLayerLayout(ctx, layer, size)

      ctx.save()
      ctx.globalAlpha = layer.opacity * layer.colorOpacity
      const fontStylePrefix = layer.fontStyle === 'italic' ? 'italic ' : ''
      ctx.font = `${fontStylePrefix}${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`
      ctx.fillStyle = layer.color
      ctx.textAlign = layer.textAlign
      ctx.textBaseline = 'middle'
      lines.forEach((line, index) => {
        const y = startY + index * lineHeight
        ctx.fillText(line, textAnchorX, y)
        if (layer.underline) {
          const width = ctx.measureText(line).width
          const startX =
            layer.textAlign === 'center'
              ? textAnchorX - width / 2
              : layer.textAlign === 'right'
                ? textAnchorX - width
                : textAnchorX
          ctx.beginPath()
          ctx.moveTo(startX, y + fontSize * 0.15)
          ctx.lineTo(startX + width, y + fontSize * 0.15)
          ctx.lineWidth = Math.max(1, fontSize * 0.06)
          ctx.strokeStyle = layer.color
          ctx.stroke()
        }
      })
      ctx.restore()
    }
  }

  const selectedLayerIds = options.selectedLayerIds ?? []

  for (const selectedLayerId of selectedLayerIds) {
    if (selectedLayerId === options.editingTextLayerId) continue

    const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerId)
    if (selectedLayer) {
      renderSelectionChrome(ctx, selectedLayer, size)
    }
  }

  if (selectedLayerIds.length === 1) {
    const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerIds[0])
    if (isResizableLayer(selectedLayer)) {
      renderResizeHandles(ctx, getResizableLayerRect(selectedLayer), size)
    }
  }
}

export function renderAsset(definition: PngAssetDefinition, design: IconDesign) {
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