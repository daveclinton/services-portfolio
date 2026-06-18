import { describe, expect, it } from 'vitest'
import { getCanvasCursorClass } from '../../lib/canvas-cursor'
import { resolveTextPlacement, toggleBoldWeight } from '../../lib/text-tool/canvas-interaction'

describe('Text Tool – canvas interaction bridge', () => {
  it('uses I-beam cursor class when text tool is active', () => {
    expect(getCanvasCursorClass('text', 'background', false)).toBe('is-text-tool-active')
  })

  it('resolves click placement as a text point', () => {
    expect(resolveTextPlacement({ x: 100, y: 100 }, { x: 104, y: 103 })).toEqual({
      mode: 'point',
      x: 104,
      y: 103,
    })
  })

  it('resolves drag placement as a fixed-width text box', () => {
    const placement = resolveTextPlacement({ x: 100, y: 100 }, { x: 260, y: 180 })

    expect(placement.mode).toBe('box')
    if (placement.mode === 'box') {
      expect(placement.maxWidth).toBeGreaterThanOrEqual(32)
    }
  })

  it('toggles bold weight between preset values', () => {
    expect(toggleBoldWeight('800')).toBe('700')
    expect(toggleBoldWeight('700')).toBe('800')
  })
})