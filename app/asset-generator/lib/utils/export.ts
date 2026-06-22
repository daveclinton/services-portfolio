import { MIME_TYPES } from '../common/constants'
import {
  buildExportFilename,
  getExportPresetsForPlatform,
  type PreviewPlatform,
} from '../common/exportPresets'
import { exportToCanvas } from '../scene/export'
import type { AssetFile } from '../editor/types'
import type { AssetElement } from '../element/types'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportToBlob(
  elements: readonly AssetElement[],
  files: Record<string, AssetFile>,
  backgroundColor: string,
  exportSize: number,
) {
  const canvas = exportToCanvas({
    elements,
    files,
    backgroundColor,
    exportSize,
  })

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Failed to export PNG'))
        return
      }

      resolve(result)
    }, MIME_TYPES.png)
  })

  return blob
}

export async function exportToPng(
  elements: readonly AssetElement[],
  files: Record<string, AssetFile>,
  backgroundColor: string,
  filename: string,
  exportSize: number,
) {
  const blob = await exportToBlob(elements, files, backgroundColor, exportSize)
  downloadBlob(blob, filename)
  return blob
}

export async function exportPlatformPack(
  elements: readonly AssetElement[],
  files: Record<string, AssetFile>,
  backgroundColor: string,
  projectName: string,
  platform: PreviewPlatform,
) {
  const presets = getExportPresetsForPlatform(platform)

  for (const preset of presets) {
    await exportToPng(
      elements,
      files,
      backgroundColor,
      buildExportFilename(projectName, preset),
      preset.size,
    )
  }
}

export async function exportAllPlatforms(
  elements: readonly AssetElement[],
  files: Record<string, AssetFile>,
  backgroundColor: string,
  projectName: string,
) {
  await exportPlatformPack(elements, files, backgroundColor, projectName, 'ios')
  await exportPlatformPack(elements, files, backgroundColor, projectName, 'android')
}