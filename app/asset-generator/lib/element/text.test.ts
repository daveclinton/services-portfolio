import { describe, expect, it } from 'vitest'
import { getDefaultAppState } from '../editor/appState'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { resetTestIds } from '../common/random'
import { newRectangleElement, newTextElement } from './newElement'
import { getCanvasCursor, getTextTopForSceneY } from './text'

describe('text helpers', () => {
  it('centers the first line on the click Y coordinate', () => {
    expect(getTextTopForSceneY(512, 64)).toBeCloseTo(476.8, 1)
  })

  it('uses a text cursor over existing text while the text tool is active', () => {
    resetTestIds()

    const text = newTextElement({
      x: 100,
      y: 100,
      width: 240,
      height: 96,
      text: 'Hi',
    })

    const appState = {
      ...getDefaultAppState(),
      activeTool: { type: 'text' as const, locked: false },
    }

    expect(getCanvasCursor(appState, [text], 120, 120)).toBe('text')
    expect(getCanvasCursor(appState, [text], 10, 10)).toBe('crosshair')
  })

  it('uses move and pointer cursors in selection mode', () => {
    resetTestIds()

    const text = newTextElement({
      x: 100,
      y: 100,
      width: 240,
      height: 96,
      text: 'Hi',
    })
    const shape = newRectangleElement({
      x: 400,
      y: 400,
      width: 120,
      height: 120,
      strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
      backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
      strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
    })

    const appState = {
      ...getDefaultAppState(),
      activeTool: { type: 'selection' as const, locked: false },
      selectedElementIds: { [text.id]: true as const },
    }

    expect(getCanvasCursor(appState, [text, shape], 120, 120)).toBe('move')
    expect(getCanvasCursor(appState, [text, shape], 420, 420)).toBe('pointer')
    expect(getCanvasCursor(appState, [text, shape], 10, 10)).toBe('default')
  })
})