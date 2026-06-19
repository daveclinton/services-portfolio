'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { defaults, masterSize } from './constants'
import { getDefaultAssetDocument } from './document'
import { getColorWithOpacity, renderDesign } from './utils/'
import { PhonePreview } from './components/PhonePreview'

type PreviewPlatform = 'ios' | 'android'

export function CanvasClient() {
  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const phonePreviewRef = useRef<HTMLCanvasElement>(null)
  const [platform, setPlatform] = useState<PreviewPlatform>('ios')
  const document = useMemo(() => getDefaultAssetDocument(), [])
  const design = document.icon
  const splashPreviewBackground = getColorWithOpacity(
    document.preview.splashBackgroundColor,
    document.preview.splashBackgroundOpacity,
    defaults.splashBackgroundColor,
  )

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
  }, [design, platform])

  return (
    <main className="asset-generator-page" id="main-content">
      <section className="asset-generator-design is-preview-open">
        <div className="asset-generator-master">
          <canvas ref={masterCanvasRef} aria-label="Master design canvas" />
        </div>
      </section>

      <section className="asset-generator-preview-panel is-open" aria-label="Phone preview">
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