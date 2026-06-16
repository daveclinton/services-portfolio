import type { AssetDefinition, DesignLayer, FontKey, FontWeight, IconDesign } from './types'
import { fontOptions, masterSize } from './constants'

export function getFontFamily(fontKey: FontKey) {
  return fontOptions.find((font) => font.key === fontKey)?.family ?? fontOptions[0].family
}

export function getTextLines(text: string) {
  const normalized = text.trim() || 'App'
  return normalized.split(/\n/g).map((line) => line.trim() || ' ')
}

export function fittedFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  fontFamily: string,
  fontWeight: FontWeight,
) {
  let size = maxSize
  while (size > 18) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`
    const widestLine = Math.max(...getTextLines(text).map((line) => ctx.measureText(line).width))
    if (widestLine <= maxWidth) {
      return size
    }
    size -= 4
  }
  return size
}

export function getFittedFontSizeForText(
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize = 18,
  fontFamily = 'Inter, system-ui, sans-serif',
  fontWeight: FontWeight = '800',
) {
  if (typeof document === 'undefined') {
    return minSize
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return minSize

  let size = maxSize
  const value = text.trim() || 'App'

  while (size > minSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`
    const widestLine = Math.max(...getTextLines(value).map((line) => ctx.measureText(line).width))
    if (widestLine <= maxWidth) {
      return size
    }
    size -= 2
  }

  return minSize
}

export function getValidColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

export function normalizeHexColor(value: string, fallback: string) {
  const stripped = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
  if (stripped.length === 6) {
    return `#${stripped}`.toLowerCase()
  }
  return fallback
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

export function getTextLayerLayout(ctx: CanvasRenderingContext2D, layer: Extract<DesignLayer, { type: 'text' }>, size = masterSize) {
  const scale = size / masterSize
  const fontSize = fittedFontSize(
    ctx,
    layer.text,
    layer.maxWidth * scale,
    layer.maxFontSize * scale,
    layer.fontFamily,
    layer.fontWeight,
  )
  const lines = getTextLines(layer.text)
  const lineHeight = fontSize * 0.92
  const blockHeight = lineHeight * lines.length
  ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`
  const widths = lines.map((line) => ctx.measureText(line).width)
  const blockWidth = Math.max(...widths)
  const x = layer.x * scale
  const y = layer.y * scale
  const startY = y - blockHeight / 2 + lineHeight / 2

  return {
    fontSize,
    lines,
    lineHeight,
    startY,
    bounds: {
      x: x - blockWidth / 2,
      y: y - blockHeight / 2,
      width: blockWidth,
      height: blockHeight,
    },
  }
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
      roundedRect(ctx, 0, 0, size, size, getAppIconRadius(size))
      ctx.fillStyle = layer.color
      ctx.fill()
      continue
    }

    const scale = size / masterSize
    const { bounds, fontSize, lines, lineHeight, startY } = getTextLayerLayout(ctx, layer, size)

    ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`
    ctx.fillStyle = layer.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    lines.forEach((line, index) => {
      ctx.fillText(line, layer.x * scale, startY + index * lineHeight)
    })

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

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not export canvas'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
