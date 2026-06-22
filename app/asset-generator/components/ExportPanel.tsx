'use client'

import { Download } from 'lucide-react'
import { getExportPresetsForPlatform } from '../lib/common/exportPresets'
import { exportAllPlatforms, exportPlatformPack } from '../lib/utils/export'
import type { PreviewPlatform } from '../lib/common/exportPresets'
import type { AssetFile } from '../lib/editor/types'
import type { AssetElement } from '../lib/element/types'

type ExportPanelProps = {
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
  backgroundColor: string
  projectName: string
  previewPlatform: PreviewPlatform
  onProjectNameChange: (projectName: string) => void
}

export function ExportPanel({
  elements,
  files,
  backgroundColor,
  projectName,
  previewPlatform,
  onProjectNameChange,
}: ExportPanelProps) {
  const presets = getExportPresetsForPlatform(previewPlatform)

  return (
    <div className="asset-export-panel">
      <label className="asset-excalidraw-sidebar-section asset-export-field">
        <span>Project name</span>
        <input
          type="text"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="my-app"
          aria-label="Project name for export files"
        />
      </label>

      <div className="asset-excalidraw-sidebar-section">
        <span>Export preset</span>
        <strong>{previewPlatform === 'ios' ? 'iOS pack' : 'Android pack'}</strong>
        <small>{presets.map((preset) => `${preset.label} (${preset.size})`).join(' · ')}</small>
      </div>

      <div className="asset-export-actions">
        <button
          type="button"
          className="asset-export-button"
          onClick={() =>
            exportPlatformPack(elements, files, backgroundColor, projectName, previewPlatform)
          }
        >
          <Download aria-hidden="true" />
          Export {previewPlatform === 'ios' ? 'iOS' : 'Android'}
        </button>
        <button
          type="button"
          className="asset-export-button asset-export-button--secondary"
          onClick={() => exportAllPlatforms(elements, files, backgroundColor, projectName)}
        >
          <Download aria-hidden="true" />
          Export all
        </button>
      </div>
    </div>
  )
}