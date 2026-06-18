import { describe, expect, it } from 'vitest'
import { createInitialTextToolState } from '../../lib/text-tool'
import { createTextPoint, getSelectedObject, runTextToolActions } from '../../testing/text-tool-helpers'

describe('Text Tool – 4. Text Formatting via Properties Panel', () => {
  function selectedTextState() {
    const created = runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 20, y: 20 }), [
      { type: 'INSERT_TEXT', value: 'Styled' },
      { type: 'KEY_ESCAPE' },
    ])
    return runTextToolActions(created, [{ type: 'SELECT_TEXT', id: created.textObjects[0].id }])
  }

  it('4.1 changing font family updates selected text', () => {
    const state = runTextToolActions(selectedTextState(), [
      { type: 'UPDATE_STYLE', patch: { fontFamily: 'Georgia, serif' } },
    ])

    expect(getSelectedObject(state)?.fontFamily).toBe('Georgia, serif')
  })

  it('4.2 changing font size updates text', () => {
    const state = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { fontSize: 24 } }])

    expect(getSelectedObject(state)?.fontSize).toBe(24)
  })

  it('4.3 changing font weight updates text', () => {
    const state = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { fontWeight: 300 } }])

    expect(getSelectedObject(state)?.fontWeight).toBe(300)
  })

  it('4.4 changing text alignment updates text', () => {
    const state = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { textAlign: 'justify' } }])

    expect(getSelectedObject(state)?.textAlign).toBe('justify')
  })

  it('4.5 adjusting line height updates spacing', () => {
    const state = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { lineHeight: 1.8 } }])

    expect(getSelectedObject(state)?.lineHeight).toBe(1.8)
  })

  it('4.6 adjusting letter spacing updates tracking', () => {
    const state = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { letterSpacing: 2 } }])

    expect(getSelectedObject(state)?.letterSpacing).toBe(2)
  })

  it('4.7 changing text color updates text', () => {
    const state = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { color: '#ff0000' } }])

    expect(getSelectedObject(state)?.color).toBe('#ff0000')
  })

  it('4.8 text transform applies case changes', () => {
    const state = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { textTransform: 'uppercase' } }])

    expect(getSelectedObject(state)?.textTransform).toBe('uppercase')
  })

  it('4.9 text decoration applies underline/strikethrough', () => {
    const underline = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { decoration: 'underline' } }])
    const strike = runTextToolActions(selectedTextState(), [{ type: 'UPDATE_STYLE', patch: { decoration: 'strikethrough' } }])

    expect(getSelectedObject(underline)?.decoration).toBe('underline')
    expect(getSelectedObject(strike)?.decoration).toBe('strikethrough')
  })

  it('4.10 properties panel values match selected text styles', () => {
    const state = runTextToolActions(selectedTextState(), [
      {
        type: 'UPDATE_STYLE',
        patch: {
          fontFamily: 'Helvetica',
          fontSize: 20,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.5,
          letterSpacing: 1,
          color: '#333333',
          textTransform: 'capitalize',
          decoration: 'underline',
        },
      },
    ])
    const object = getSelectedObject(state)

    expect(object).toMatchObject({
      fontFamily: 'Helvetica',
      fontSize: 20,
      fontWeight: 600,
      textAlign: 'center',
      lineHeight: 1.5,
      letterSpacing: 1,
      color: '#333333',
      textTransform: 'capitalize',
      decoration: 'underline',
    })
  })

  it('4.11 formatting in edit mode syncs to selected object state', () => {
    const editing = runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 0, y: 0 }), [
      { type: 'INSERT_TEXT', value: 'live' },
      { type: 'TOGGLE_BOLD' },
      { type: 'TOGGLE_ITALIC' },
    ])

    expect(editing.textObjects[0].bold).toBe(true)
    expect(editing.textObjects[0].italic).toBe(true)
  })
})