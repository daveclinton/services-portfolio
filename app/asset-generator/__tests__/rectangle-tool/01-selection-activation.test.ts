import { describe, expect, it } from 'vitest'
import {
  createInitialRectangleToolState,
  CURSOR_CROSSHAIR,
  getCanvasCursorForRectangleTool,
  rectangleToolReducer,
} from '../../lib/rectangle-tool'

describe('Rectangle Tool – 1. Selection & Activation', () => {
  it('1.1 clicking rectangle icon activates the tool', () => {
    const next = rectangleToolReducer(createInitialRectangleToolState(), { type: 'SELECT_TOOL', tool: 'rectangle' })
    expect(next.activeTool).toBe('rectangle')
  })

  it('1.2 pressing R activates rectangle tool from another tool', () => {
    const base = rectangleToolReducer(createInitialRectangleToolState(), { type: 'SELECT_TOOL', tool: 'text' })
    const next = rectangleToolReducer(base, { type: 'KEY_R' })
    expect(next.activeTool).toBe('rectangle')
  })

  it('1.3 cursor becomes crosshair when rectangle tool is active', () => {
    expect(getCanvasCursorForRectangleTool('rectangle')).toBe(CURSOR_CROSSHAIR)
    expect(rectangleToolReducer(createInitialRectangleToolState(), { type: 'KEY_R' }).canvasCursor).toBe('crosshair')
  })
})