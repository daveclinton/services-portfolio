import { describe, expect, it } from 'vitest'
import { CURSOR_TEXT, createInitialTextToolState, getCanvasCursorForTool, textToolReducer } from '../../lib/text-tool'
import { activateTextTool, createTextPoint } from '../../testing/text-tool-helpers'

describe('Text Tool – 1. Selection & Activation', () => {
  it('1.1 clicking the T icon activates the Text tool', () => {
    const state = createInitialTextToolState()
    const next = textToolReducer(state, { type: 'SELECT_TOOL', tool: 'text' })

    expect(next.activeTool).toBe('text')
  })

  it('1.2 pressing T activates the Text tool from another tool', () => {
    const state = textToolReducer(createInitialTextToolState(), { type: 'SELECT_TOOL', tool: 'rectangle' })
    const next = textToolReducer(state, { type: 'KEY_T' })

    expect(next.activeTool).toBe('text')
  })

  it('1.3 cursor becomes I-beam when Text tool is active', () => {
    const state = activateTextTool()

    expect(state.canvasCursor).toBe(CURSOR_TEXT)
    expect(getCanvasCursorForTool('text')).toBe('text')
  })

  it('1.4 clicking canvas while Text tool is active starts text creation', () => {
    const state = createTextPoint(createInitialTextToolState(), { x: 120, y: 200 })

    expect(state.textObjects).toHaveLength(1)
    expect(state.isEditing).toBe(true)
    expect(state.textObjects[0].x).toBe(120)
    expect(state.textObjects[0].y).toBe(200)
  })

  it('1.5 double-clicking existing text enters edit mode', () => {
    const created = createTextPoint(createInitialTextToolState(), { x: 80, y: 80 })
    const exited = textToolReducer(created, { type: 'KEY_ESCAPE' })
    const next = textToolReducer(exited, {
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 90, y: 90 },
      isDoubleClick: true,
    })

    expect(next.isEditing).toBe(true)
    expect(next.editingId).toBe(created.textObjects[0].id)
  })
})