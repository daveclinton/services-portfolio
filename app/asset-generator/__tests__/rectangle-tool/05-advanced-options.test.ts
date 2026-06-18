import { describe, expect, it } from 'vitest'
import { createInitialRectangleToolState, drawRectangle, getSelectedRectangle, runRectangleActions } from '../../testing/rectangle-tool-helpers'

describe('Rectangle Tool – 5. Advanced Options', () => {
  function selected() {
    return drawRectangle(createInitialRectangleToolState(), { x: 0, y: 0 }, { x: 100, y: 80 })
  }

  it('5.1 supports per-corner radius values independently', () => {
    const state = runRectangleActions(selected(), [
      { type: 'UPDATE_STYLE', patch: { cornerRadius: { topLeft: 2, topRight: 4, bottomRight: 6, bottomLeft: 8 } } },
    ])

    expect(getSelectedRectangle(state)?.cornerRadius).toEqual({
      topLeft: 2,
      topRight: 4,
      bottomRight: 6,
      bottomLeft: 8,
    })
  })

  it('5.2 supports gradient fill configuration', () => {
    const state = runRectangleActions(selected(), [
      {
        type: 'UPDATE_STYLE',
        patch: {
          gradientFill: { type: 'linear', angle: 45, stops: [{ offset: 0, color: '#111111' }] },
        },
      },
    ])

    expect(getSelectedRectangle(state)?.gradientFill?.angle).toBe(45)
  })

  it('5.3 supports blend mode for transparency effects', () => {
    const state = runRectangleActions(selected(), [{ type: 'UPDATE_STYLE', patch: { blendMode: 'multiply' } }])
    expect(getSelectedRectangle(state)?.blendMode).toBe('multiply')
  })
})