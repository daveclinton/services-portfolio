import { describe, expect, it } from 'vitest'
import { DEFAULT_ELEMENT_PROPS } from './defaults'
import { newRectangleElement } from '../element/newElement'
import {
  getElementsOutsideSafeArea,
  getSafeAreaBounds,
  hasSafeAreaViolations,
  isElementInsideSafeArea,
} from './safeArea'

const baseOpts = {
  strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
  backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
  strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
}

describe('safeArea', () => {
  it('returns the centered 820px safe bounds', () => {
    expect(getSafeAreaBounds()).toEqual({
      x: 102,
      y: 102,
      width: 820,
      height: 820,
    })
  })

  it('detects elements outside the safe area', () => {
    const inside = newRectangleElement({
      ...baseOpts,
      x: 200,
      y: 200,
      width: 100,
      height: 100,
    })

    const outside = newRectangleElement({
      ...baseOpts,
      x: 20,
      y: 20,
      width: 100,
      height: 100,
    })

    expect(isElementInsideSafeArea(inside)).toBe(true)
    expect(isElementInsideSafeArea(outside)).toBe(false)
    expect(hasSafeAreaViolations([inside, outside])).toBe(true)
    expect(getElementsOutsideSafeArea([inside, outside])).toEqual([outside])
  })
})