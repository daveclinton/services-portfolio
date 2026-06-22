import { getTransformHandles } from '../element/transformHandles'
import type { AssetElement } from '../element/types'

export function renderTransformHandles(
  context: CanvasRenderingContext2D,
  element: AssetElement,
) {
  const handles = getTransformHandles(element)

  context.save()
  context.fillStyle = '#ffffff'
  context.strokeStyle = '#6965db'
  context.lineWidth = 2
  context.setLineDash([])

  for (const handle of Object.values(handles)) {
    if (!handle) continue
    const [x, y, width, height] = handle
    context.fillRect(x, y, width, height)
    context.strokeRect(x, y, width, height)
  }

  context.restore()
}