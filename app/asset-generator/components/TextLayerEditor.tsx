'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  getTextEditorOverlayStyle,
  type FrozenTextEditorStyle,
  type TextEditorOverlayStyle,
} from '../lib/text-editor-layout'
import type { TextLayer } from '../types'

export function TextLayerEditor({
  canvasRef,
  containerRef,
  layer,
  frozenStyle,
  autoSelect,
  initialCaretOffset = null,
  onChange,
  onSubmit,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  layer: TextLayer
  frozenStyle: FrozenTextEditorStyle
  autoSelect: boolean
  initialCaretOffset?: number | null
  onChange: (text: string) => void
  onSubmit: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const submittedRef = useRef(false)
  const initializedRef = useRef(false)
  const editorHeightRef = useRef(frozenStyle.canvasBounds.height)
  const [overlayStyle, setOverlayStyle] = useState<TextEditorOverlayStyle>(() => frozenStyle)

  const syncOverlayStyle = useCallback(
    (heightOverride?: number) => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      setOverlayStyle(
        getTextEditorOverlayStyle(canvas, container, layer, frozenStyle, heightOverride),
      )
    },
    [canvasRef, containerRef, frozenStyle, layer],
  )

  useLayoutEffect(() => {
    syncOverlayStyle(editorHeightRef.current)
  }, [syncOverlayStyle])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !initializedRef.current) return

    const displayScale =
      frozenStyle.canvasFontSize > 0 ? overlayStyle.fontSize / frozenStyle.canvasFontSize : 1
    const naturalCanvasHeight = textarea.scrollHeight / displayScale
    const nextCanvasHeight = Math.max(frozenStyle.canvasBounds.height, naturalCanvasHeight)

    if (nextCanvasHeight > editorHeightRef.current + 0.5) {
      editorHeightRef.current = nextCanvasHeight
      syncOverlayStyle(nextCanvasHeight)
    }
  }, [frozenStyle.canvasBounds.height, frozenStyle.canvasFontSize, layer.text, overlayStyle.fontSize, syncOverlayStyle])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    if (initializedRef.current) return
    initializedRef.current = true

    textarea.focus()

    if (autoSelect) {
      textarea.select()
      return
    }

    const caretOffset =
      initialCaretOffset === null
        ? textarea.value.length
        : Math.min(Math.max(initialCaretOffset, 0), textarea.value.length)

    textarea.setSelectionRange(caretOffset, caretOffset)
  }, [autoSelect, initialCaretOffset])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const onResize = () => syncOverlayStyle(editorHeightRef.current)

    let observer: ResizeObserver | null = null
    if (canvas && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(onResize)
      observer.observe(canvas)
    } else {
      window.addEventListener('resize', onResize)
    }

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [canvasRef, syncOverlayStyle])

  const submit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    onSubmit()
  }, [onSubmit])

  const editorStyle: CSSProperties = {
    left: overlayStyle.left,
    top: overlayStyle.top,
    width: overlayStyle.width,
    height: overlayStyle.height,
    maxHeight: overlayStyle.maxHeight,
    transform: 'none',
    fontSize: overlayStyle.fontSize,
    fontFamily: overlayStyle.fontFamily,
    fontWeight: overlayStyle.fontWeight,
    fontStyle: overlayStyle.fontStyle,
    color: overlayStyle.color,
    opacity: overlayStyle.opacity,
    textAlign: overlayStyle.textAlign,
    lineHeight: overlayStyle.lineHeight,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    boxSizing: 'content-box',
    padding: 0,
    margin: 0,
    overflow: 'hidden',
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