'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Ref } from 'react'
import JSZip from 'jszip'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'

type AssetDefinition = {
  name: string
  imageSize: { width: number; height: number }
  dpi: number
  format: 'png'
}

type DesignElement = {
  type: 'brand-mark'
  text: string
  backgroundColor: string
  textColor: string
  shape: 'rounded' | 'circle' | 'rectangle'
}

const masterSize = 1024
const shapes = ['rounded', 'circle', 'rectangle'] as const
const platforms = ['ios', 'android'] as const
const tools = ['select', 'hand', 'text'] as const
const previewStates = ['open', 'closed'] as const

const defaults = {
  text: 'Nova',
  backgroundColor: '#101114',
  textColor: '#f8fafc',
  shape: 'rounded',
  platform: 'ios',
  tool: 'select',
  preview: 'closed',
} as const

const colorSwatches = [
  '#7f56d9',
  '#12b76a',
  '#0ea5e9',
  '#2563eb',
  '#4f46e5',
  '#9333ea',
  '#c026d3',
  '#e11d48',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#101114',
  '#f8fafc',
] as const

const assets: AssetDefinition[] = [
  { name: 'logo-glow.png', imageSize: { width: 604, height: 604 }, dpi: 216, format: 'png' },
  { name: 'icon.png', imageSize: { width: 1024, height: 1024 }, dpi: 72, format: 'png' },
  { name: 'favicon.png', imageSize: { width: 48, height: 48 }, dpi: 108, format: 'png' },
  { name: 'splash-icon.png', imageSize: { width: 228, height: 213 }, dpi: 216, format: 'png' },
  {
    name: 'android-icon-background.png',
    imageSize: { width: 512, height: 512 },
    dpi: 72,
    format: 'png',
  },
  {
    name: 'android-icon-foreground.png',
    imageSize: { width: 512, height: 512 },
    dpi: 72,
    format: 'png',
  },
  {
    name: 'android-icon-monochrome.png',
    imageSize: { width: 432, height: 432 },
    dpi: 288,
    format: 'png',
  },
]

function fittedFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxSize: number) {
  let size = maxSize
  while (size > 18) {
    ctx.font = `800 ${size}px Inter, system-ui, sans-serif`
    if (ctx.measureText(text).width <= maxWidth) {
      return size
    }
    size -= 4
  }
  return size
}

