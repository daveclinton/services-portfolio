import { describe, expect, it } from 'vitest'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { resetTestIds } from '../common/random'
import { newRectangleElement } from './newElement'
import { bringForward, bringToFront, sendBackward, sendToBack } from './zOrder'

const baseOpts = {
  strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
  backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
  strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
}

describe('zOrder', () => {
  it('moves elements forward and backward', () => {
    resetTestIds()

    const back = newRectangleElement({ ...baseOpts, x: 0, y: 0, width: 10, height: 10 })
    const middle = newRectangleElement({ ...baseOpts, x: 10, y: 10, width: 10, height: 10 })
    const front = newRectangleElement({ ...baseOpts, x: 20, y: 20, width: 10, height: 10 })
    const elements = [back, middle, front]

    expect(bringForward(elements, middle.id).map((element) => element.id)).toEqual([
      back.id,
      front.id,
      middle.id,
    ])

    expect(sendBackward(elements, middle.id).map((element) => element.id)).toEqual([
      middle.id,
      back.id,
      front.id,
    ])
  })

  it('moves elements to front and back', () => {
    resetTestIds()

    const back = newRectangleElement({ ...baseOpts, x: 0, y: 0, width: 10, height: 10 })
    const middle = newRectangleElement({ ...baseOpts, x: 10, y: 10, width: 10, height: 10 })
    const front = newRectangleElement({ ...baseOpts, x: 20, y: 20, width: 10, height: 10 })
    const elements = [back, middle, front]

    expect(bringToFront(elements, back.id).map((element) => element.id)).toEqual([
      middle.id,
      front.id,
      back.id,
    ])

    expect(sendToBack(elements, front.id).map((element) => element.id)).toEqual([
      front.id,
      back.id,
      middle.id,
    ])
  })
})