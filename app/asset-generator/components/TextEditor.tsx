'use client'

import { useEffect, useRef, useState } from 'react'
import { ICON_SIZE } from '../lib/common/constants'
import type { AssetElement } from '../lib/element/types'

type TextEditorProps = {
  element: AssetElement
  onCommit: (text: string, viaKeyboard?: boolean) => void
}

export function TextEditor({ element, onCommit }: TextEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [blurEnabled, setBlurEnabled] = useState(false)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    input.focus()

    if (element.text) {
      input.select()
    }

    const timer = window.setTimeout(() => {
      setBlurEnabled(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [element.text])

  const commit = (viaKeyboard = false) => {
    const input = inputRef.current
    if (!input) return
    onCommit(input.value, viaKeyboard)
  }

  return (
    <textarea
      ref={inputRef}
      className="asset-text-editor"
      defaultValue={element.text ?? ''}
      aria-label="Edit text label"
      style={{
        left: `${(element.x / ICON_SIZE) * 100}%`,
        top: `${(element.y / ICON_SIZE) * 100}%`,
        width: `${(element.width / ICON_SIZE) * 100}%`,
        minHeight: `${(element.height / ICON_SIZE) * 100}%`,
        fontSize: `calc(100cqw * ${element.fontSize ?? 64} / ${ICON_SIZE})`,
        color: element.strokeColor,
      }}
      onBlur={() => {
        if (!blurEnabled) return
        commit(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          commit(true)
          return
        }

        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          commit(true)
        }
      }}
    />
  )
}