'use client'

import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'

type ImportImageButtonProps = {
  onImport: (file: File) => void
}

export function ImportImageButton({ onImport }: ImportImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button
        type="button"
        className="asset-export-button asset-export-button--secondary"
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus aria-hidden="true" />
        Import image
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onImport(file)
          }
          event.currentTarget.value = ''
        }}
      />
    </>
  )
}