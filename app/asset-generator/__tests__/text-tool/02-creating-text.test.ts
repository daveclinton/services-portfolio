import { describe, expect, it } from 'vitest'
import { createInitialTextToolState, getDisplayLines, TEXT_TOOL_DEFAULTS } from '../../lib/text-tool'
import { createTextBox, createTextPoint, getEditingObject } from '../../testing/text-tool-helpers'
import { textToolReducer } from '../../lib/text-tool/store'

describe('Text Tool – 2. Creating New Text', () => {
  it('2.1 single click creates inline text point with auto width', () => {
    const state = createTextPoint(createInitialTextToolState(), { x: 50, y: 60 })
    const object = getEditingObject(state)

    expect(object?.width).toBeNull()
  })

  it('2.2 click + drag creates text box with fixed width', () => {
    const state = createTextBox(createInitialTextToolState(), { x: 40, y: 40 }, { x: 200, y: 120 })
    const object = getEditingObject(state)

    expect(object?.width).toBeGreaterThanOrEqual(32)
    expect(object?.height).toBeGreaterThanOrEqual(24)
  })

  it('2.3 new text immediately enters edit mode after creation', () => {
    const state = createTextPoint(createInitialTextToolState(), { x: 10, y: 10 })

    expect(state.isEditing).toBe(true)
    expect(state.editingId).toBeTruthy()
  })

  it('2.4 cursor is active at insertion point after creation', () => {
    const state = createTextPoint(createInitialTextToolState(), { x: 10, y: 10 })

    expect(state.selectionStart).toBe(0)
    expect(state.selectionEnd).toBe(0)
    expect(state.canvasCursor).toBe('text')
  })

  it('2.5 text object is added to document model immediately', () => {
    const state = createTextPoint(createInitialTextToolState(), { x: 300, y: 300 })

    expect(state.textObjects).toHaveLength(1)
    expect(state.textObjects[0]).toMatchObject({ x: 300, y: 300, text: '' })
  })

  it('2.6 default font, size, and color are applied', () => {
    const state = createTextPoint(createInitialTextToolState(), { x: 0, y: 0 })
    const object = getEditingObject(state)

    expect(object).toMatchObject({
      fontFamily: TEXT_TOOL_DEFAULTS.fontFamily,
      fontSize: TEXT_TOOL_DEFAULTS.fontSize,
      color: TEXT_TOOL_DEFAULTS.color,
    })
  })

  it('2.7 text point grows horizontally without wrapping', () => {
    const created = createTextPoint(createInitialTextToolState(), { x: 0, y: 0 })
    const typed = textToolReducer(created, { type: 'INSERT_TEXT', value: 'Hello world without wrapping' })
    const object = typed.textObjects[0]
    const lines = getDisplayLines(object)

    expect(object.width).toBeNull()
    expect(lines).toHaveLength(1)
  })

  it('2.8 text box wraps when content exceeds fixed width', () => {
    const boxed = createTextBox(createInitialTextToolState(), { x: 0, y: 0 }, { x: 120, y: 80 })
    const typed = textToolReducer(boxed, {
      type: 'INSERT_TEXT',
      value: 'This is a long sentence that should wrap inside the text box',
    })
    const lines = getDisplayLines(typed.textObjects[0])

    expect(lines.length).toBeGreaterThan(1)
  })
})