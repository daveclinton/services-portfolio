import { describe, expect, it } from 'vitest'
import { RECTANGLE_TOOL_DEFAULTS } from '../../lib/rectangle-tool'
import { createInitialRectangleToolState, drawRectangle, getSelectedRectangle } from '../../testing/rectangle-tool-helpers'

describe('Rectangle Tool – 2. Creating Rectangles', () => {
  it('2.1 click and drag defines width and height', () => {
    const state = drawRectangle(createInitialRectangleToolState(), { x: 100, y: 100 }, { x: 260, y: 220 })
    const rectangle = getSelectedRectangle(state)

    expect(rectangle).toMatchObject({ x: 100, y: 100, width: 160, height: 120 })
  })

  it('2.2 Shift while dragging creates a perfect square', () => {
    const state = drawRectangle(createInitialRectangleToolState(), { x: 50, y: 50 }, { x: 200, y: 120 }, { shiftKey: true })
    const rectangle = getSelectedRectangle(state)

    expect(rectangle?.width).toBe(rectangle?.height)
  })

  it('2.3 Alt/Option draws from center point', () => {
    const state = drawRectangle(createInitialRectangleToolState(), { x: 200, y: 200 }, { x: 280, y: 240 }, { altKey: true })
    const rectangle = getSelectedRectangle(state)

    expect(rectangle?.x).toBe(120)
    expect(rectangle?.y).toBe(160)
    expect(rectangle?.width).toBe(160)
    expect(rectangle?.height).toBe(80)
  })

  it('2.4 default fill and stroke are applied', () => {
    const state = drawRectangle(createInitialRectangleToolState(), { x: 0, y: 0 }, { x: 80, y: 60 })
    const rectangle = getSelectedRectangle(state)

    expect(rectangle).toMatchObject({
      fillColor: RECTANGLE_TOOL_DEFAULTS.fillColor,
      fillOpacity: RECTANGLE_TOOL_DEFAULTS.fillOpacity,
      strokeColor: RECTANGLE_TOOL_DEFAULTS.strokeColor,
      strokeWidth: RECTANGLE_TOOL_DEFAULTS.strokeWidth,
    })
  })

  it('2.5 selection handles appear immediately after creation', () => {
    const state = drawRectangle(createInitialRectangleToolState(), { x: 10, y: 10 }, { x: 90, y: 70 })

    expect(state.showResizeHandles).toBe(true)
    expect(state.showCornerRadiusHandles).toBe(true)
    expect(state.selectedIds).toHaveLength(1)
  })
})