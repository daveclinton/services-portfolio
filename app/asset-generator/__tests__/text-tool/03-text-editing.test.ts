import { describe, expect, it } from 'vitest'
import { createInitialTextToolState } from '../../lib/text-tool'
import { createTextPoint, runTextToolActions } from '../../testing/text-tool-helpers'
import { textToolReducer } from '../../lib/text-tool/store'

describe('Text Tool – 3. Text Editing', () => {
  function withText(value: string) {
    return runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 10, y: 10 }), [
      { type: 'INSERT_TEXT', value },
    ])
  }

  it('3.1 typing inserts characters at cursor position', () => {
    const state = runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 0, y: 0 }), [
      { type: 'INSERT_TEXT', value: 'Hi' },
      { type: 'INSERT_TEXT', value: '!' },
    ])

    expect(state.textObjects[0].text).toBe('Hi!')
  })

  it('3.2 cursor position updates while typing', () => {
    const state = withText('abc')

    expect(state.selectionStart).toBe(3)
    expect(state.selectionEnd).toBe(3)
  })

  it('3.3 Backspace removes character before cursor', () => {
    const state = runTextToolActions(withText('abc'), [{ type: 'BACKSPACE' }])

    expect(state.textObjects[0].text).toBe('ab')
  })

  it('3.4 Delete removes character after cursor', () => {
    const afterInsert = withText('abc')
    const atStart = textToolReducer(afterInsert, { type: 'SET_SELECTION', start: 0, end: 0 })
    const state = textToolReducer(atStart, { type: 'DELETE' })

    expect(state.textObjects[0].text).toBe('bc')
  })

  it('3.5 Cmd/Ctrl + B toggles bold while editing', () => {
    const state = runTextToolActions(withText('bold'), [{ type: 'TOGGLE_BOLD' }, { type: 'TOGGLE_BOLD' }])

    expect(state.textObjects[0].bold).toBe(false)
    expect(state.textObjects[0].fontWeight).toBe(400)

    const bold = textToolReducer(withText('bold'), { type: 'TOGGLE_BOLD' })
    expect(bold.textObjects[0].bold).toBe(true)
    expect(bold.textObjects[0].fontWeight).toBe(700)
  })

  it('3.6 Cmd/Ctrl + I toggles italic while editing', () => {
    const italic = textToolReducer(withText('style'), { type: 'TOGGLE_ITALIC' })

    expect(italic.textObjects[0].italic).toBe(true)
    expect(italic.textObjects[0].fontStyle).toBe('italic')
  })

  it('3.7 Cmd/Ctrl + U toggles underline while editing', () => {
    const underlined = textToolReducer(withText('line'), { type: 'TOGGLE_UNDERLINE' })

    expect(underlined.textObjects[0].underline).toBe(true)
    expect(underlined.textObjects[0].decoration).toBe('underline')
  })

  it('3.8 text selection range can be set in edit mode', () => {
    const state = textToolReducer(withText('select me'), { type: 'SET_SELECTION', start: 0, end: 6 })

    expect(state.selectionStart).toBe(0)
    expect(state.selectionEnd).toBe(6)
    expect(state.showSelectionHighlight).toBe(true)
  })

  it('3.9 Shift + Arrow extends selection', () => {
    const base = textToolReducer(withText('abcdef'), { type: 'SET_SELECTION', start: 2, end: 2 })
    const extended = textToolReducer(base, { type: 'SET_SELECTION', start: 2, end: 5 })

    expect(extended.selectionEnd).toBe(5)
  })

  it('3.10 typing replaces selected text', () => {
    const selected = textToolReducer(withText('replace old'), { type: 'SET_SELECTION', start: 8, end: 11 })
    const replaced = textToolReducer(selected, { type: 'INSERT_TEXT', value: 'new' })

    expect(replaced.textObjects[0].text).toBe('replace new')
  })
})