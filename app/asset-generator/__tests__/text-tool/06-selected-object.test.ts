import { describe, expect, it } from 'vitest'
import { createInitialTextToolState } from '../../lib/text-tool'
import { createTextPoint, getSelectedObject, runTextToolActions } from '../../testing/text-tool-helpers'

describe('Text Tool – 6. Selected Text Object (Not in Edit Mode)', () => {
  function selectedState() {
    const created = createTextPoint(createInitialTextToolState(), { x: 50, y: 50 })
    return runTextToolActions(created, [{ type: 'KEY_ESCAPE' }])
  }

  it('6.1 selection handles appear when text is selected', () => {
    const state = selectedState()

    expect(state.showResizeHandles).toBe(true)
    expect(state.showBoundingBox).toBe(true)
  })

  it('6.2 selected text can be moved by dragging', () => {
    const base = selectedState()
    const id = base.textObjects[0].id
    const moved = runTextToolActions(base, [{ type: 'MOVE_TEXT', id, x: 120, y: 140 }])

    expect(moved.textObjects[0]).toMatchObject({ x: 120, y: 140 })
  })

  it('6.3 selected text can be resized', () => {
    const base = selectedState()
    const id = base.textObjects[0].id
    const resized = runTextToolActions(base, [{ type: 'RESIZE_TEXT', id, width: 180, height: 64 }])

    expect(resized.textObjects[0]).toMatchObject({ width: 180, height: 64 })
    expect(resized.showDimensionIndicators).toBe(true)
  })

  it('6.4 selected text can be deleted', () => {
    const base = selectedState()
    const id = base.textObjects[0].id
    const deleted = runTextToolActions(base, [{ type: 'DELETE_TEXT', id }])

    expect(deleted.textObjects).toHaveLength(0)
    expect(deleted.selectedIds).toHaveLength(0)
  })

  it('6.5 double-clicking selected text re-enters edit mode', () => {
    const base = selectedState()
    const id = base.textObjects[0].id
    const editing = runTextToolActions(base, [{ type: 'DOUBLE_CLICK_TEXT', id }])

    expect(editing.isEditing).toBe(true)
    expect(editing.editingId).toBe(id)
  })

  it('6.6 properties panel values match selected text', () => {
    const base = selectedState()
    const id = base.textObjects[0].id
    const styled = runTextToolActions(base, [
      { type: 'UPDATE_STYLE', id, patch: { fontSize: 22, color: '#abcdef', textAlign: 'right' } },
    ])
    const object = getSelectedObject(styled)

    expect(object).toMatchObject({ fontSize: 22, color: '#abcdef', textAlign: 'right' })
  })
})