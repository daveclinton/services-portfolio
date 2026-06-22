import type { AssetElement } from './types'

function swapElements(
  elements: readonly AssetElement[],
  firstIndex: number,
  secondIndex: number,
) {
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= elements.length || secondIndex >= elements.length) {
    return [...elements]
  }

  const next = [...elements]
  const [first] = next.splice(firstIndex, 1)
  next.splice(secondIndex, 0, first)
  return next
}

export function getElementIndex(elements: readonly AssetElement[], elementId: string) {
  return elements.findIndex((element) => element.id === elementId)
}

export function bringForward(elements: readonly AssetElement[], elementId: string) {
  const index = getElementIndex(elements, elementId)
  if (index < 0 || index >= elements.length - 1) {
    return [...elements]
  }

  return swapElements(elements, index, index + 1)
}

export function sendBackward(elements: readonly AssetElement[], elementId: string) {
  const index = getElementIndex(elements, elementId)
  if (index <= 0) {
    return [...elements]
  }

  return swapElements(elements, index, index - 1)
}

export function bringToFront(elements: readonly AssetElement[], elementId: string) {
  const index = getElementIndex(elements, elementId)
  if (index < 0 || index === elements.length - 1) {
    return [...elements]
  }

  const next = [...elements]
  const [element] = next.splice(index, 1)
  next.push(element)
  return next
}

export function sendToBack(elements: readonly AssetElement[], elementId: string) {
  const index = getElementIndex(elements, elementId)
  if (index <= 0) {
    return [...elements]
  }

  const next = [...elements]
  const [element] = next.splice(index, 1)
  next.unshift(element)
  return next
}