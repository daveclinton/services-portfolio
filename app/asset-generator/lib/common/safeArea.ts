import { ICON_SIZE, SAFE_AREA_SIZE } from './constants'
import { getElementBounds } from '../element/bounds'
import type { AssetElement } from '../element/types'

export type SafeAreaBounds = {
  x: number
  y: number
  width: number
  height: number
}

export function getSafeAreaBounds(): SafeAreaBounds {
  const margin = (ICON_SIZE - SAFE_AREA_SIZE) / 2

  return {
    x: margin,
    y: margin,
    width: SAFE_AREA_SIZE,
    height: SAFE_AREA_SIZE,
  }
}

export function isElementInsideSafeArea(element: AssetElement) {
  const safeArea = getSafeAreaBounds()
  const bounds = getElementBounds(element)

  return (
    bounds.minX >= safeArea.x &&
    bounds.minY >= safeArea.y &&
    bounds.maxX <= safeArea.x + safeArea.width &&
    bounds.maxY <= safeArea.y + safeArea.height
  )
}

export function getElementsOutsideSafeArea(elements: readonly AssetElement[]) {
  return elements.filter((element) => !isElementInsideSafeArea(element))
}

export function hasSafeAreaViolations(elements: readonly AssetElement[]) {
  return getElementsOutsideSafeArea(elements).length > 0
}