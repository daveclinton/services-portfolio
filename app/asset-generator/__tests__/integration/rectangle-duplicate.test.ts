import { describe, expect, it } from 'vitest'
import { addIconLayer, createShapeLayer, duplicateShapeLayer, getDefaultAssetDocument } from '../../document'

describe('Rectangle Tool – duplicate bridge', () => {
  it('duplicates a rectangle layer with offset position', () => {
    const document = getDefaultAssetDocument()
    const rectangle = createShapeLayer('rectangle', { x: 40, y: 40, width: 120, height: 80 })
    const withRectangle = addIconLayer(document, rectangle)
    const copy = duplicateShapeLayer(rectangle)

    expect(copy.id).not.toBe(rectangle.id)
    expect(copy).toMatchObject({ x: 56, y: 56, width: 120, height: 80, type: 'rectangle' })
    expect(withRectangle.icon.layers.some((layer) => layer.id === rectangle.id)).toBe(true)
  })
})