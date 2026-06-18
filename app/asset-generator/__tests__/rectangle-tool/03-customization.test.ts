import { describe, expect, it } from 'vitest'
import { createInitialRectangleToolState, drawRectangle, getSelectedRectangle, runRectangleActions } from '../../testing/rectangle-tool-helpers'

describe('Rectangle Tool – 3. Rectangle Customization', () => {
  function selectedRectangle() {
    return drawRectangle(createInitialRectangleToolState(), { x: 40, y: 40 }, { x: 160, y: 120 })
  }

  it('3.1 fill color and opacity update', () => {
    const state = runRectangleActions(selectedRectangle(), [
      { type: 'UPDATE_STYLE', patch: { fillColor: '#ff0000', fillOpacity: 0.5 } },
    ])

    expect(getSelectedRectangle(state)).toMatchObject({ fillColor: '#ff0000', fillOpacity: 0.5 })
  })

  it('3.2 stroke color, thickness, and style update', () => {
    const state = runRectangleActions(selectedRectangle(), [
      { type: 'UPDATE_STYLE', patch: { strokeColor: '#00ff00', strokeWidth: 4, strokeStyle: 'dashed' } },
    ])

    expect(getSelectedRectangle(state)).toMatchObject({
      strokeColor: '#00ff00',
      strokeWidth: 4,
      strokeStyle: 'dashed',
    })
  })

  it('3.3 corner radius updates', () => {
    const state = runRectangleActions(selectedRectangle(), [{ type: 'UPDATE_STYLE', patch: { cornerRadius: 16 } }])
    expect(getSelectedRectangle(state)?.cornerRadius).toBe(16)
  })

  it('3.4 per-corner radius updates', () => {
    const state = runRectangleActions(selectedRectangle(), [
      {
        type: 'UPDATE_STYLE',
        patch: { cornerRadius: { topLeft: 4, topRight: 8, bottomRight: 12, bottomLeft: 16 } },
      },
    ])

    expect(getSelectedRectangle(state)?.cornerRadius).toEqual({
      topLeft: 4,
      topRight: 8,
      bottomRight: 12,
      bottomLeft: 16,
    })
  })

  it('3.5 shadow settings update', () => {
    const state = runRectangleActions(selectedRectangle(), [
      {
        type: 'UPDATE_STYLE',
        patch: { shadow: { blur: 8, offsetX: 2, offsetY: 4, color: '#000000', opacity: 0.25 } },
      },
    ])

    expect(getSelectedRectangle(state)?.shadow).toMatchObject({ blur: 8, offsetX: 2, offsetY: 4 })
  })

  it('3.6 exact width and height inputs update size', () => {
    const id = selectedRectangle().selectedIds[0]
    const state = runRectangleActions(selectedRectangle(), [{ type: 'SET_SIZE', id, width: 220, height: 140 }])

    expect(getSelectedRectangle(state)).toMatchObject({ width: 220, height: 140 })
  })

  it('3.7 X/Y coordinates update position', () => {
    const id = selectedRectangle().selectedIds[0]
    const state = runRectangleActions(selectedRectangle(), [{ type: 'SET_POSITION', id, x: 300, y: 250 }])

    expect(getSelectedRectangle(state)).toMatchObject({ x: 300, y: 250 })
  })

  it('3.8 gradient fill can replace solid fill', () => {
    const state = runRectangleActions(selectedRectangle(), [
      {
        type: 'UPDATE_STYLE',
        patch: {
          gradientFill: {
            type: 'linear',
            angle: 90,
            stops: [
              { offset: 0, color: '#ffffff' },
              { offset: 1, color: '#000000' },
            ],
          },
        },
      },
    ])

    expect(getSelectedRectangle(state)?.gradientFill?.stops).toHaveLength(2)
  })
})