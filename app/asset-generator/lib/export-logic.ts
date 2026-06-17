import JSZip from 'jszip'
import type { IconDesign } from '../types'
import { assets } from '../constants'
import { renderAsset, canvasToBlob, downloadBlob } from '../utils/'

export async function exportAllAssets(design: IconDesign, onProgress: (progress: string) => void) {
  onProgress(`0/${assets.length}`)

  try {
    const zip = new JSZip()

    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index]
      const canvas = renderAsset(asset, design)
      const blob = await canvasToBlob(canvas)
      zip.file(asset.name, blob)
      canvas.width = 0
      canvas.height = 0
      onProgress(`${index + 1}/${assets.length}`)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(zipBlob, 'generated-assets.zip')
    onProgress('Downloaded')
  } catch {
    onProgress('Export failed')
    throw new Error('Export failed')
  }
}
