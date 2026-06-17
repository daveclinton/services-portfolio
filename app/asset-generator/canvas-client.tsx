'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
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
  getTextLayerLayout,
  getValidColor,
  renderAsset,
  renderDesign,
} from './utils'
import { ColorSwatchPicker, PhonePreview } from './components'

type CanvasSnapshot = {
  text: string
  bg: string
  fg: string
  font: FontKey
  weight: FontWeight
  textPosition: { x: number; y: number }
}

type CanvasRect = {
  x: number
  y: number
  width: number
  height: number
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
  const [textPosition, setTextPosition] = useState({ x: masterSize / 2, y: masterSize / 2 })
  const [selectionRect, setSelectionRect] = useState<CanvasRect | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const undoStackRef = useRef<CanvasSnapshot[]>([])
  const redoStackRef = useRef<CanvasSnapshot[]>([])
  const textEditSnapshotRef = useRef<CanvasSnapshot | null>(null)
  const dragRef = useRef<
    | {
        mode: 'move-text'
        pointerId: number
        offsetX: number
        offsetY: number
        origin: { x: number; y: number }
        before: CanvasSnapshot
      }
    | {
        mode: 'box-select'
        pointerId: number
        origin: { x: number; y: number }
      }
    | null
  >(null)
  const canUndo = undoStackRef.current.length > 0
  const canRedo = redoStackRef.current.length > 0
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
          x: textPosition.x,
          y: textPosition.y,
          maxWidth: masterSize * 0.72,
          maxFontSize: masterSize * 0.22,
        },
      ],
    }),
    [backgroundColor, fontFamily, fontKey, fontWeight, text, textColor, textPosition.x, textPosition.y],
  )

  const getSnapshot = (): CanvasSnapshot => ({
    text,
    bg: backgroundColor,
    fg: textColor,
    font: fontKey,
    weight: fontWeight,
    textPosition,
  })

  const snapshotsEqual = (a: CanvasSnapshot, b: CanvasSnapshot) =>
    a.text === b.text &&
    a.bg === b.bg &&
    a.fg === b.fg &&
    a.font === b.font &&
    a.weight === b.weight &&
    a.textPosition.x === b.textPosition.x &&
    a.textPosition.y === b.textPosition.y

  const applySnapshot = (snapshot: CanvasSnapshot) => {
    setSettings({
      text: snapshot.text,
      bg: snapshot.bg,
      fg: snapshot.fg,
      font: snapshot.font,
      weight: snapshot.weight,
    })
    setTextPosition(snapshot.textPosition)
    setSelectedLayerId('text')
    setIsEditingText(false)
    setSelectionRect(null)
  }

  const commitHistory = (before: CanvasSnapshot, after = getSnapshot()) => {
    if (snapshotsEqual(before, after)) return

    undoStackRef.current.push(before)
    redoStackRef.current = []
    setHistoryVersion((version) => version + 1)
  }

  const undoDesign = () => {
    const previous = undoStackRef.current.pop()
    if (!previous) return

    redoStackRef.current.push(getSnapshot())
    applySnapshot(previous)
    setHistoryVersion((version) => version + 1)
  }

  const redoDesign = () => {
    const next = redoStackRef.current.pop()
    if (!next) return

    undoStackRef.current.push(getSnapshot())
    applySnapshot(next)
    setHistoryVersion((version) => version + 1)
  }

  const updateSettingsWithHistory = (
    nextSettings: Partial<{
      text: string
      bg: string
      fg: string
      font: FontKey
      weight: FontWeight
    }>,
  ) => {
    const before = getSnapshot()
    setSettings(nextSettings)

    const after = {
      ...before,
      ...nextSettings,
      bg: nextSettings.bg ? getValidColor(nextSettings.bg, before.bg) : before.bg,
      fg: nextSettings.fg ? getValidColor(nextSettings.fg, before.fg) : before.fg,
    }
    commitHistory(before, after)
  }

  useEffect(() => {
    const masterCanvas = masterCanvasRef.current
    if (!masterCanvas) return

    masterCanvas.width = masterSize
    masterCanvas.height = masterSize
    const ctx = masterCanvas.getContext('2d')
    if (!ctx) return
    renderDesign(ctx, design, masterSize, {
      hideLayerId: isEditingText ? 'text' : undefined,
      selectedLayerId: !isEditingText ? selectedLayerId : undefined,
    })

    if (selectionRect) {
      ctx.save()
      ctx.setLineDash([12, 8])
      ctx.lineWidth = 3
      ctx.strokeStyle = '#6965db'
      ctx.fillStyle = 'rgba(105, 101, 219, 0.1)'
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height)
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height)
      ctx.restore()
    }
  }, [design, isEditingText, selectedLayerId, selectionRect])

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

      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey
      const isRedo =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && event.shiftKey) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y')
      const isSelectAll = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a'

      if (isUndo) {
        event.preventDefault()
        undoDesign()
        return
      }

      if (isRedo) {
        event.preventDefault()
        redoDesign()
        return
      }

      if (isSelectAll) {
        event.preventDefault()
        setSelectedLayerId('text')
        setIsEditingText(false)
        return
      }

      if (event.key === 'Escape') {
        setSelectedLayerId('background')
        setIsEditingText(false)
        setSelectionRect(null)
        return
      }

      if (selectedLayerId === 'text' && ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault()
        const distance = event.shiftKey ? 10 : 1
        const delta = {
          ArrowUp: { x: 0, y: -distance },
          ArrowRight: { x: distance, y: 0 },
          ArrowDown: { x: 0, y: distance },
          ArrowLeft: { x: -distance, y: 0 },
        }[event.key]

        if (delta) {
          const before = getSnapshot()
          const margin = 96
          const nextPosition = {
            x: Math.min(masterSize - margin, Math.max(margin, textPosition.x + delta.x)),
            y: Math.min(masterSize - margin, Math.max(margin, textPosition.y + delta.y)),
          }
          setTextPosition(nextPosition)
          commitHistory(before, { ...before, textPosition: nextPosition })
        }
        return
      }

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
  }, [commitHistory, getSnapshot, redoDesign, selectedLayerId, setSettings, textPosition.x, textPosition.y, undoDesign])

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = masterCanvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * masterSize,
      y: ((event.clientY - rect.top) / rect.height) * masterSize,
    }
  }

  const getRectFromPoints = (start: { x: number; y: number }, end: { x: number; y: number }): CanvasRect => ({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  })

  const rectsIntersect = (a: CanvasRect, b: CanvasRect) =>
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y

  const getTextLayer = () => {
    const layer = design.layers.find((candidate) => candidate.id === 'text')
    return layer?.type === 'text' ? layer : null
  }

  const getTextLayerBounds = () => {
    const canvas = masterCanvasRef.current
    const textLayer = getTextLayer()
    if (!canvas || !textLayer) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    return getTextLayerLayout(ctx, textLayer).bounds
  }

  const isPointInsideTextLayer = (point: { x: number; y: number }) => {
    const bounds = getTextLayerBounds()
    if (!bounds) return false
    const padding = 32

    return (
      point.x >= bounds.x - padding &&
      point.x <= bounds.x + bounds.width + padding &&
      point.y >= bounds.y - padding &&
      point.y <= bounds.y + bounds.height + padding
    )
  }

  const moveTextLayer = (point: { x: number; y: number }, offsetX: number, offsetY: number) => {
    const margin = 96
    setTextPosition({
      x: Math.min(masterSize - margin, Math.max(margin, point.x - offsetX)),
      y: Math.min(masterSize - margin, Math.max(margin, point.y - offsetY)),
    })
  }

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
    const before = getSnapshot()
    setSettings({
      text: defaults.text,
      bg: defaults.backgroundColor,
      fg: defaults.textColor,
      font: defaults.font,
      weight: defaults.fontWeight,
      tool: defaults.tool,
    })
    setTextPosition({ x: masterSize / 2, y: masterSize / 2 })
    setIsEditingText(false)
    setSelectedLayerId('text')
    setOpenColorPicker(null)
    setIsMenuOpen(false)
    setProgress('Reset')
    commitHistory(before, {
      text: defaults.text,
      bg: defaults.backgroundColor,
      fg: defaults.textColor,
      font: defaults.font,
      weight: defaults.fontWeight,
      textPosition: { x: masterSize / 2, y: masterSize / 2 },
    })
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

          <button
            type="button"
            className="asset-generator-tool-button"
            onClick={undoDesign}
            aria-label="Undo"
            aria-keyshortcuts="Meta+Z Control+Z"
            title="Undo"
            disabled={!canUndo}
          >
            <span aria-hidden="true">↶</span>
          </button>
          <button
            type="button"
            className="asset-generator-tool-button"
            onClick={redoDesign}
            aria-label="Redo"
            aria-keyshortcuts="Meta+Shift+Z Control+Y"
            title="Redo"
            disabled={!canRedo}
          >
            <span aria-hidden="true">↷</span>
          </button>

          <div className="asset-generator-toolbar-divider" />

          <ColorSwatchPicker
            label="Bg"
            value={backgroundColor}
            isOpen={openColorPicker === 'bg'}
            onToggle={() => setOpenColorPicker(openColorPicker === 'bg' ? null : 'bg')}
            onChange={(color) => updateSettingsWithHistory({ bg: color })}
          />
          <ColorSwatchPicker
            label="Tx"
            value={textColor}
            isOpen={openColorPicker === 'fg'}
            onToggle={() => setOpenColorPicker(openColorPicker === 'fg' ? null : 'fg')}
            onChange={(color) => updateSettingsWithHistory({ fg: color })}
          />
        </div>

        {selectedLayerId === 'text' ? (
          <div className="asset-generator-style-panel" aria-label="Selected text layer controls">
            <label>
              <span>Font</span>
              <select
                value={fontKey}
                aria-label="Text font"
                onChange={(event) => updateSettingsWithHistory({ font: event.target.value as FontKey })}
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
                onChange={(event) => updateSettingsWithHistory({ weight: event.target.value as FontWeight })}
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
            className={selectedLayerId === 'text' ? 'is-text-selected' : undefined}
            onPointerDown={(event) => {
              const point = getCanvasPoint(event)
              if (!point) return

              setSelectionRect(null)
              const isTextHit = isPointInsideTextLayer(point)
              if (!isTextHit) {
                setSelectedLayerId('background')
                setIsEditingText(false)
                if (activeTool === 'select') {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragRef.current = {
                    mode: 'box-select',
                    pointerId: event.pointerId,
                    origin: point,
                  }
                  setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 })
                }
                return
              }

              setSelectedLayerId('text')

              if (activeTool === 'text') {
                setIsEditingText(true)
                return
              }

              if (activeTool === 'select') {
                event.currentTarget.setPointerCapture(event.pointerId)
                dragRef.current = {
                  mode: 'move-text',
                  pointerId: event.pointerId,
                  offsetX: point.x - textPosition.x,
                  offsetY: point.y - textPosition.y,
                  origin: { ...textPosition },
                  before: getSnapshot(),
                }
                setIsEditingText(false)
              }
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current
              if (!drag || drag.pointerId !== event.pointerId) return

              const point = getCanvasPoint(event)
              if (!point) return

              if (drag.mode === 'box-select') {
                setSelectionRect(getRectFromPoints(drag.origin, point))
                return
              }

              moveTextLayer(point, drag.offsetX, drag.offsetY)
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current
              if (!drag || drag.pointerId !== event.pointerId) return

              if (drag.mode === 'move-text') {
                commitHistory(drag.before)
              } else {
                const point = getCanvasPoint(event)
                const nextSelectionRect = point ? getRectFromPoints(drag.origin, point) : selectionRect
                const textBounds = getTextLayerBounds()
                const hasSelectionArea =
                  nextSelectionRect && (nextSelectionRect.width > 4 || nextSelectionRect.height > 4)

                if (hasSelectionArea && textBounds && rectsIntersect(nextSelectionRect, textBounds)) {
                  setSelectedLayerId('text')
                } else {
                  setSelectedLayerId('background')
                }

                setSelectionRect(null)
              }

              dragRef.current = null
            }}
            onPointerCancel={() => {
              dragRef.current = null
              setSelectionRect(null)
            }}
          />
          {isEditingText ? (
            <textarea
              className="asset-generator-text-editor"
              value={text}
              maxLength={42}
              autoFocus
              rows={2}
              style={{
                color: textColor,
                fontFamily,
                fontSize: `${editorFontSize}px`,
                fontWeight,
                left: `${(textPosition.x / masterSize) * 100}%`,
                top: `${(textPosition.y / masterSize) * 100}%`,
              }}
              aria-label="Edit asset text"
              onChange={(event) => {
                textEditSnapshotRef.current = textEditSnapshotRef.current ?? getSnapshot()
                setSettings({ text: event.target.value })
              }}
              onBlur={() => {
                if (textEditSnapshotRef.current) {
                  commitHistory(textEditSnapshotRef.current)
                  textEditSnapshotRef.current = null
                }
                setIsEditingText(false)
              }}
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
