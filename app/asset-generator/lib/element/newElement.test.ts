import { describe, expect, it } from 'vitest'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { resetTestIds } from '../common/random'
import { newElement, newRectangleElement, normalizeRect } from './newElement'
import { getElementAtPosition, isElementLargeEnough } from './selection'

const baseOpts = {
  x: 0,
  y: 0,
  strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
  backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
  strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
}

describe('newElement', () => {
  it('normalizes rectangles drawn in any direction', () => {
    expect(normalizeRect(100, 200, 40, 60)).toEqual({
      x: 40,
      y: 60,
      width: 60,
      height: 140,
    })
  })

  it('creates versioned elements with stable ids in tests', () => {
    resetTestIds()

    const element = newRectangleElement({
      ...baseOpts,
      x: 12,
      y: 24,
      strokeColor: '#111111',
      backgroundColor: '#ffffff',
    })

    expect(element).toMatchObject({
      id: 'id0',
      type: 'rectangle',
      x: 12,
      y: 24,
      version: 1,
      strokeColor: '#111111',
      backgroundColor: '#ffffff',
    })
    expect(element.seed).toBeTypeOf('number')
  })

  it('uses the same factory signature as early Excalidraw', () => {
    resetTestIds()

    const element = newElement('rectangle', {
      ...baseOpts,
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    })

    expect(element.type).toBe('rectangle')
    expect(element.id).toBe('id0')
  })

  it('selects the top-most element at a point', () => {
    resetTestIds()

    const elements = [
      newRectangleElement({ ...baseOpts, x: 0, y: 0, width: 200, height: 200 }),
      newRectangleElement({ ...baseOpts, x: 50, y: 50, width: 100, height: 100 }),
    ]

    expect(getElementAtPosition(elements, 60, 60)?.id).toBe(elements[1].id)
  })

  it('requires a minimum size for shape elements', () => {
    expect(
      isElementLargeEnough(
        newRectangleElement({ ...baseOpts, x: 0, y: 0, width: 2, height: 2 }),
      ),
    ).toBe(false)
  })
})