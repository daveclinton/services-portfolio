import { describe, expect, it } from 'vitest'
import { resetTestIds } from '../common/random'
import { newRectangleElement } from './newElement'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { dragElement, resizeElement } from './transform'

const baseOpts = {
  x: 100,
  y: 100,
  width: 200,
  height: 120,
  strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
  backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
  strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
}

describe('transform', () => {
  it('drags an element by pointer delta', () => {
    resetTestIds()
    const element = newRectangleElement(baseOpts)

    const next = dragElement(element, element, { x: 110, y: 120 }, 160, 180)

    expect(next).toMatchObject({
      x: 150,
      y: 160,
      width: 200,
      height: 120,
    })
  })

  it('resizes from the south-east handle', () => {
    resetTestIds()
    const element = newRectangleElement(baseOpts)

    const next = resizeElement(element, 'se', 360, 280, element)

    expect(next).toMatchObject({
      x: 100,
      y: 100,
      width: 260,
      height: 180,
    })
  })

  it('normalizes negative resize dimensions', () => {
    resetTestIds()
    const element = newRectangleElement(baseOpts)

    const next = resizeElement(element, 'nw', 220, 140, element)

    expect(next.x).toBe(220)
    expect(next.y).toBe(140)
    expect(next.width).toBe(80)
    expect(next.height).toBe(80)
  })
})