'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import {
  assets,
  defaults,
  fontKeys,
  fontOptions,
  fontWeights,
  masterSize,
  platforms,
  previewStates,
  tools,
} from './constants'
import type { DesignLayer, FontKey, FontWeight, IconDesign } from './types'
import {
  canvasToBlob,
  downloadBlob,
  getFittedFontSizeForText,
  getFontFamily,
  getValidColor,
  renderAsset,
  renderDesign,
} from './utils'
import { ColorSwatchPicker, PhonePreview } from './components'

export function CanvasClient() {
  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const phonePreviewRef = useRef<HTMLCanvasElement>(null)
  const [settings, setSettings] = useQueryStates(
    {
      text: parseAsString.withDefault(defaults.text),
      bg: parseAsString.withDefault(defaults.backgroundColor),
      fg: parseAsString.withDefault(defaults.textColor),
      font: parseAsStringLiteral(fontKeys).withDefault(defaults.font),
      weight: parseAsStringLiteral(fontWeights).withDefault(defaults.fontWeight),
      platform: parseAsStringLiteral(platforms).withDefault(defaults.platform),
      tool: parseAsStringLiteral(tools).withDefault(defaults.tool),
      preview: parseAsStringLiteral(previewStates).withDefault(defaults.preview),
    },
    {
      history: 'replace',
    },
  )
  const [progress, setProgress] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [openColorPicker, setOpenColorPicker] = useState<'bg' | 'fg' | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const text = settings.text
  const backgroundColor = getValidColor(settings.bg, defaults.backgroundColor)
  const textColor = getValidColor(settings.fg, defaults.textColor)
  const fontKey = settings.font
  const fontFamily = getFontFamily(fontKey)
  const fontWeight = settings.weight
  const platform = settings.platform
  const activeTool = settings.tool
  const isPreviewOpen = settings.preview === 'open'
  const [isEditingText, setIsEditingText] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState<DesignLayer['id']>('text')
  const editorFontSize = useMemo(
    () => getFittedFontSizeForText(text, 240, 68, 16, fontFamily, fontWeight),
    [fontFamily, fontWeight, text],
  )

  const design = useMemo<IconDesign>(
    () => ({
      layers: [
        {
          id: 'background',
          type: 'background',
          color: backgroundColor,
        },
        {
          id: 'text',
          type: 'text',
          text,
          color: textColor,
          fontFamily,
          fontKey,
          fontWeight,
          x: masterSize / 2,
          y: masterSize / 2,
          maxWidth: masterSize * 0.72,
          maxFontSize: masterSize * 0.22,
        },
      ],
    }),
    [backgroundColor, fontFamily, fontKey, fontWeight, text, textColor],
  )

  useEffect(() => {
    const masterCanvas = masterCanvasRef.current
    if (!masterCanvas) return

    masterCanvas.width = masterSize
    masterCanvas.height = masterSize
    const ctx = masterCanvas.getContext('2d')
    if (!ctx) return
    renderDesign(ctx, design, masterSize, { hideLayerId: isEditingText ? 'text' : undefined })
  }, [design, isEditingText])

  useEffect(() => {
    const canvas = phonePreviewRef.current
    if (!canvas) return

    canvas.width = 228
    canvas.height = 228
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(228 / masterSize, 228 / masterSize)
    renderDesign(ctx, design)
  }, [design, isPreviewOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement

      if (isTyping) return

      if (event.key.toLowerCase() === 'h') {
        setSettings({ tool: 'hand' })
        setIsEditingText(false)
      }

      if (event.key.toLowerCase() === 'v' || event.key === '1') {
        setSettings({ tool: 'select' })
        setIsEditingText(false)
      }

      if (event.key.toLowerCase() === 't') {
        setSettings({ tool: 'text' })
        setSelectedLayerId('text')
        setIsEditingText(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setSettings])

  const exportAllAssets = async () => {
    setIsExporting(true)
    setProgress(`0/${assets.length}`)

    try {
      const zip = new JSZip()

      for (let index = 0; index < assets.length; index += 1) {
        const asset = assets[index]
        const canvas = renderAsset(asset, design)
        const blob = await canvasToBlob(canvas)
        zip.file(asset.name, blob)
        canvas.width = 0
        canvas.height = 0
        setProgress(`${index + 1}/${assets.length}`)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, 'generated-assets.zip')
      setProgress('Downloaded')
    } catch {
      setProgress('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const resetDesign = () => {
    setSettings({
      text: defaults.text,
      bg: defaults.backgroundColor,
      fg: defaults.textColor,
      font: defaults.font,
      weight: defaults.fontWeight,
      tool: defaults.tool,
    })
    setIsEditingText(false)
    setSelectedLayerId('text')
    setOpenColorPicker(null)
    setIsMenuOpen(false)
    setProgress('Reset')
  }

  return (
    <main className="asset-generator-page" id="main-content">
      <div className="asset-generator-top-left">
        <button
          type="button"
          className={`asset-generator-icon-button ${isMenuOpen ? 'is-active' : ''}`}
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          title="Menu"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
        </button>

        {isMenuOpen ? (
          <div className="asset-generator-main-menu" role="menu" aria-label="Asset generator menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                resetDesign()
              }}
            >
              <span aria-hidden="true">↺</span>
              <strong>Reset design</strong>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false)
                exportAllAssets()
              }}
              disabled={isExporting}
            >
              <span aria-hidden="true">↓</span>
              <strong>{isExporting ? 'Exporting...' : 'Download assets'}</strong>
            </button>

            <div className="asset-generator-menu-separator" />

            <section className="asset-generator-menu-assets" aria-label="Assets included in export">
              <header>
                <strong>Assets included</strong>
                <span>{assets.length} PNG files</span>
              </header>
              <div>
                {assets.map((asset) => (
                  <article key={asset.name}>
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.imageSize.width} x {asset.imageSize.height} @ {asset.dpi} DPI
                    </span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <div className="asset-generator-top-right" aria-label="Canvas actions">
        <button type="button" className="asset-generator-action-button" onClick={resetDesign}>
          Reset
        </button>
        <button type="button" className="asset-generator-share-button" onClick={exportAllAssets} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Share'}
        </button>
        <button
          type="button"
          className={`asset-generator-icon-button ${isPreviewOpen ? 'is-active' : ''}`}
          aria-label="Toggle device preview"
          aria-expanded={isPreviewOpen}
          title="Device preview"
          onClick={() => setSettings({ preview: isPreviewOpen ? 'closed' : 'open' })}
        >
          <span aria-hidden="true">▣</span>
        </button>
      </div>

      <section className={`asset-generator-design ${isPreviewOpen ? 'is-preview-open' : ''}`}>
        <div className="asset-generator-canvas-toolbar" aria-label="Canvas toolbar">
          <button
            type="button"
            className={`asset-generator-tool-button ${activeTool === 'hand' ? 'is-active' : ''}`}
            onClick={() => {
              setSettings({ tool: 'hand' })
              setIsEditingText(false)
            }}
            aria-label="Hand tool"
            aria-keyshortcuts="H"
            title="Hand"
          >
            <span aria-hidden="true">✋</span>
            <small>H</small>
          </button>
          <button
            type="button"
            className={`asset-generator-tool-button ${activeTool === 'select' ? 'is-active' : ''}`}
            onClick={() => {
              setSettings({ tool: 'select' })
              setIsEditingText(false)
            }}
            aria-label="Select tool"
            aria-keyshortcuts="V"
            title="Select"
          >
            <span aria-hidden="true">↖</span>
            <small>V</small>
          </button>
          <button
            type="button"
            className={`asset-generator-tool-button ${activeTool === 'text' ? 'is-active' : ''}`}
            onClick={() => {
              setSettings({ tool: 'text' })
              setSelectedLayerId('text')
              setIsEditingText(true)
            }}
            aria-label="Text tool"
            aria-keyshortcuts="T"
            title="Text"
          >
            <span aria-hidden="true">A</span>
            <small>T</small>
          </button>

          <div className="asset-generator-toolbar-divider" />

          <ColorSwatchPicker
            label="Bg"
            value={backgroundColor}
            isOpen={openColorPicker === 'bg'}
            onToggle={() => setOpenColorPicker(openColorPicker === 'bg' ? null : 'bg')}
            onChange={(color) => setSettings({ bg: color })}
          />
          <ColorSwatchPicker
            label="Tx"
            value={textColor}
            isOpen={openColorPicker === 'fg'}
            onToggle={() => setOpenColorPicker(openColorPicker === 'fg' ? null : 'fg')}
            onChange={(color) => setSettings({ fg: color })}
          />
        </div>

        {selectedLayerId === 'text' ? (
          <div className="asset-generator-style-panel" aria-label="Selected text layer controls">
            <label>
              <span>Font</span>
              <select
                value={fontKey}
                aria-label="Text font"
                onChange={(event) => setSettings({ font: event.target.value as FontKey })}
              >
                {fontOptions.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Weight</span>
              <select
                value={fontWeight}
                aria-label="Text weight"
                onChange={(event) => setSettings({ weight: event.target.value as FontWeight })}
              >
                <option value="700">Bold</option>
                <option value="800">Heavy</option>
                <option value="900">Black</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setSettings({ tool: 'text' })
                setIsEditingText(true)
              }}
            >
              Edit text
            </button>
          </div>
        ) : null}

        <div className="asset-generator-master">
          <canvas
            ref={masterCanvasRef}
            aria-label="Master design canvas"
            onClick={() => {
              setSelectedLayerId('text')
              if (activeTool === 'text') {
                setIsEditingText(true)
              }
            }}
          />
          {isEditingText ? (
            <textarea
              className="asset-generator-text-editor"
              value={text}
              maxLength={42}
              autoFocus
              rows={2}
              style={{ color: textColor, fontFamily, fontSize: `${editorFontSize}px`, fontWeight }}
              aria-label="Edit asset text"
              onChange={(event) => setSettings({ text: event.target.value })}
              onBlur={() => setIsEditingText(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.currentTarget.blur()
                }
              }}
            />
          ) : null}
        </div>
      </section>

      {isPreviewOpen ? (
        <section className="asset-generator-preview-panel is-open" aria-label="Phone preview">
          <div className="asset-generator-device-tabs" aria-label="Platform">
            <button
              type="button"
              className={platform === 'android' ? 'is-active' : ''}
              onClick={() => setSettings({ platform: 'android' })}
            >
              Android
            </button>
            <button
              type="button"
              className={platform === 'ios' ? 'is-active' : ''}
              onClick={() => setSettings({ platform: 'ios' })}
            >
              iOS
            </button>
          </div>

          <PhonePreview
            title={platform === 'ios' ? 'iOS' : 'Android'}
            platform={platform}
            canvasRef={phonePreviewRef}
          />
        </section>
      ) : null}

    </main>
  )
}
