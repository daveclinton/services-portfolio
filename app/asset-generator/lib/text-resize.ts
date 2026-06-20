import { clampRectToAppIcon } from './app-icon-bounds'
import { applyResizeRectToTextLayer, MIN_TEXT_BOX_WIDTH } from './text-layer-box'
import { resizeRectFromHandle, type ResizeHandle } from './resize-handles'
import { masterSize } from '../constants'
import type { TextLayer } from '../types'
import type { CanvasRect } from '../utils/geometry'
import { getTextLayerLayout } from '../utils/text'

const MIN_FONT_SIZE = 18

function measureFontSizeFromWidth(layer: TextLayer, nextWidth: number, startWidth: number): number | null {
  const nextFontSize = layer.maxFontSize * (nextWidth / startWidth)
  return nextFontSize < MIN_FONT_SIZE ? null : nextFontSize
}

function clampTextResizeRect(rect: CanvasRect): CanvasRect {
  const clamped = clampRectToAppIcon(rect)
  return {
    ...clamped,
    width: Math.max(MIN_TEXT_BOX_WIDTH, clamped.width),
    height: Math.max(1, clamped.height),
  }
}

export function resizeTextLayerFromHandle(
  ctx: CanvasRenderingContext2D,
  startLayer: TextLayer,
  startRect: CanvasRect,
  handle: ResizeHandle,
  point: { x: number; y: number },
  options: { shiftKey?: boolean } = {},
): TextLayer {
  let nextRect = clampTextResizeRect(resizeRectFromHandle(handle, startRect, point, options))

  if (handle === 'e' || handle === 'w') {
    const nextFontSize = measureFontSizeFromWidth(startLayer, nextRect.width, startRect.width)
    if (!nextFontSize) return startLayer

    const nextLayer = applyResizeRectToTextLayer(
      { ...startLayer, maxFontSize: nextFontSize },
      nextRect,
    )
    const layout = getTextLayerLayout(ctx, nextLayer, masterSize)
    nextRect.height = Math.max(nextRect.height, layout.bounds.height)

    return applyResizeRectToTextLayer({ ...nextLayer, maxFontSize: nextFontSize }, nextRect)
  }

  const metricsWidth = startRect.width * (nextRect.height / startRect.height)
  const nextFontSize = measureFontSizeFromWidth(startLayer, metricsWidth, startRect.width)
  if (!nextFontSize) return startLayer

  nextRect = {
    ...nextRect,
    width: metricsWidth,
    x: handle.includes('w') ? startRect.x + startRect.width - metricsWidth : nextRect.x,
  }
  nextRect = clampTextResizeRect(nextRect)

  return applyResizeRectToTextLayer({ ...startLayer, maxFontSize: nextFontSize }, nextRect)
}