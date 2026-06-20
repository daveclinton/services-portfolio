'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import { defaults, masterSize } from './constants'
import { getDefaultAssetDocument } from './document'
import { getColorWithOpacity, renderDesign } from './utils/'
import { PhonePreview } from './components/PhonePreview'
import { useIsMobile } from './hooks/useIsMobile'

type PreviewPlatform = 'ios' | 'android'

export function CanvasClient() {
  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const phonePreviewRef = useRef<HTMLCanvasElement>(null)
  const isMobile = useIsMobile()
  const [platform, setPlatform] = useState<PreviewPlatform>('ios')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const document = useMemo(() => getDefaultAssetDocument(), [])
  const design = document.icon
  const splashPreviewBackground = getColorWithOpacity(
    document.preview.splashBackgroundColor,
    document.preview.splashBackgroundOpacity,
    defaults.splashBackgroundColor,
  )
  const showPreviewPanel = !isMobile || isPreviewOpen

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
    renderDesign(ctx, design, masterSize)
  }, [design])

  useEffect(() => {
    const canvas = phonePreviewRef.current
    if (!canvas) return

    canvas.width = 228
    canvas.height = 228
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(228 / masterSize, 228 / masterSize)
    renderDesign(ctx, design)
  }, [design, platform, showPreviewPanel])

  return (
    <main
      className={`asset-generator-page${isMobile ? ' asset-generator-page--mobile' : ''}`}
      id="main-content"
    >
      <section
        className={`asset-generator-design${!isMobile ? ' is-preview-open' : ''}${isMobile ? ' is-mobile-canvas' : ''}`}
      >
        <div className="asset-generator-master">
          <canvas ref={masterCanvasRef} aria-label="Master design canvas" />
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