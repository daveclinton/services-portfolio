import type { AssetElement } from './types'

export function getElementBounds(element: AssetElement) {
  return {
    minX: element.x,
    minY: element.y,
    maxX: element.x + element.width,
    maxY: element.y + element.height,
  }
}

export function getCommonBounds(elements: readonly AssetElement[]) {
  if (elements.length === 0) {
    return [0, 0, 0, 0] as const
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const element of elements) {
    const bounds = getElementBounds(element)
    minX = Math.min(minX, bounds.minX)
    minY = Math.min(minY, bounds.minY)
    maxX = Math.max(maxX, bounds.maxX)
    maxY = Math.max(maxY, bounds.maxY)
  }

  return [minX, minY, maxX, maxY] as const
}