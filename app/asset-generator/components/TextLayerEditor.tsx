'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  getTextEditorOverlayStyle,
  type TextEditorOverlayStyle,
} from '../lib/text-editor-layout'
import type { TextLayer } from '../types'

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

export function TextLayerEditor({
  canvasRef,
  containerRef,
  layer,
  autoSelect,
  onChange,
  onSubmit,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  layer: TextLayer
  autoSelect: boolean
  onChange: (text: string) => void
  onSubmit: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const submittedRef = useRef(false)
  const initializedRef = useRef(false)
  const [overlayStyle, setOverlayStyle] = useState<TextEditorOverlayStyle | null>(null)

  const syncOverlayStyle = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    setOverlayStyle(getTextEditorOverlayStyle(canvas, container, layer))
  }, [canvasRef, containerRef, layer])

  useLayoutEffect(() => {
    syncOverlayStyle()
  }, [syncOverlayStyle])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !overlayStyle) return

    resizeTextarea(textarea)

    if (initializedRef.current) return
    initializedRef.current = true

    if (autoSelect) {
      textarea.focus()
      textarea.select()
      return
    }

    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
  }, [autoSelect, overlayStyle])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !initializedRef.current) return
    resizeTextarea(textarea)
  }, [layer.text])

  useLayoutEffect(() => {
    const onResize = () => syncOverlayStyle()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [syncOverlayStyle])

  const submit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    onSubmit()
  }, [onSubmit])

  if (!overlayStyle) return null

  const editorStyle: CSSProperties = {
    left: overlayStyle.left,
    top: overlayStyle.top,
    width: overlayStyle.width,
    minHeight: overlayStyle.minHeight,
    fontSize: overlayStyle.fontSize,
    fontFamily: overlayStyle.fontFamily,
    fontWeight: overlayStyle.fontWeight,
    fontStyle: overlayStyle.fontStyle,
    color: overlayStyle.color,
    opacity: overlayStyle.opacity,
    textAlign: overlayStyle.textAlign,
    lineHeight: overlayStyle.lineHeight,
  }

  return (
    <textarea
      ref={textareaRef}
      className="asset-generator-text-editor"
      style={editorStyle}
      aria-label="Edit text layer"
      rows={1}
      value={layer.text}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      onBlur={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          submit()
        }
      }}
    />
  )
}