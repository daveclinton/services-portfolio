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

type FontKey = (typeof fontKeys)[number]
type FontWeight = (typeof fontWeights)[number]

type BackgroundLayer = {
  id: 'background'
  type: 'background'
  color: string
}

type TextLayer = {
  id: 'text'
  type: 'text'
  text: string
  color: string
  fontFamily: string
  fontKey: FontKey
  fontWeight: FontWeight
  x: number
  y: number
  maxWidth: number
  maxFontSize: number
}

type DesignLayer = BackgroundLayer | TextLayer

type IconDesign = {
  layers: DesignLayer[]
}

const masterSize = 1024
const platforms = ['ios', 'android'] as const
const tools = ['select', 'hand', 'text'] as const
const previewStates = ['open', 'closed'] as const
const fontKeys = ['sans', 'rounded', 'display', 'mono'] as const
const fontWeights = ['700', '800', '900'] as const

const defaults = {
  text: 'Nova',
  backgroundColor: '#101114',
  textColor: '#f8fafc',
  font: 'sans',
  fontWeight: '800',
  platform: 'ios',
  tool: 'select',
  preview: 'closed',
} as const

const fontOptions: Array<{ key: FontKey; label: string; family: string }> = [
  {
    key: 'sans',
    label: 'Sans',
    family: 'Inter, system-ui, sans-serif',
  },
  {
    key: 'rounded',
    label: 'Rounded',
    family: '"Arial Rounded MT Bold", Nunito, Inter, system-ui, sans-serif',
  },
  {
    key: 'display',
    label: 'Display',
    family: '"Arial Black", Impact, Inter, system-ui, sans-serif',
  },
  {
    key: 'mono',
    label: 'Mono',
    family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
]

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

function getFontFamily(fontKey: FontKey) {
  return fontOptions.find((font) => font.key === fontKey)?.family ?? fontOptions[0].family
}

function getTextLines(text: string) {
  const normalized = text.trim() || 'App'
  return normalized.split(/\n/g).map((line) => line.trim() || ' ')
}

function fittedFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  fontFamily: string,
  fontWeight: FontWeight,
) {
  let size = maxSize
  while (size > 18) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`
    const widestLine = Math.max(...getTextLines(text).map((line) => ctx.measureText(line).width))
    if (widestLine <= maxWidth) {
      return size
    }
    size -= 4
  }
  return size
}

function getFittedFontSizeForText(
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize = 18,
  fontFamily = 'Inter, system-ui, sans-serif',
  fontWeight: FontWeight = '800',
) {
  if (typeof document === 'undefined') {
    return minSize
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return minSize

  let size = maxSize
  const value = text.trim() || 'App'

  while (size > minSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`
    const widestLine = Math.max(...getTextLines(value).map((line) => ctx.measureText(line).width))
    if (widestLine <= maxWidth) {
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

function getAppIconRadius(size: number) {
  return size * 0.22
}

function renderDesign(
  ctx: CanvasRenderingContext2D,
  design: IconDesign,
  size = masterSize,
  options: { hideLayerId?: DesignLayer['id'] } = {},
) {
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  for (const layer of design.layers) {
    if (options.hideLayerId === layer.id) {
      continue
    }

    if (layer.type === 'background') {
      roundedRect(ctx, 0, 0, size, size, getAppIconRadius(size))
      ctx.fillStyle = layer.color
      ctx.fill()
      continue
    }

    const scale = size / masterSize
    const fontSize = fittedFontSize(
      ctx,
      layer.text,
      layer.maxWidth * scale,
      layer.maxFontSize * scale,
      layer.fontFamily,
      layer.fontWeight,
    )
    const lines = getTextLines(layer.text)
    const lineHeight = fontSize * 0.92
    const blockHeight = lineHeight * lines.length
    const startY = layer.y * scale - blockHeight / 2 + lineHeight / 2

    ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`
    ctx.fillStyle = layer.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    lines.forEach((line, index) => {
      ctx.fillText(line, layer.x * scale, startY + index * lineHeight)
    })
  }
}

function renderAsset(definition: AssetDefinition, design: IconDesign) {
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
  renderDesign(ctx, design)

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
