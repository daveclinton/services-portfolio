import type { RectangleObject } from './types'

export const RECTANGLE_TOOL_DEFAULTS = {
  fillColor: '#ffffff',
  fillOpacity: 1,
  strokeColor: '#1e1e1e',
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  cornerRadius: 0,
  rotation: 0,
  blendMode: 'normal',
}

export const MIN_RECTANGLE_SIZE = 24

let nextRectangleId = 1

export function resetRectangleIdCounter() {
  nextRectangleId = 1
}

export function createRectangleId() {
  const id = `rect-${nextRectangleId}`
  nextRectangleId += 1
  return id
}

export function createDefaultRectangle(rect: { x: number; y: number; width: number; height: number }): RectangleObject {
  return {
    id: createRectangleId(),
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fillColor: RECTANGLE_TOOL_DEFAULTS.fillColor,
    fillOpacity: RECTANGLE_TOOL_DEFAULTS.fillOpacity,
    strokeColor: RECTANGLE_TOOL_DEFAULTS.strokeColor,
    strokeWidth: RECTANGLE_TOOL_DEFAULTS.strokeWidth,
    strokeStyle: RECTANGLE_TOOL_DEFAULTS.strokeStyle,
    cornerRadius: RECTANGLE_TOOL_DEFAULTS.cornerRadius,
    rotation: RECTANGLE_TOOL_DEFAULTS.rotation,
    shadow: null,
    blendMode: RECTANGLE_TOOL_DEFAULTS.blendMode,
    gradientFill: null,
  }
}