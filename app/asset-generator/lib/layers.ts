import type { DesignLayer, FrameLayer, ShapeLayer, IconDesign } from '../types'

export function getFrameLayers(design: IconDesign): FrameLayer[] {
  return design.layers.filter((layer): layer is FrameLayer => layer.type === 'frame')
}

export function getShapeLayers(design: IconDesign): ShapeLayer[] {
  return design.layers.filter((layer): layer is ShapeLayer => layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse')
}

export function getFrameLayer(design: IconDesign, layerId: DesignLayer['id']): FrameLayer | null {
  const layer = design.layers.find((candidate) => candidate.id === layerId)
  return layer?.type === 'frame' ? layer : null
}

export function getShapeLayer(design: IconDesign, layerId: DesignLayer['id']): ShapeLayer | null {
  const layer = design.layers.find((candidate) => candidate.id === layerId)
  return layer?.type === 'rectangle' || layer?.type === 'diamond' || layer?.type === 'ellipse' ? layer : null
}

export function getTextLayer(design: IconDesign) {
  const layer = design.layers.find((candidate) => candidate.id === 'text')
  return layer?.type === 'text' ? layer : null
}
