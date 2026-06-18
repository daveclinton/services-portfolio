import type { DesignLayer, FrameLayer, ShapeLayer } from '../types'

export type CanvasStyleDomain = 'canvas' | 'text' | 'shape' | 'frame'

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
  return 'Shape'
}

export type StrokeFillLayer = ShapeLayer | FrameLayer

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