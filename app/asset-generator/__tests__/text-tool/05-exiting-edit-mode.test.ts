import { describe, expect, it } from 'vitest'
import { createInitialTextToolState } from '../../lib/text-tool'
import { createTextPoint, runTextToolActions } from '../../testing/text-tool-helpers'

describe('Text Tool – 5. Exiting Edit Mode', () => {
  function editingState() {
    return createTextPoint(createInitialTextToolState(), { x: 100, y: 100 })
  }

  it('5.1 clicking elsewhere on canvas exits edit mode', () => {
    const state = runTextToolActions(editingState(), [{ type: 'CANVAS_CLICK_OUTSIDE' }])

    expect(state.isEditing).toBe(false)
    expect(state.editingId).toBeNull()
  })

  it('5.2 pressing Escape exits edit mode', () => {
    const state = runTextToolActions(editingState(), [{ type: 'KEY_ESCAPE' }])

    expect(state.isEditing).toBe(false)
    expect(state.editingId).toBeNull()
  })

  it('5.3 clicking Selection tool exits edit mode', () => {
    const state = runTextToolActions(editingState(), [{ type: 'SELECT_TOOL', tool: 'select' }])

    expect(state.isEditing).toBe(false)
  })

  it('5.4 text becomes selectable object after exiting edit mode', () => {
    const state = runTextToolActions(editingState(), [{ type: 'KEY_ESCAPE' }])

    expect(state.showBoundingBox).toBe(true)
    expect(state.showResizeHandles).toBe(true)
    expect(state.selectedIds).toHaveLength(1)
  })
})