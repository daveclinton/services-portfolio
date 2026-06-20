import type { DesignLayer, IconDesign, TextLayer } from '../types'

export function isTextLayerId(layerId: DesignLayer['id']): layerId is TextLayer['id'] {
  return layerId.startsWith('text-')
}

export function getTextLayerById(design: IconDesign, layerId: DesignLayer['id']): TextLayer | undefined {
  const layer = design.layers.find((candidate) => candidate.id === layerId)
  return layer?.type === 'text' ? layer : undefined
}

export function isTextLayerHit(design: IconDesign, layerId: DesignLayer['id']): layerId is TextLayer['id'] {
  return getTextLayerById(design, layerId) !== undefined
}