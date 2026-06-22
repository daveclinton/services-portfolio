import { describe, expect, it } from 'vitest'
import { getDefaultAppState } from '../editor/appState'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { resetTestIds } from '../common/random'
import { newRectangleElement, newTextElement } from './newElement'
import { getCanvasCursor, getTextLines, getTextTopForSceneY, measureTextDimensions } from './text'

describe('text helpers', () => {
  it('centers the first line on the click Y coordinate', () => {
    expect(getTextTopForSceneY(512, 64)).toBeCloseTo(476.8, 1)
  })

  it('splits text into canvas-renderable lines', () => {
    expect(getTextLines('One\nTwo\n')).toEqual(['One', 'Two', ''])
  })

  it('measures multiline text from the widest line and line count', () => {
    expect(measureTextDimensions('ABCDEFGHIJ\nB', 64)).toEqual({
      width: 397,
      height: 141,
    })
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

  it('uses Excalidraw-style move and auto cursors in selection mode', () => {
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
    expect(getCanvasCursor(appState, [text, shape], 420, 420)).toBe('move')
    expect(getCanvasCursor(appState, [text, shape], 10, 10)).toBe('')
  })

  it('uses resize cursors over selected transform handles', () => {
    resetTestIds()

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
      selectedElementIds: { [shape.id]: true as const },
    }

    expect(getCanvasCursor(appState, [shape], 400, 400)).toBe('nwse-resize')
    expect(getCanvasCursor(appState, [shape], 460, 400)).toBe('ns-resize')
    expect(getCanvasCursor(appState, [shape], 520, 460)).toBe('ew-resize')
  })

  it('suppresses resize cursors while multiple elements are selected', () => {
    resetTestIds()

    const first = newRectangleElement({
      x: 100,
      y: 100,
      width: 120,
      height: 120,
      strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
      backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
      strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
    })
    const second = newRectangleElement({
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
      selectedElementIds: {
        [first.id]: true as const,
        [second.id]: true as const,
      },
    }

    expect(getCanvasCursor(appState, [first, second], 100, 100)).toBe('move')
  })

  it('uses a grabbing cursor while selected elements are being dragged', () => {
    resetTestIds()

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
      interaction: 'dragging' as const,
      selectedElementIds: { [shape.id]: true as const },
    }

    expect(getCanvasCursor(appState, [shape], 420, 420)).toBe('grabbing')
  })
})
