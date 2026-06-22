import { MIN_ELEMENT_SIZE } from '../common/constants'
import { newElementWith } from './mutateElement'
import type { TransformHandleDirection } from './transformHandles'
import type { AssetElement } from './types'

function normalizeDimensions(x: number, y: number, width: number, height: number) {
  let nextX = x
  let nextY = y
  let nextWidth = width
  let nextHeight = height

  if (nextWidth < 0) {
    nextX += nextWidth
    nextWidth = Math.abs(nextWidth)
  }

  if (nextHeight < 0) {
    nextY += nextHeight
    nextHeight = Math.abs(nextHeight)
  }

  return {
    x: nextX,
    y: nextY,
    width: Math.max(MIN_ELEMENT_SIZE, nextWidth),
    height: Math.max(MIN_ELEMENT_SIZE, nextHeight),
  }
}

export function resizeElement(
  element: AssetElement,
  handle: TransformHandleDirection,
  pointerX: number,
  pointerY: number,
  origin: AssetElement,
): AssetElement {
  let { x, y, width, height } = origin

  if (handle.includes('e')) {
    width = pointerX - x
  }

  if (handle.includes('w')) {
    const nextX = pointerX
    width = origin.x + origin.width - nextX
    x = nextX
  }

  if (handle.includes('s')) {
    height = pointerY - y
  }

  if (handle.includes('n')) {
    const nextY = pointerY
    height = origin.y + origin.height - nextY
    y = nextY
  }

  return newElementWith(element, normalizeDimensions(x, y, width, height))
}

export function dragElement(
  element: AssetElement,
  origin: AssetElement,
  pointerOrigin: { x: number; y: number },
  pointerX: number,
  pointerY: number,
): AssetElement {
  const dx = pointerX - pointerOrigin.x
  const dy = pointerY - pointerOrigin.y

  return newElementWith(element, {
    x: origin.x + dx,
    y: origin.y + dy,
  })
}

export function dragSelectedElements(
  elements: readonly AssetElement[],
  originalElements: Record<string, AssetElement>,
  pointerOrigin: { x: number; y: number },
  pointerX: number,
  pointerY: number,
) {
  const dx = pointerX - pointerOrigin.x
  const dy = pointerY - pointerOrigin.y

  return elements.map((element) => {
    const origin = originalElements[element.id]
    if (!origin) {
      return element
    }

    return newElementWith(element, {
      x: origin.x + dx,
      y: origin.y + dy,
    })
  })
}

export function updateElementText(element: AssetElement, text: string): AssetElement {
  return newElementWith(element, { text })
}