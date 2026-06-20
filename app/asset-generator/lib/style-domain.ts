import type { DesignLayer, IconDesign } from '../types'

export type CanvasStyleDomain = 'canvas' | 'text' | 'shape' | 'frame' | 'mixed' | 'none'

export function getCanvasStyleDomain(layer: DesignLayer): CanvasStyleDomain {
  if (layer.type === 'background') return 'canvas'
  if (layer.type === 'text') return 'text'
  if (layer.type === 'frame') return 'frame'
  return 'shape'
}

export function getStyleDomainLabel(domain: CanvasStyleDomain): string {
  if (domain === 'canvas') return 'Canvas'
  if (domain === 'text') return 'Text'
  if (domain === 'frame') return 'Frame'
  if (domain === 'shape') return 'Shape'
  if (domain === 'mixed') return 'Selection'
  return 'Properties'
}

export type StrokeFillLayer = Extract<DesignLayer, { type: 'rectangle' | 'diamond' | 'ellipse' | 'frame' }>

export function getStrokeFillLayer(layer: DesignLayer): StrokeFillLayer | null {
  if (
    layer.type === 'rectangle' ||
    layer.type === 'diamond' ||
    layer.type === 'ellipse' ||
    layer.type === 'frame'
  ) {
    return layer
  }

  return null
}

export function getPrimarySelectedLayer(
  design: IconDesign,
  selectedLayerIds: DesignLayer['id'][],
): DesignLayer | null {
  if (selectedLayerIds.length === 0) {
    return design.layers.find((layer) => layer.type === 'background') ?? null
  }

  if (selectedLayerIds.length > 1) return null

  return design.layers.find((layer) => layer.id === selectedLayerIds[0]) ?? null
}

export function getPropertiesStyleDomain(
  design: IconDesign,
  selectedLayerIds: DesignLayer['id'][],
): CanvasStyleDomain {
  if (selectedLayerIds.length === 0) return 'canvas'
  if (selectedLayerIds.length > 1) return 'mixed'

  const layer = design.layers.find((candidate) => candidate.id === selectedLayerIds[0])
  if (!layer || layer.type === 'background') return 'canvas'
  return getCanvasStyleDomain(layer)
}