import { exportToCanvas } from './export'
import type { AssetElement } from '../element/types'

export function renderPreviewIcon(
  targetCanvas: HTMLCanvasElement,
  elements: readonly AssetElement[],
  files: Record<string, import('../editor/types').AssetFile>,
  backgroundColor: string,
  exportSize = 180,
) {
  const source = exportToCanvas({
    elements,
    files,
    backgroundColor,
    exportSize,
  })

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const pixelSize = Math.round(exportSize * dpr)

  targetCanvas.width = pixelSize
  targetCanvas.height = pixelSize

  const ctx = targetCanvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, pixelSize, pixelSize)
  ctx.scale(dpr, dpr)
  ctx.drawImage(source, 0, 0, exportSize, exportSize)
}