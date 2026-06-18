import { describe, expect, it } from 'vitest'
import { createInitialTextToolState } from '../../lib/text-tool'
import { createTextBox, createTextPoint, runTextToolActions } from '../../testing/text-tool-helpers'

describe('Text Tool – 7. Visual Feedback', () => {
  it('7.1 baseline guides appear while editing text', () => {
    const state = createTextPoint(createInitialTextToolState(), { x: 10, y: 10 })

    expect(state.showBaselineGuides).toBe(true)
  })

  it('7.2 text box shows dimension indicators while editing/resizing', () => {
    const boxed = createTextBox(createInitialTextToolState(), { x: 0, y: 0 }, { x: 140, y: 90 })

    expect(boxed.showDimensionIndicators).toBe(true)
  })

  it('7.3 cursor position is tracked during editing', () => {
    const state = runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 0, y: 0 }), [
      { type: 'INSERT_TEXT', value: 'cursor' },
    ])

    expect(state.selectionStart).toBe(6)
    expect(state.selectionEnd).toBe(6)
    expect(state.isEditing).toBe(true)
  })

  it('7.4 selection highlight is shown in edit mode', () => {
    const state = runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 0, y: 0 }), [
      { type: 'INSERT_TEXT', value: 'highlight' },
      { type: 'SET_SELECTION', start: 0, end: 4 },
    ])

    expect(state.showSelectionHighlight).toBe(true)
  })

  it('7.5 text boundaries are visible when object is selected', () => {
    const state = runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 25, y: 25 }), [
      { type: 'KEY_ESCAPE' },
    ])

    expect(state.showBoundingBox).toBe(true)
    expect(state.selectedIds).toHaveLength(1)
  })
})