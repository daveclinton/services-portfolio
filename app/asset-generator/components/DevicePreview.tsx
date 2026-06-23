'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { PreviewPlatform } from '../lib/common/exportPresets'
import { preloadImages } from '../lib/scene/imageCache'
import { renderPreviewIcon } from '../lib/scene/preview'
import type { AssetFile } from '../lib/editor/types'
import type { AssetElement } from '../lib/element/types'

type DevicePreviewProps = {
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
  backgroundColor: string
  platform: PreviewPlatform
  onPlatformChange: (platform: PreviewPlatform) => void
}

const PREVIEW_ICON_SIZE = 180

export function DevicePreview({
  elements,
  files,
  backgroundColor,
  platform,
  onPlatformChange,
}: DevicePreviewProps) {
  const homeIconRef = useRef<HTMLCanvasElement>(null)
  const dockIconRef = useRef<HTMLCanvasElement>(null)

  const previewKey = useMemo(
    () =>
      JSON.stringify({
        backgroundColor,
        elements: elements.map((element) => ({
          id: element.id,
          type: element.type,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          strokeColor: element.strokeColor,
          backgroundColor: element.backgroundColor,
          strokeWidth: element.strokeWidth,
          opacity: element.opacity,
          text: element.text,
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          fontStyle: element.fontStyle,
          fileId: element.fileId,
          version: element.version,
        })),
        fileIds: Object.keys(files),
      }),
    [backgroundColor, elements, files],
  )

  useEffect(() => {
    preloadImages(files)
  }, [files])

  useEffect(() => {
    const targets = [homeIconRef.current, dockIconRef.current].filter(
      (canvas): canvas is HTMLCanvasElement => Boolean(canvas),
    )

    for (const canvas of targets) {
      renderPreviewIcon(canvas, elements, files, backgroundColor, PREVIEW_ICON_SIZE)
    }
  }, [previewKey, elements, files, backgroundColor])

  return (
    <>
      <div className="asset-excalidraw-device-tabs" role="tablist" aria-label="Platform">
        <button
          type="button"
          role="tab"
          aria-selected={platform === 'ios'}
          className={platform === 'ios' ? 'is-active' : undefined}
          onClick={() => onPlatformChange('ios')}
        >
          iOS
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={platform === 'android'}
          className={platform === 'android' ? 'is-active' : undefined}
          onClick={() => onPlatformChange('android')}
        >
          Android
        </button>
      </div>

      <div
        className={`asset-excalidraw-phone asset-excalidraw-phone--${platform}`}
        aria-label={`${platform} device preview`}
      >
        <div className="asset-excalidraw-phone-island" />
        <div className="asset-excalidraw-phone-screen">
          <div className="asset-device-wallpaper" />
          <div className="asset-device-home-grid">
            <div className="asset-device-home-icon-wrap">
              <canvas
                ref={homeIconRef}
                className={`asset-device-home-icon asset-device-home-icon--${platform}`}
                aria-label="Live app icon preview"
              />
              <span>Your app</span>
            </div>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="asset-device-home-icon-wrap is-placeholder">
                <div className="asset-device-placeholder-icon" />
                <span>App</span>
              </div>
            ))}
          </div>
          <div className="asset-device-dock">
            <canvas
              ref={dockIconRef}
              className={`asset-device-home-icon asset-device-home-icon--${platform}`}
              aria-hidden="true"
            />
            <div className="asset-device-placeholder-icon" aria-hidden="true" />
            <div className="asset-device-placeholder-icon" aria-hidden="true" />
          </div>
        </div>
      </div>
    </>
  )
}
