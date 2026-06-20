import { usesTextAutoResize } from '../lib/text-tool'
import type { DesignLayer, FontKey, FontWeight } from '../types'
import { fontOptions, masterSize } from '../constants'

export function getFontFamily(fontKey: FontKey) {
  return fontOptions.find((font) => font.key === fontKey)?.family ?? fontOptions[0].family
}

export function getTextFontString(
  layer: Pick<Extract<DesignLayer, { type: 'text' }>, 'fontStyle' | 'fontWeight' | 'fontFamily'>,
  fontSize: number,
) {
  const stylePrefix = layer.fontStyle === 'italic' ? 'italic ' : ''
  return `${stylePrefix}${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`
}

export function getTextLines(text: string, options: { forEditor?: boolean } = {}) {
  if (options.forEditor) {
    return text.length > 0 ? text.split(/\n/g) : ['']
  }

  const normalized = text.trim() || 'App'
  return normalized.split(/\n/g).map((line) => line.trim() || ' ')
}

function wrapLine(ctx: CanvasRenderingContext2D, line: string, maxWidth: number) {
  if (!line) return ['']

  const words = line.split(/(\s+)/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current + word
    if (ctx.measureText(next).width > maxWidth && current.trim()) {
      lines.push(current.trimEnd())
      current = word.trimStart() ? word : ''
    } else {
      current = next
    }
  }

  if (current.trim() || lines.length === 0) {
    lines.push(current.trimEnd() || line)
  }

  return lines
}

export function getWrappedTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontWeight: FontWeight,
  fontSize: number,
  options: { forEditor?: boolean } = {},
) {
  const rawLines = getTextLines(text, options)
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return rawLines.flatMap((line) => wrapLine(ctx, line, maxWidth))
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

export function getTextLayerLayout(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: 'text' }>,
  size = masterSize,
  options: { forEditor?: boolean; frozenFontSize?: number } = {},
) {
  const scale = size / masterSize
  const maxFontSize = layer.maxFontSize * scale
  const autoResize = usesTextAutoResize(layer.autoResize)
  const fontSize =
    options.frozenFontSize !== undefined
      ? options.frozenFontSize * scale
      : !autoResize
        ? maxFontSize
        : options.forEditor && !layer.text.trim()
          ? maxFontSize
          : fittedFontSize(
              ctx,
              layer.text,
              layer.maxWidth * scale,
              maxFontSize,
              layer.fontFamily,
              layer.fontWeight,
            )
  const lines = autoResize
    ? getTextLines(layer.text, options)
    : getWrappedTextLines(
        ctx,
        layer.text,
        layer.maxWidth * scale,
        layer.fontFamily,
        layer.fontWeight,
        fontSize,
        options,
      )
  const lineHeight = fontSize * 0.92
  const blockHeight = lineHeight * lines.length
  ctx.font = getTextFontString(layer, fontSize)
  const widths = lines.map((line) => ctx.measureText(line).width)
  const blockWidth = Math.max(...widths)
  const x = layer.x * scale
  const y = layer.y * scale
  const boxHeight = layer.maxFontSize * scale * 2.1
  const boxTop = y - boxHeight / 2
  const firstLineTop =
    layer.verticalAlign === 'top'
      ? boxTop
      : layer.verticalAlign === 'bottom'
        ? boxTop + boxHeight - blockHeight
        : y - blockHeight / 2
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
    firstLineTop,
    textAnchorX:
      layer.textAlign === 'left'
        ? x - layer.maxWidth * scale / 2
        : layer.textAlign === 'right'
          ? x + layer.maxWidth * scale / 2
          : x,
    bounds: {
      x: boundsX,
      y: firstLineTop,
      width: blockWidth,
      height: blockHeight,
    },
  }
}
