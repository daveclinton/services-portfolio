import { describe, expect, it } from 'vitest'
import { createInitialRectangleToolState, drawRectangle, getSelectedRectangle, runRectangleActions } from '../../testing/rectangle-tool-helpers'

describe('Rectangle Tool – 6. Behavior After Creation', () => {
  it('6.1 rectangle remains selected after creation', () => {
    const state = drawRectangle(createInitialRectangleToolState(), { x: 20, y: 20 }, { x: 120, y: 100 })
    expect(state.selectedIds).toHaveLength(1)
    expect(state.showResizeHandles).toBe(true)
  })

  it('6.2 rectangle is ready to be styled immediately', () => {
    const created = drawRectangle(createInitialRectangleToolState(), { x: 0, y: 0 }, { x: 80, y: 60 })
    const id = created.selectedIds[0]
    const styled = runRectangleActions(created, [{ type: 'UPDATE_STYLE', id, patch: { fillColor: '#abcdef' } }])

    expect(getSelectedRectangle(styled)?.fillColor).toBe('#abcdef')
  })

  it('6.3 rectangle can be duplicated', () => {
    const created = drawRectangle(createInitialRectangleToolState(), { x: 50, y: 50 }, { x: 150, y: 130 })
    const id = created.selectedIds[0]
    const duplicated = runRectangleActions(created, [{ type: 'DUPLICATE_RECTANGLE', id }])

    expect(duplicated.rectangles).toHaveLength(2)
    expect(duplicated.selectedIds[0]).not.toBe(id)
  })

  it('6.4 rectangle can be deleted', () => {
    const created = drawRectangle(createInitialRectangleToolState(), { x: 10, y: 10 }, { x: 90, y: 70 })
    const id = created.selectedIds[0]
    const deleted = runRectangleActions(created, [{ type: 'DELETE_RECTANGLE', id }])

    expect(deleted.rectangles).toHaveLength(0)
    expect(deleted.selectedIds).toHaveLength(0)
  })
})