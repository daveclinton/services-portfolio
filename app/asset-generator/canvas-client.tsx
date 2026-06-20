'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Smartphone, X } from 'lucide-react'
import { defaults, masterSize } from './constants'
import { getDefaultAssetDocument } from './document'
import { getColorWithOpacity, renderDesign } from './utils/'
import { getRectFromPoints, type CanvasRect } from './utils/geometry'
import { PhonePreview } from './components/PhonePreview'
import { EditorToolsToolbar } from './components/EditorToolsToolbar'
import { useIsMobile } from './hooks/useIsMobile'
import { getCanvasCursorClass } from './lib/canvas-cursor'
import { getCanvasPoint } from './lib/canvas-coords'
import { createDefaultEditorState } from './lib/editor-state'
import { hitTestLayerAtPoint } from './lib/hit-detection'
import { renderMarquee } from './lib/render-marquee'
import { getLayersInMarquee, isMarqueeGesture } from './lib/selection'
import type { AssetDocument, DesignLayer, EditorState } from './types'

type PreviewPlatform = 'ios' | 'android'

export function CanvasClient() {
  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const phonePreviewRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{
    mode: 'box-select'
    pointerId: number
    origin: { x: number; y: number }
  } | null>(null)
  const isMobile = useIsMobile()
  const [platform, setPlatform] = useState<PreviewPlatform>('ios')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [document] = useState<AssetDocument>(() => getDefaultAssetDocument())
  const [editorState, setEditorState] = useState<EditorState>(() => createDefaultEditorState())
  const [marquee, setMarquee] = useState<CanvasRect | null>(null)
  const design = document.icon
  const { activeTool, selectedLayerIds } = editorState
  const splashPreviewBackground = getColorWithOpacity(
    document.preview.splashBackgroundColor,
    document.preview.splashBackgroundOpacity,
    defaults.splashBackgroundColor,
  )
  const showPreviewPanel = !isMobile || isPreviewOpen

  const selectLayers = useCallback((selectedLayerIds: DesignLayer['id'][]) => {
    setEditorState((current) => ({
      ...current,
      selectedLayerIds: selectedLayerIds.length > 0 ? selectedLayerIds : ['background'],
    }))
  }, [])

  useEffect(() => {
    if (isMobile) {
      setIsPreviewOpen(false)
    }
  }, [isMobile])

  useEffect(() => {
    const masterCanvas = masterCanvasRef.current
    if (!masterCanvas) return

    masterCanvas.width = masterSize
    masterCanvas.height = masterSize
    const ctx = masterCanvas.getContext('2d')
    if (!ctx) return
    renderDesign(ctx, design, masterSize, { selectedLayerIds })

    if (marquee) {
      renderMarquee(ctx, marquee, masterSize)
    }
  }, [design, marquee, selectedLayerIds])

  useEffect(() => {
    const canvas = phonePreviewRef.current
    if (!canvas) return

    canvas.width = 228
    canvas.height = 228
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(228 / masterSize, 228 / masterSize)
    renderDesign(ctx, design)
  }, [design, platform, showPreviewPanel])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement

      if (isTyping) return

      if (event.key === 'Escape') {
        selectLayers(['background'])
        setMarquee(null)
        return
      }

      if (event.key.toLowerCase() === 'v' || event.key === '1') {
        setEditorState((current) => ({ ...current, activeTool: 'select' }))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectLayers])

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'select') return

    const canvas = masterCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const point = getCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
    const hitLayerId = hitTestLayerAtPoint(design, point, ctx)

    if (hitLayerId !== 'background') {
      selectLayers([hitLayerId])
      setMarquee(null)
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode: 'box-select',
      pointerId: event.pointerId,
      origin: point,
    }
    setMarquee({ x: point.x, y: point.y, width: 0, height: 0 })
  }

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'box-select') return

    const canvas = masterCanvasRef.current
    if (!canvas) return

    const point = getCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
    setMarquee(getRectFromPoints(drag.origin, point))
  }

  const finishBoxSelect = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'box-select') return

    const canvas = masterCanvasRef.current
    const ctx = canvas?.getContext('2d')
    const point = canvas ? getCanvasPoint(canvas, event.clientX, event.clientY, masterSize) : null
    const nextMarquee = point ? getRectFromPoints(drag.origin, point) : marquee

    if (ctx && nextMarquee) {
      if (isMarqueeGesture(nextMarquee)) {
        selectLayers(getLayersInMarquee(design, nextMarquee, ctx))
      } else {
        selectLayers(['background'])
      }
    }

    dragRef.current = null
    setMarquee(null)
  }

  const handleCanvasPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    finishBoxSelect(event)
  }

  const handleCanvasPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    finishBoxSelect(event)
  }

  return (
    <main
      className={`asset-generator-page${isMobile ? ' asset-generator-page--mobile' : ''}`}
      id="main-content"
    >
      <div className="App-menu">
        <div className="App-menu_top">
          <div className="App-menu_top__left zen-mode-transition" aria-hidden="true" />

          <section className="shapes-section" aria-labelledby="asset-generator-tools-title">
            <h2 className="visually-hidden" id="asset-generator-tools-title">
              Canvas tools
            </h2>
            <div className="Island App-toolbar-container" style={{ '--padding': 2 } as CSSProperties}>
              <EditorToolsToolbar
                activeTool={activeTool}
                onSelectTool={(tool) => setEditorState((current) => ({ ...current, activeTool: tool }))}
              />
            </div>
          </section>

          <div className="layer-ui__wrapper__top-right zen-mode-transition" aria-hidden="true" />
        </div>
      </div>

      <section
        className={`asset-generator-design${!isMobile ? ' is-preview-open' : ''}${isMobile ? ' is-mobile-canvas' : ''}`}
      >
        <div className="asset-generator-master">
          <canvas
            ref={masterCanvasRef}
            aria-label="Master design canvas"
            className={`${getCanvasCursorClass(activeTool, selectedLayerIds)}${marquee ? ' is-marquee-active' : ''}`}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerCancel}
          />
        </div>
      </section>

      {isMobile && isPreviewOpen ? (
        <button
          type="button"
          className="asset-generator-preview-backdrop"
          aria-label="Close device preview"
          onClick={() => setIsPreviewOpen(false)}
        />
      ) : null}

      {isMobile && !isPreviewOpen ? (
        <button
          type="button"
          className="asset-generator-preview-toggle"
          aria-label="Open device preview"
          aria-expanded={isPreviewOpen}
          onClick={() => setIsPreviewOpen(true)}
        >
          <Smartphone aria-hidden="true" />
        </button>
      ) : null}

      <section
        className={`asset-generator-preview-panel${isMobile ? ' asset-generator-preview-panel--sheet' : ''}${showPreviewPanel ? ' is-open' : ''}`}
        aria-label="Phone preview"
        aria-hidden={!showPreviewPanel}
      >
        {isMobile ? (
          <div className="asset-generator-preview-sheet-header">
            <span>Device preview</span>
            <button
              type="button"
              className="asset-generator-preview-sheet-close"
              aria-label="Close device preview"
              onClick={() => setIsPreviewOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="asset-generator-device-tabs" role="tablist" aria-label="Platform">
          <button
            type="button"
            role="tab"
            aria-selected={platform === 'android'}
            className={platform === 'android' ? 'is-active' : ''}
            onClick={() => setPlatform('android')}
          >
            Android
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={platform === 'ios'}
            className={platform === 'ios' ? 'is-active' : ''}
            onClick={() => setPlatform('ios')}
          >
            iOS
          </button>
        </div>

        <PhonePreview
          title={platform === 'ios' ? 'iOS' : 'Android'}
          platform={platform}
          canvasRef={phonePreviewRef}
          splashBackgroundColor={splashPreviewBackground}
        />
      </section>
    </main>
  )
}