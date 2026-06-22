'use client'

import { useRef } from 'react'
import { FolderOpen, Save } from 'lucide-react'

type FilePanelProps = {
  onSave: () => void
  onLoad: (file: File) => void
}

export function FilePanel({ onSave, onLoad }: FilePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="asset-file-panel">
      <div className="asset-export-actions">
        <button type="button" className="asset-export-button asset-export-button--secondary" onClick={onSave}>
          <Save aria-hidden="true" />
          Save JSON
        </button>
        <button
          type="button"
          className="asset-export-button asset-export-button--secondary"
          onClick={() => inputRef.current?.click()}
        >
          <FolderOpen aria-hidden="true" />
          Load JSON
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onLoad(file)
          }
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}