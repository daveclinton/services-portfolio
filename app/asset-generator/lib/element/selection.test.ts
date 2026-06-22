import { describe, expect, it } from 'vitest'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { resetTestIds } from '../common/random'
import { newRectangleElement } from './newElement'
import {
  getElementAtPosition,
  getPrimarySelectedElement,
  getSelectedElements,
  getSelectedElementsWithinBox,
  isMultiSelection,
  toggleSelection,
} from './selection'

const baseOpts = {
  strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
  backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
  strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
}

describe('selection helpers', () => {
  it('toggles ids in and out of the selection set', () => {
    resetTestIds()

    const first = newRectangleElement({ ...baseOpts, x: 0, y: 0, width: 40, height: 40 })
    const second = newRectangleElement({ ...baseOpts, x: 50, y: 50, width: 40, height: 40 })

    let selected = toggleSelection({}, first.id)
    expect(selected).toEqual({ [first.id]: true })

    selected = toggleSelection(selected, second.id)
    expect(isMultiSelection(selected)).toBe(true)

    selected = toggleSelection(selected, first.id)
    expect(selected).toEqual({ [second.id]: true })
  })

  it('returns the most recently selected element as primary', () => {
    resetTestIds()

    const first = newRectangleElement({ ...baseOpts, x: 0, y: 0, width: 40, height: 40 })
    const second = newRectangleElement({ ...baseOpts, x: 50, y: 50, width: 40, height: 40 })
    const selected = {
      [first.id]: true as const,
      [second.id]: true as const,
    }

    expect(getPrimarySelectedElement([first, second], selected)?.id).toBe(second.id)
    expect(getSelectedElements([first, second], selected)).toHaveLength(2)
  })

  it('returns the top-most element at a point', () => {
    resetTestIds()

    const bottom = newRectangleElement({ ...baseOpts, x: 0, y: 0, width: 200, height: 200 })
    const top = newRectangleElement({ ...baseOpts, x: 50, y: 50, width: 100, height: 100 })

    expect(getElementAtPosition([bottom, top], 75, 75)?.id).toBe(top.id)
  })

  it('selects elements fully contained by a selection box', () => {
    resetTestIds()

    const contained = newRectangleElement({ ...baseOpts, x: 20, y: 20, width: 40, height: 40 })
    const partial = newRectangleElement({ ...baseOpts, x: 80, y: 80, width: 40, height: 40 })

    expect(
      getSelectedElementsWithinBox([contained, partial], {
        x: 10,
        y: 10,
        width: 90,
        height: 90,
      }).map((element) => element.id),
    ).toEqual([contained.id])
  })
})
