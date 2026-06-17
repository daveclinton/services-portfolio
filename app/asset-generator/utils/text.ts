import type { DesignLayer, FontKey, FontWeight } from '../types'
import { fontOptions, masterSize } from '../constants'

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
  const boxHeight = layer.maxFontSize * scale * 2.1
  const boxTop = y - boxHeight / 2
  const startY =
    layer.verticalAlign === 'top'
      ? boxTop + lineHeight / 2
      : layer.verticalAlign === 'bottom'
        ? boxTop + boxHeight - blockHeight + lineHeight / 2
        : y - blockHeight / 2 + lineHeight / 2
  const boundsX =
    layer.textAlign === 'left'
      ? x - layer.maxWidth * scale / 2
      : layer.textAlign === 'right'
        ? x + layer.maxWidth * scale / 2 - blockWidth
        : x - blockWidth / 2

  return {
    fontSize,
    lines,
    lineHeight,
    startY,
    textAnchorX:
      layer.textAlign === 'left'
        ? x - layer.maxWidth * scale / 2
        : layer.textAlign === 'right'
          ? x + layer.maxWidth * scale / 2
          : x,
    bounds: {
      x: boundsX,
      y: startY - lineHeight / 2,
      width: blockWidth,
      height: blockHeight,
    },
  }
}
