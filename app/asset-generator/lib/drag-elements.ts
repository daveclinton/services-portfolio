import { getAppIconSafeAreaMargin } from './app-icon-bounds'
import { masterSize } from '../constants'
import { updateLayerById } from '../document'
import type { AssetDocument, DesignLayer } from '../types'

export const DRAG_THRESHOLD = 4

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function moveLayer(layer: DesignLayer, delta: { x: number; y: number }): DesignLayer {
  if (layer.type === 'text') {
    const margin = getAppIconSafeAreaMargin()
    return {
      ...layer,
      x: clamp(layer.x + delta.x, margin, masterSize - margin),
      y: clamp(layer.y + delta.y, margin, masterSize - margin),
    }
  }

  if (layer.type === 'frame' || layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse') {
    const margin = getAppIconSafeAreaMargin()
    return {
      ...layer,
      x: clamp(layer.x + delta.x, margin, masterSize - margin - layer.width),
      y: clamp(layer.y + delta.y, margin, masterSize - margin - layer.height),
    }
  }

  return layer
}

export function moveLayersByDelta(
  document: AssetDocument,
  layerIds: DesignLayer['id'][],
  delta: { x: number; y: number },
): AssetDocument {
  let nextDocument = document

  for (const layerId of layerIds) {
    if (layerId === 'background') continue

    const layer = nextDocument.icon.layers.find((candidate) => candidate.id === layerId)
    if (!layer || layer.type === 'background') continue

    nextDocument = updateLayerById(nextDocument, layerId, (current) => moveLayer(current, delta))
  }

  return nextDocument
}

export function hasExceededDragThreshold(
  origin: { x: number; y: number },
  point: { x: number; y: number },
) {
  return Math.abs(point.x - origin.x) >= DRAG_THRESHOLD || Math.abs(point.y - origin.y) >= DRAG_THRESHOLD
}

export function getMovableLayerIds(layerIds: DesignLayer['id'][]) {
  return layerIds.filter((layerId) => layerId !== 'background')
}