function getFittedFontSizeForText(text: string, maxWidth: number, maxSize: number, minSize = 18) {
  if (typeof document === 'undefined') {
    return minSize
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return minSize

  let size = maxSize
  const value = text.trim() || 'App'

  while (size > minSize) {
    ctx.font = `800 ${size}px Inter, system-ui, sans-serif`
    if (ctx.measureText(value).width <= maxWidth) {
      return size
    }
    size -= 2
  }

  return minSize
}

function getValidColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

function normalizeHexColor(value: string, fallback: string) {
  const stripped = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
  if (stripped.length === 6) {
    return `#${stripped}`.toLowerCase()
  }
  return fallback
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function getShapeRadius(shape: DesignElement['shape'], size: number) {
  if (shape === 'circle') return size / 2
  if (shape === 'rectangle') return 0
  return size * 0.22
}

function renderDesign(
  ctx: CanvasRenderingContext2D,
  element: DesignElement,
  size = masterSize,
  options: { hideText?: boolean } = {},
) {
  const text = element.text.trim() || 'App'
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  roundedRect(ctx, 0, 0, size, size, getShapeRadius(element.shape, size))
  ctx.fillStyle = element.backgroundColor
  ctx.fill()

  if (options.hideText) {
    return
  }

  const fontSize = fittedFontSize(ctx, text, size * 0.72, size * 0.22)
  ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`
  ctx.fillStyle = element.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2)
}

function renderAsset(definition: AssetDefinition, element: DesignElement) {
  const { width, height } = definition.imageSize
  const dpiScale = definition.dpi / 72
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * dpiScale)
  canvas.height = Math.round(height * dpiScale)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(`Could not render ${definition.name}`)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(dpiScale, dpiScale)

  const logicalSize = Math.min(width, height)
  const offsetX = (width - logicalSize) / 2
  const offsetY = (height - logicalSize) / 2
  ctx.translate(offsetX, offsetY)
  ctx.scale(logicalSize / masterSize, logicalSize / masterSize)
  renderDesign(ctx, element)

  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not export canvas'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function CanvasClient() {
  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const phonePreviewRef = useRef<HTMLCanvasElement>(null)
  const [settings, setSettings] = useQueryStates(
    {
      text: parseAsString.withDefault(defaults.text),
      bg: parseAsString.withDefault(defaults.backgroundColor),
      fg: parseAsString.withDefault(defaults.textColor),
      shape: parseAsStringLiteral(shapes).withDefault(defaults.shape),
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
  const text = settings.text
  const backgroundColor = getValidColor(settings.bg, defaults.backgroundColor)
  const textColor = getValidColor(settings.fg, defaults.textColor)
  const shape = settings.shape
  const platform = settings.platform
  const activeTool = settings.tool
  const isPreviewOpen = settings.preview === 'open'
  const [isEditingText, setIsEditingText] = useState(false)
  const editorFontSize = useMemo(
    () => getFittedFontSizeForText(text, 340, 96, 18),
    [text],
  )

  const designElement = useMemo<DesignElement>(
    () => ({
      type: 'brand-mark',
      text,
      backgroundColor,
      textColor,
      shape,
    }),
    [backgroundColor, shape, text, textColor],
  )

  useEffect(() => {
    const masterCanvas = masterCanvasRef.current
    if (!masterCanvas) return

    masterCanvas.width = masterSize
    masterCanvas.height = masterSize
    const ctx = masterCanvas.getContext('2d')
    if (!ctx) return
    renderDesign(ctx, designElement, masterSize, { hideText: isEditingText })
  }, [designElement, isEditingText])

  useEffect(() => {
    const canvas = phonePreviewRef.current
    if (!canvas) return

    canvas.width = 228
    canvas.height = 228
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(228 / masterSize, 228 / masterSize)
    renderDesign(ctx, designElement)
  }, [designElement, isPreviewOpen])

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
        const canvas = renderAsset(asset, designElement)
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
      shape: defaults.shape,
      tool: defaults.tool,
    })
    setIsEditingText(false)
    setOpenColorPicker(null)
    setProgress('Reset')
  }

  return (
    <main className="asset-generator-page" id="main-content">
      <div className="asset-generator-top-left">
        <button type="button" className="asset-generator-icon-button" aria-label="Open menu" title="Menu">
          <span aria-hidden="true">☰</span>
        </button>
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

      <section className="asset-generator-design">
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
          <select
            className="asset-generator-toolbar-select"
            value={shape}
            aria-label="Shape"
            onChange={(event) => setSettings({ shape: event.target.value as DesignElement['shape'] })}
          >
            <option value="rounded">Rounded</option>
            <option value="circle">Circle</option>
            <option value="rectangle">Rectangle</option>
          </select>
        </div>

        <div className="asset-generator-master">
          <canvas
            ref={masterCanvasRef}
            aria-label="Master design canvas"
            onClick={() => {
              if (activeTool === 'text') {
                setIsEditingText(true)
              }
            }}
          />
          {isEditingText ? (
            <input
              className="asset-generator-text-editor"
              value={text}
              maxLength={24}
              autoFocus
              style={{ color: textColor, fontSize: `${editorFontSize}px` }}
              aria-label="Edit asset text"
              onChange={(event) => setSettings({ text: event.target.value })}
              onBlur={() => setIsEditingText(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') {
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

      <section className="asset-generator-list" aria-label="Export assets">
        {assets.map((asset) => (
          <article key={asset.name}>
            <strong>{asset.name}</strong>
            <span>
              {asset.imageSize.width} x {asset.imageSize.height} @ {asset.dpi} DPI
            </span>
          </article>
        ))}
      </section>
    </main>
  )
}

function ColorSwatchPicker({
  label,
  value,
  isOpen,
  onToggle,
  onChange,
}: {
  label: string
  value: string
  isOpen: boolean
  onToggle: () => void
  onChange: (color: string) => void
}) {
  const [draft, setDraft] = useState(value.toUpperCase())

  useEffect(() => {
    setDraft(value.toUpperCase())
  }, [value])

  const commitDraft = () => {
    const nextColor = normalizeHexColor(draft, value)
    setDraft(nextColor.toUpperCase())
    onChange(nextColor)
  }

  return (
    <div className="asset-generator-color-picker">
      <button
        type="button"
        className="asset-generator-color-trigger"
        aria-label={`${label} color`}
        aria-expanded={isOpen}
        onClick={onToggle}
        title={`${label} color`}
      >
        <span>{label}</span>
        <i style={{ backgroundColor: value }} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="asset-generator-color-popover" role="dialog" aria-label={`${label} color picker`}>
          <div className="asset-generator-color-preview" style={{ backgroundColor: value }}>
            <span>{value.toUpperCase()}</span>
          </div>

          <div className="asset-generator-color-grid" aria-label="Color swatches">
            {colorSwatches.map((color) => (
              <button
                key={color}
                type="button"
                className={color.toLowerCase() === value.toLowerCase() ? 'is-active' : ''}
                style={{ backgroundColor: color }}
                aria-label={color}
                onClick={() => onChange(color)}
              />
            ))}
          </div>

          <div className="asset-generator-color-fields">
            <label>
              <span style={{ backgroundColor: value }} aria-hidden="true" />
              <input
                value={draft}
                spellCheck={false}
                aria-label={`${label} hex color`}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitDraft()
                    event.currentTarget.blur()
                  }
                }}
              />
            </label>
            <input value="100%" readOnly aria-label={`${label} opacity`} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PhonePreview({
  title,
  platform,
  canvasRef,
}: {
  title: string
  platform: 'ios' | 'android'
  canvasRef: Ref<HTMLCanvasElement>
}) {
  return (
    <article className="asset-generator-phone">
      <div className={`asset-generator-phone-frame asset-generator-phone-frame-${platform}`}>
        <div className="asset-generator-phone-island" />
        <div className="asset-generator-phone-screen">
          <canvas ref={canvasRef} />
        </div>
      </div>
      <strong>{title} preview</strong>
    </article>
  )
}
