import { describe, expect, it } from 'vitest'
import { resolveRectangleBounds } from '../../lib/rectangle-tool/geometry'

describe('Rectangle Tool – geometry', () => {
  it('resolves a normal drag rectangle', () => {
    expect(resolveRectangleBounds({ x: 10, y: 10 }, { x: 110, y: 60 })).toEqual({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    })
  })

  it('resolves shift-constrained square', () => {
    const rect = resolveRectangleBounds({ x: 0, y: 0 }, { x: 120, y: 40 }, { shiftKey: true })
    expect(rect.width).toBe(rect.height)
  })

  it('resolves alt draw from center', () => {
    const rect = resolveRectangleBounds({ x: 100, y: 100 }, { x: 140, y: 120 }, { altKey: true })
    expect(rect).toEqual({ x: 60, y: 80, width: 80, height: 40 })
  })
})