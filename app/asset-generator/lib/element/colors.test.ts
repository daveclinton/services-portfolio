import { describe, expect, it } from 'vitest'
import { newRectangleElement } from './newElement'
import {
  DEFAULT_CANVAS_BACKGROUND_PICKS,
  DEFAULT_ELEMENT_BACKGROUND_PICKS,
  DEFAULT_ELEMENT_STROKE_PICKS,
  getDefaultTopPicks,
  getMostUsedCustomColors,
  isCustomColor,
} from './colors'

const baseElementOptions = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  strokeWidth: 2,
}

describe('color picker helpers', () => {
  it('uses Excalidraw default top picks by picker type', () => {
    expect(getDefaultTopPicks('elementStroke')).toEqual(DEFAULT_ELEMENT_STROKE_PICKS)
    expect(getDefaultTopPicks('elementBackground')).toEqual(DEFAULT_ELEMENT_BACKGROUND_PICKS)
    expect(getDefaultTopPicks('canvasBackground')).toEqual(DEFAULT_CANVAS_BACKGROUND_PICKS)
  })

  it('detects custom colors outside the Excalidraw palette', () => {
    expect(isCustomColor({ color: '#1e1e1e' })).toBe(false)
    expect(isCustomColor({ color: 'transparent' })).toBe(false)
    expect(isCustomColor({ color: '#123456' })).toBe(true)
  })

  it('returns most used custom element colors sorted by frequency', () => {
    const elements = [
      newRectangleElement({
        ...baseElementOptions,
        strokeColor: '#111111',
        backgroundColor: '#aaaaaa',
      }),
      newRectangleElement({
        ...baseElementOptions,
        strokeColor: '#222222',
        backgroundColor: '#aaaaaa',
      }),
      newRectangleElement({
        ...baseElementOptions,
        strokeColor: '#111111',
        backgroundColor: '#ffc9c9',
      }),
    ]

    expect(getMostUsedCustomColors(elements, 'elementStroke')).toEqual([
      '#111111',
      '#222222',
    ])
    expect(getMostUsedCustomColors(elements, 'elementBackground')).toEqual(['#aaaaaa'])
  })
})
