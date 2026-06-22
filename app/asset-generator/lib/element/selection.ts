import { MIN_ELEMENT_SIZE } from '../common/constants'
import type { AssetElement } from './types'

export function hitTestElement(element: AssetElement, x: number, y: number) {
  return (
    x >= element.x &&
    x <= element.x + element.width &&
    y >= element.y &&
    y <= element.y + element.height
  )
}

export function getElementAtPosition(
  elements: readonly AssetElement[],
  x: number,
  y: number,
) {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index]
    if (hitTestElement(element, x, y)) {
      return element
    }
  }

  return null
}

export function isElementLargeEnough(element: AssetElement) {
  if (element.type === 'text' || element.type === 'image') {
    return true
  }

  return element.width >= MIN_ELEMENT_SIZE && element.height >= MIN_ELEMENT_SIZE
}

export function getSelectedElementIds(selectedElementIds: Record<string, true>) {
  return Object.keys(selectedElementIds)
}

export function getSelectedElements(
  elements: readonly AssetElement[],
  selectedElementIds: Record<string, true>,
) {
  const selectedIds = new Set(getSelectedElementIds(selectedElementIds))
  return elements.filter((element) => selectedIds.has(element.id))
}

export function isMultiSelection(selectedElementIds: Record<string, true>) {
  return getSelectedElementIds(selectedElementIds).length > 1
}

export function isElementSelected(selectedElementIds: Record<string, true>, elementId: string) {
  return Boolean(selectedElementIds[elementId])
}

export function selectOnly(elementId: string) {
  return { [elementId]: true as const }
}

export function addToSelection(
  selectedElementIds: Record<string, true>,
  elementId: string,
) {
  return {
    ...selectedElementIds,
    [elementId]: true as const,
  }
}

export function toggleSelection(
  selectedElementIds: Record<string, true>,
  elementId: string,
) {
  if (selectedElementIds[elementId]) {
    const next = { ...selectedElementIds }
    delete next[elementId]
    return next as Record<string, true>
  }

  return addToSelection(selectedElementIds, elementId)
}

export function getPrimarySelectedElement(
  elements: readonly AssetElement[],
  selectedElementIds: Record<string, true>,
) {
  const selected = getSelectedElements(elements, selectedElementIds)
  return selected[selected.length - 1] ?? null
}