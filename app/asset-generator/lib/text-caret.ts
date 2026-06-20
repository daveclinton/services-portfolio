import { masterSize } from '../constants'
import type { TextLayer } from '../types'
import { getTextFontString, getTextLayerLayout } from '../utils/text'

function getLineStartX(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  line: string,
  layout: ReturnType<typeof getTextLayerLayout>,
) {
  const lineWidth = ctx.measureText(line).width

  if (layer.textAlign === 'left') {
    return layout.textAnchorX
  }

  if (layer.textAlign === 'right') {
    return layout.textAnchorX - lineWidth
  }

  return layout.textAnchorX - lineWidth / 2
}

export function getCaretOffsetAtPoint(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  point: { x: number; y: number },
  size = masterSize,
) {
  const layout = getTextLayerLayout(ctx, layer, size, { forEditor: true })
  const scale = size / masterSize
  ctx.font = getTextFontString(layer, layout.fontSize)

  const relativeY = point.y * scale - layout.bounds.y
  const lineIndex = Math.max(
    0,
    Math.min(layout.lines.length - 1, Math.floor(relativeY / (layout.lineHeight || 1))),
  )
  const line = layout.lines[lineIndex] ?? ''
  const lineStartX = getLineStartX(ctx, layer, line, layout)
  const relativeX = Math.max(0, point.x * scale - lineStartX)

  let offsetInLine = 0
  let closestDistance = Infinity

  for (let index = 0; index <= line.length; index += 1) {
    const width = ctx.measureText(line.slice(0, index)).width
    const distance = Math.abs(width - relativeX)
    if (distance <= closestDistance) {
      closestDistance = distance
      offsetInLine = index
    }
  }

  let caretOffset = 0
  for (let index = 0; index < lineIndex; index += 1) {
    caretOffset += layout.lines[index].length + 1
  }

  return caretOffset + offsetInLine
}