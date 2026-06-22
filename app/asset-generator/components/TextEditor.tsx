'use client'

import { useEffect, useRef } from 'react'
import { ICON_SIZE } from '../lib/common/constants'
import type { AssetElement } from '../lib/element/types'

type TextEditorProps = {
  element: AssetElement
  onCommit: (text: string) => void
  onCancel: () => void
}

export function TextEditor({ element, onCommit, onCancel }: TextEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    input.focus()
    input.select()
  }, [])

  return (
    <textarea
      ref={inputRef}
      className="asset-text-editor"
      defaultValue={element.text ?? 'Label'}
      aria-label="Edit text label"
      style={{
        left: `${(element.x / ICON_SIZE) * 100}%`,
        top: `${(element.y / ICON_SIZE) * 100}%`,
        width: `${(Math.max(element.width, 240) / ICON_SIZE) * 100}%`,
        minHeight: `${(Math.max(element.height, 96) / ICON_SIZE) * 100}%`,
        fontSize: `calc(100cqw * ${element.fontSize ?? 64} / ${ICON_SIZE})`,
        color: element.strokeColor,
      }}
      onBlur={(event) => {
        const nextText = event.currentTarget.value.trim()
        if (nextText) {
          onCommit(nextText)
        } else {
          onCancel()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          event.currentTarget.blur()
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
    />
  )
}