import { masterSize } from '../constants'
import type { DesignLayer, IconDesign } from '../types'
import { getRectLayerBounds, rectsIntersect, type CanvasRect } from '../utils/geometry'
import { getTextLayerLayout } from '../utils/text'

export const MARQUEE_MIN_SIZE = 4

export function isMarqueeGesture(rect: CanvasRect) {
  return rect.width >= MARQUEE_MIN_SIZE || rect.height >= MARQUEE_MIN_SIZE
}

export function getLayerBounds(
  layer: DesignLayer,
  ctx: CanvasRenderingContext2D,
  size = masterSize,
): CanvasRect {
  if (layer.type === 'background') {
    return { x: 0, y: 0, width: size, height: size }
  }

  if (layer.type === 'text') {
    return getTextLayerLayout(ctx, layer, size).bounds
  }

  if (layer.type === 'frame' || layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse') {
    return getRectLayerBounds(layer, size)
  }

  return { x: 0, y: 0, width: 0, height: 0 }
}

export function resolveClickSelection(
  selectedLayerIds: DesignLayer['id'][],
  hitLayerId: DesignLayer['id'],
  shiftKey: boolean,
): { selectedLayerIds: DesignLayer['id'][]; shouldDrag: boolean } {
  if (hitLayerId === 'background') {
    return { selectedLayerIds, shouldDrag: false }
  }

  if (shiftKey) {
    if (selectedLayerIds.includes(hitLayerId)) {
      const filtered = selectedLayerIds.filter((layerId) => layerId !== hitLayerId)
      return {
        selectedLayerIds: filtered.length > 0 ? filtered : ['background'],
        shouldDrag: false,
      }
    }

    return {
      selectedLayerIds: [...selectedLayerIds.filter((layerId) => layerId !== 'background'), hitLayerId],
      shouldDrag: true,
    }
  }

  return {
    selectedLayerIds: selectedLayerIds.includes(hitLayerId) ? selectedLayerIds : [hitLayerId],
    shouldDrag: true,
  }
}

export function mergeMarqueeSelection(
  currentSelectedLayerIds: DesignLayer['id'][],
  marqueeLayerIds: DesignLayer['id'][],
): DesignLayer['id'][] {
  const merged = new Set([
    ...currentSelectedLayerIds.filter((layerId) => layerId !== 'background'),
    ...marqueeLayerIds.filter((layerId) => layerId !== 'background'),
  ])

  return merged.size > 0 ? Array.from(merged) : ['background']
}

export function getLayersInMarquee(
  design: IconDesign,
  marquee: CanvasRect,
  ctx: CanvasRenderingContext2D,
): DesignLayer['id'][] {
  const selectedIds: DesignLayer['id'][] = []

  for (const layer of design.layers) {
    if (layer.type === 'background') continue
    if (rectsIntersect(marquee, getLayerBounds(layer, ctx, masterSize))) {
      selectedIds.push(layer.id)
    }
  }

  return selectedIds.length > 0 ? selectedIds : ['background']
}