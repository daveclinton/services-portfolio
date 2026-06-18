import { describe, expect, it } from 'vitest'
import {
  getResizeHandleAtPoint,
  getResizeHandlePositions,
  resizeRectFromHandle,
} from '../../lib/resize-handles'

describe('Rectangle Tool – resize handles', () => {
  const rect = { x: 100, y: 100, width: 120, height: 80 }

  it('renders eight handle positions around the selection bounds', () => {
    expect(getResizeHandlePositions({ x: 92, y: 92, width: 136, height: 96 })).toHaveLength(8)
  })

  it('detects a corner handle hit', () => {
    expect(getResizeHandleAtPoint({ x: 92, y: 92 }, rect)).toBe('nw')
    expect(getResizeHandleAtPoint({ x: 228, y: 188 }, rect)).toBe('se')
  })

  it('resizes from the south-east corner', () => {
    expect(resizeRectFromHandle('se', rect, { x: 260, y: 210 })).toEqual({
      x: 100,
      y: 100,
      width: 160,
      height: 110,
    })
  })

  it('resizes from the north-west corner', () => {
    expect(resizeRectFromHandle('nw', rect, { x: 80, y: 80 })).toEqual({
      x: 80,
      y: 80,
      width: 140,
      height: 100,
    })
  })

  it('Shift locks aspect ratio when resizing from a corner', () => {
    const resized = resizeRectFromHandle('se', rect, { x: 260, y: 210 }, { shiftKey: true })
    expect(resized.width / resized.height).toBeCloseTo(rect.width / rect.height, 5)
  })

  it('Shift locks aspect ratio when resizing from an edge', () => {
    const resized = resizeRectFromHandle('e', rect, { x: 280, y: 140 }, { shiftKey: true })
    expect(resized.width / resized.height).toBeCloseTo(rect.width / rect.height, 5)
  })
})