import { masterSize } from '../constants'
import type { TextLayer } from '../types'
import type { CanvasRect } from '../utils/geometry'
import { getTextLayerLayout } from '../utils/text'
import { usesTextAutoResize } from './text-tool'

export const MIN_TEXT_BOX_WIDTH = 24

export function getTextLayerResizeRect(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  size = masterSize,
): CanvasRect {
  const layout = getTextLayerLayout(ctx, layer, size)
  const scale = size / masterSize

  if (usesTextAutoResize(layer.autoResize)) {
    const width = Math.max(layout.bounds.width / scale, MIN_TEXT_BOX_WIDTH)
    const height = Math.max(layout.bounds.height / scale, 1)

    return {
      x: layout.bounds.x / scale + (layout.bounds.width / scale - width) / 2,
      y: layout.bounds.y / scale,
      width,
      height,
    }
  }

  const width = layer.maxWidth
  const height = Math.max(layout.bounds.height / scale, layer.maxFontSize * 0.92)

  return {
    x: layer.x - width / 2,
    y: layout.bounds.y / scale,
    width,
    height,
  }
}

export function getTextLayerBoxCenter(rect: CanvasRect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

export function applyResizeRectToTextLayer(layer: TextLayer, rect: CanvasRect): TextLayer {
  const boxHeight = layer.maxFontSize * 2.1

  return {
    ...layer,
    autoResize: false,
    maxWidth: rect.width,
    x: rect.x + rect.width / 2,
    y: rect.y + boxHeight / 2,
    verticalAlign: layer.verticalAlign === 'middle' || layer.verticalAlign === 'bottom' ? 'top' : layer.verticalAlign,
  }
}

/** Convert auto-resize text to a fixed box before transform (Excalidraw-style). */
export function prepareTextLayerForResize(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
): { layer: TextLayer; rect: CanvasRect } {
  if (!usesTextAutoResize(layer.autoResize)) {
    return { layer, rect: getTextLayerResizeRect(ctx, layer) }
  }

  const layout = getTextLayerLayout(ctx, layer, masterSize)
  const rect: CanvasRect = {
    x: layout.bounds.x,
    y: layout.bounds.y,
    width: Math.max(layout.bounds.width, MIN_TEXT_BOX_WIDTH),
    height: Math.max(layout.bounds.height, 1),
  }

  const prepared: TextLayer = {
    ...layer,
    autoResize: false,
    maxFontSize: layout.fontSize,
    maxWidth: rect.width,
    x: rect.x + rect.width / 2,
    y: rect.y + (layout.fontSize * 2.1) / 2,
    verticalAlign: 'top',
  }

  return { layer: prepared, rect }
}