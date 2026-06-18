import JSZip from 'jszip'
import type { IconDesign } from '../types'
import { assets } from '../constants'
import { renderAsset, canvasToBlob, canvasToPngBytes, downloadBlob, encodeIco } from '../utils/'

async function exportAssetBlob(asset: (typeof assets)[number], design: IconDesign) {
  if (asset.format === 'ico') {
    const images: { width: number; height: number; data: Uint8Array }[] = []

    for (const size of asset.icoSizes) {
      const canvas = renderAsset(
        {
          name: asset.name,
          imageSize: { width: size, height: size },
          dpi: asset.dpi,
          format: 'png',
        },
        design,
      )
      images.push({
        width: size,
        height: size,
        data: await canvasToPngBytes(canvas),
      })
      canvas.width = 0
      canvas.height = 0
    }

    return encodeIco(images)
  }

  const canvas = renderAsset(asset, design)
  const blob = await canvasToBlob(canvas)
  canvas.width = 0
  canvas.height = 0
  return blob
}

export async function exportAllAssets(design: IconDesign, onProgress: (progress: string) => void) {
  onProgress(`0/${assets.length}`)

  try {
    const zip = new JSZip()

    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index]
      const blob = await exportAssetBlob(asset, design)
      zip.file(asset.name, blob)
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
