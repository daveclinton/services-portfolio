import { describe, expect, it } from 'vitest'
import { createInitialRectangleToolState, drawRectangle, getSelectedRectangle, runRectangleActions } from '../../testing/rectangle-tool-helpers'

describe('Rectangle Tool – 4. Resizing & Manipulation', () => {
  function baseRectangle() {
    return drawRectangle(createInitialRectangleToolState(), { x: 100, y: 100 }, { x: 220, y: 180 })
  }

  it('4.1 corner resize updates width and height', () => {
    const id = baseRectangle().selectedIds[0]
    const state = runRectangleActions(baseRectangle(), [{ type: 'RESIZE_RECTANGLE', id, width: 200, height: 120 }])

    expect(getSelectedRectangle(state)).toMatchObject({ width: 200, height: 120 })
  })

  it('4.2 Shift while resizing maintains aspect ratio', () => {
    const id = baseRectangle().selectedIds[0]
    const state = runRectangleActions(baseRectangle(), [
      { type: 'RESIZE_RECTANGLE', id, width: 200, height: 80, lockAspectRatio: true },
    ])
    const rectangle = getSelectedRectangle(state)

    expect(rectangle?.width / rectangle!.height).toBeCloseTo(120 / 80, 5)
  })

  it('4.3 double-click corner radius handle toggles rounded corners', () => {
    const id = baseRectangle().selectedIds[0]
    const rounded = runRectangleActions(baseRectangle(), [{ type: 'TOGGLE_ROUNDED_CORNERS', id }])
    const square = runRectangleActions(rounded, [{ type: 'TOGGLE_ROUNDED_CORNERS', id }])

    expect(getSelectedRectangle(rounded)?.cornerRadius).toBe(12)
    expect(getSelectedRectangle(square)?.cornerRadius).toBe(0)
  })

  it('4.4 rotation handle updates rectangle rotation', () => {
    const id = baseRectangle().selectedIds[0]
    const state = runRectangleActions(baseRectangle(), [{ type: 'ROTATE_RECTANGLE', id, rotation: 45 }])

    expect(getSelectedRectangle(state)?.rotation).toBe(45)
  })

  it('4.5 selected rectangle can be moved', () => {
    const id = baseRectangle().selectedIds[0]
    const state = runRectangleActions(baseRectangle(), [{ type: 'MOVE_RECTANGLE', id, x: 40, y: 60 }])

    expect(getSelectedRectangle(state)).toMatchObject({ x: 40, y: 60 })
  })
})