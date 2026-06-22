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

function constrainResizeToAspectRatio(
  x: number,
  y: number,
  width: number,
  height: number,
  handle: TransformHandleDirection,
  origin: AssetElement,
) {
  const aspectRatio = origin.width / origin.height

  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return { x, y, width, height }
  }

  const widthSign = width < 0 ? -1 : 1
  const heightSign = height < 0 ? -1 : 1
  let nextWidth = Math.abs(width)
  let nextHeight = Math.abs(height)

  if (handle === 'e' || handle === 'w') {
    nextHeight = nextWidth / aspectRatio
  } else if (handle === 'n' || handle === 's') {
    nextWidth = nextHeight * aspectRatio
  } else if (nextWidth / Math.max(nextHeight, 1) > aspectRatio) {
    nextHeight = nextWidth / aspectRatio
  } else {
    nextWidth = nextHeight * aspectRatio
  }

  if (handle === 'e' || handle === 'w') {
    y = origin.y + origin.height / 2 - nextHeight / 2
  }

  if (handle === 'n' || handle === 's') {
    x = origin.x + origin.width / 2 - nextWidth / 2
  }

  if (handle.includes('w')) {
    x = origin.x + origin.width - nextWidth * widthSign
  }

  if (handle.includes('n')) {
    y = origin.y + origin.height - nextHeight * heightSign
  }

  return {
    x,
    y,
    width: nextWidth * widthSign,
    height: nextHeight * heightSign,
  }
}

export function resizeElement(
  element: AssetElement,
  handle: TransformHandleDirection,
  pointerX: number,
  pointerY: number,
  origin: AssetElement,
  maintainAspectRatio = false,
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

  if (maintainAspectRatio) {
    const constrained = constrainResizeToAspectRatio(
      x,
      y,
      width,
      height,
      handle,
      origin,
    )
    x = constrained.x
    y = constrained.y
    width = constrained.width
    height = constrained.height
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
