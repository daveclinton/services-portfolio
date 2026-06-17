'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from 'react'
import JSZip from 'jszip'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Check,
  ChevronDown,
  Code2,
  Download,
  Hand,
  Lock,
  Menu,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Smartphone,
  Type,
  Undo2,
} from 'lucide-react'
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
  textAlignOptions,
  textAlignments,
  textSizeKeys,
  textSizeOptions,
  textVerticalAlignments,
  textVerticalAlignOptions,
  tools,
} from './constants'
import type { DesignLayer, FontKey, FontWeight, IconDesign, TextAlign, TextSizeKey, TextVerticalAlign } from './types'
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
  textSize: TextSizeKey
  textAlign: TextAlign
  textVerticalAlign: TextVerticalAlign
  textOpacity: string
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
      textSize: parseAsStringLiteral(textSizeKeys).withDefault(defaults.textSize),
      align: parseAsStringLiteral(textAlignments).withDefault(defaults.textAlign),
      valign: parseAsStringLiteral(textVerticalAlignments).withDefault(defaults.textVerticalAlign),
      opacity: parseAsString.withDefault(defaults.textOpacity),
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
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false)
  const [isTypographyOpen, setIsTypographyOpen] = useState(false)
  const [fontSearch, setFontSearch] = useState('')
  const [hoveredFontKey, setHoveredFontKey] = useState<FontKey | null>(null)
  const text = settings.text
  const backgroundColor = getValidColor(settings.bg, defaults.backgroundColor)
  const textColor = getValidColor(settings.fg, defaults.textColor)
  const fontKey = settings.font
  const fontFamily = getFontFamily(fontKey)
  const fontWeight = settings.weight
  const textSize = settings.textSize
  const textAlign = settings.align
  const textVerticalAlign = settings.valign
  const textOpacityValue = Math.min(100, Math.max(0, Number.parseInt(settings.opacity, 10) || 100))
  const textOpacity = textOpacityValue / 100
  const textSizeOption = textSizeOptions.find((option) => option.key === textSize) ?? textSizeOptions[1]
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
    () => getFittedFontSizeForText(text, 240, Math.round(textSizeOption.maxFontSize * 0.3), 16, fontFamily, fontWeight),
    [fontFamily, fontWeight, text, textSizeOption.maxFontSize],
  )
  const quickFontOptions = useMemo(() => fontOptions.filter((font) => ['rounded', 'sans', 'mono'].includes(font.key)), [])
  const sceneFontOptions = useMemo(() => fontOptions.filter((font) => ['rounded', 'sans', 'mono'].includes(font.key)), [])
  const availableFontOptions = useMemo(() => fontOptions.filter((font) => !['rounded', 'sans', 'mono'].includes(font.key)), [])
  const filteredSceneFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase()
    if (!query) return sceneFontOptions
    return sceneFontOptions.filter((font) => font.label.toLowerCase().includes(query))
  }, [fontSearch, sceneFontOptions])
  const filteredAvailableFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase()
    if (!query) return availableFontOptions
    return availableFontOptions.filter((font) => font.label.toLowerCase().includes(query))
  }, [availableFontOptions, fontSearch])
  const filteredFontOptions = useMemo(
    () => [...filteredSceneFonts, ...filteredAvailableFonts],
    [filteredAvailableFonts, filteredSceneFonts],
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
          textAlign,
          verticalAlign: textVerticalAlign,
          opacity: textOpacity,
          x: textPosition.x,
          y: textPosition.y,
          maxWidth: masterSize * 0.72,
          maxFontSize: textSizeOption.maxFontSize,
        },
      ],
    }),
    [
      backgroundColor,
      fontFamily,
      fontKey,
      fontWeight,
      text,
      textAlign,
      textColor,
      textOpacity,
      textPosition.x,
      textPosition.y,
      textSizeOption.maxFontSize,
      textVerticalAlign,
    ],
  )

  const getSnapshot = (): CanvasSnapshot => ({
    text,
    bg: backgroundColor,
    fg: textColor,
    font: fontKey,
    weight: fontWeight,
    textSize,
    textAlign,
    textVerticalAlign,
    textOpacity: String(textOpacityValue),
    textPosition,
  })

  const snapshotsEqual = (a: CanvasSnapshot, b: CanvasSnapshot) =>
    a.text === b.text &&
    a.bg === b.bg &&
    a.fg === b.fg &&
    a.font === b.font &&
    a.weight === b.weight &&
    a.textSize === b.textSize &&
    a.textAlign === b.textAlign &&
    a.textVerticalAlign === b.textVerticalAlign &&
    a.textOpacity === b.textOpacity &&
    a.textPosition.x === b.textPosition.x &&
    a.textPosition.y === b.textPosition.y

  const applySnapshot = (snapshot: CanvasSnapshot) => {
    setSettings({
      text: snapshot.text,
      bg: snapshot.bg,
      fg: snapshot.fg,
      font: snapshot.font,
      weight: snapshot.weight,
      textSize: snapshot.textSize,
      align: snapshot.textAlign,
      valign: snapshot.textVerticalAlign,
      opacity: snapshot.textOpacity,
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
      textSize: TextSizeKey
      align: TextAlign
      valign: TextVerticalAlign
      opacity: string
    }>,
  ) => {
    const before = getSnapshot()
    setSettings(nextSettings)

    const after = {
      ...before,
      ...nextSettings,
      bg: nextSettings.bg ? getValidColor(nextSettings.bg, before.bg) : before.bg,
      fg: nextSettings.fg ? getValidColor(nextSettings.fg, before.fg) : before.fg,
      textAlign: nextSettings.align ?? before.textAlign,
      textVerticalAlign: nextSettings.valign ?? before.textVerticalAlign,
      textOpacity: nextSettings.opacity ?? before.textOpacity,
    }
    commitHistory(before, after)
  }

  const selectFont = (nextFont: FontKey) => {
    updateSettingsWithHistory({ font: nextFont })
    setHoveredFontKey(nextFont)
    setIsFontPickerOpen(false)
  }

  const selectWeight = (nextWeight: FontWeight) => {
    updateSettingsWithHistory({ weight: nextWeight })
  }

  const selectTextSize = (nextSize: TextSizeKey) => {
    updateSettingsWithHistory({ textSize: nextSize })
  }

  const selectTextAlign = (nextAlign: TextAlign) => {
    updateSettingsWithHistory({ align: nextAlign })
  }

  const selectTextVerticalAlign = (nextAlign: TextVerticalAlign) => {
    updateSettingsWithHistory({ valign: nextAlign })
  }

  const selectTextOpacity = (nextOpacity: string) => {
    updateSettingsWithHistory({ opacity: nextOpacity })
  }

  const getTextAlignIcon = (align: TextAlign) => {
    if (align === 'left') return <AlignLeft aria-hidden="true" />
    if (align === 'right') return <AlignRight aria-hidden="true" />
    return <AlignCenter aria-hidden="true" />
  }

  const getTextVerticalAlignIcon = (align: TextVerticalAlign) => {
    if (align === 'top') return <AlignVerticalJustifyStart aria-hidden="true" />
    if (align === 'bottom') return <AlignVerticalJustifyEnd aria-hidden="true" />
    return <AlignVerticalJustifyCenter aria-hidden="true" />
  }

  const getFontIcon = (key: FontKey) => {
    if (key === 'rounded') return <Hand aria-hidden="true" />
    if (key === 'mono') return <Code2 aria-hidden="true" />
    return <Type aria-hidden="true" />
  }

  const getFontTitle = (key: FontKey) => {
    if (key === 'rounded') return 'Hand-drawn font'
    if (key === 'mono') return 'Code font'
    if (key === 'display') return 'Display font'
    return 'Normal font'
  }

  const onFontPickerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsFontPickerOpen(false)
      return
    }

    if (!filteredFontOptions.length) return

    const currentIndex = Math.max(
      0,
      filteredFontOptions.findIndex((font) => font.key === (hoveredFontKey ?? fontKey)),
    )

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHoveredFontKey(filteredFontOptions[(currentIndex + 1) % filteredFontOptions.length].key)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHoveredFontKey(filteredFontOptions[(currentIndex - 1 + filteredFontOptions.length) % filteredFontOptions.length].key)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      selectFont(hoveredFontKey ?? filteredFontOptions[currentIndex].key)
    }
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
      textSize: defaults.textSize,
      align: defaults.textAlign,
      valign: defaults.textVerticalAlign,
      opacity: defaults.textOpacity,
      tool: defaults.tool,
    })
    setTextPosition({ x: masterSize / 2, y: masterSize / 2 })
    setIsEditingText(false)
    setSelectedLayerId('text')
    setOpenColorPicker(null)
    setIsMenuOpen(false)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
    setFontSearch('')
    setHoveredFontKey(defaults.font)
    setProgress('Reset')
    commitHistory(before, {
      text: defaults.text,
      bg: defaults.backgroundColor,
      fg: defaults.textColor,
      font: defaults.font,
      weight: defaults.fontWeight,
      textSize: defaults.textSize,
      textAlign: defaults.textAlign,
      textVerticalAlign: defaults.textVerticalAlign,
      textOpacity: defaults.textOpacity,
      textPosition: { x: masterSize / 2, y: masterSize / 2 },
    })
  }

  const toggleMainMenu = () => {
    setIsMenuOpen((open) => !open)
    setOpenColorPicker(null)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
  }

  const toggleFontPicker = () => {
    const nextOpen = !isFontPickerOpen
    setIsFontPickerOpen(nextOpen)
    setHoveredFontKey(fontKey)
    setOpenColorPicker(null)
    setIsMenuOpen(false)
    setIsTypographyOpen(false)
    if (!nextOpen) setFontSearch('')
  }

  const toggleTypography = () => {
    setIsTypographyOpen((open) => !open)
    setOpenColorPicker(null)
    setIsFontPickerOpen(false)
    setIsMenuOpen(false)
  }

  const toggleColorPicker = (target: 'bg' | 'fg') => {
    setOpenColorPicker(openColorPicker === target ? null : target)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
    setIsMenuOpen(false)
  }

  return (
    <main className="asset-generator-page" id="main-content">
      <div className="App-menu">
        <div className="App-menu_top">
          <div
            className="Stack Stack_vertical App-menu_top__left zen-mode-transition"
            style={{ '--gap': 4 } as CSSProperties}
          >
            <div className="dropdown-menu-event-wrapper">
              <button
                type="button"
                className="dropdown-menu-button main-menu-trigger"
                id="asset-generator-main-menu-trigger"
                aria-label="Open menu"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                data-state={isMenuOpen ? 'open' : 'closed'}
                data-testid="main-menu-trigger"
                title="Menu"
                onClick={toggleMainMenu}
              >
                <Menu aria-hidden="true" />
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
                    <RotateCcw aria-hidden="true" />
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
                    <Download aria-hidden="true" />
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

            <div className="selected-shape-actions-container" aria-hidden="true" />
          </div>

          <section className="shapes-section" aria-labelledby="asset-generator-shapes-title">
            <div className="Stack Stack_vertical" style={{ '--gap': 1 } as CSSProperties}>
              <div
                className="Stack Stack_horizontal App-toolbar-container"
                style={{ '--gap': 1, justifyContent: 'center' } as CSSProperties}
              >
                <div
                  className="Island App-toolbar App-toolbar--compact"
                  style={{ '--padding': 1 } as CSSProperties}
                  aria-label="Canvas toolbar"
                >
                  <div className="HintViewer" aria-hidden="true" />
                  <h2 className="visually-hidden" id="asset-generator-shapes-title">
                    Shapes
                  </h2>
                  <div className="Stack Stack_horizontal" style={{ '--gap': 0.5 } as CSSProperties}>
                    <label className="ToolIcon ToolIcon__lock" title="Lock">
                      <input
                        type="checkbox"
                        className="ToolIcon_type_checkbox"
                        aria-label="Lock selected layer"
                        disabled
                      />
                      <div className="ToolIcon__icon">
                        <Lock aria-hidden="true" />
                      </div>
                    </label>

                    <div className="App-toolbar__divider" />

                    <label className={`ToolIcon Shape ${activeTool === 'hand' ? 'active' : ''}`} title="Hand">
                      <input
                        type="radio"
                        className="ToolIcon_type_radio"
                        name="editor-current-shape"
                        checked={activeTool === 'hand'}
                        aria-label="Hand tool"
                        aria-keyshortcuts="H"
                        onChange={() => {
                          setSettings({ tool: 'hand' })
                          setIsEditingText(false)
                        }}
                      />
                      <div className="ToolIcon__icon">
                        <Hand aria-hidden="true" />
                        <span className="ToolIcon__keybinding">H</span>
                      </div>
                    </label>

                    <label className={`ToolIcon Shape ${activeTool === 'select' ? 'active' : ''}`} title="Select">
                      <input
                        type="radio"
                        className="ToolIcon_type_radio"
                        name="editor-current-shape"
                        checked={activeTool === 'select'}
                        aria-label="Select tool"
                        aria-keyshortcuts="V"
                        onChange={() => {
                          setSettings({ tool: 'select' })
                          setIsEditingText(false)
                        }}
                      />
                      <div className="ToolIcon__icon">
                        <MousePointer2 aria-hidden="true" />
                        <span className="ToolIcon__keybinding">V</span>
                      </div>
                    </label>

                    <label className={`ToolIcon Shape ${activeTool === 'text' ? 'active' : ''}`} title="Text">
                      <input
                        type="radio"
                        className="ToolIcon_type_radio"
                        name="editor-current-shape"
                        checked={activeTool === 'text'}
                        aria-label="Text tool"
                        aria-keyshortcuts="T"
                        onChange={() => {
                          setSettings({ tool: 'text' })
                          setSelectedLayerId('text')
                          setIsEditingText(true)
                        }}
                      />
                      <div className="ToolIcon__icon">
                        <Type aria-hidden="true" />
                        <span className="ToolIcon__keybinding">T</span>
                      </div>
                    </label>

                    <div className="App-toolbar__divider" />

                    <section className="FontPicker__container" aria-labelledby="asset-generator-fonts-title">
                      <h2 className="visually-hidden" id="asset-generator-fonts-title">
                        Fonts
                      </h2>
                      <div className="buttonList" role="radiogroup" aria-label="Default fonts">
                        {quickFontOptions.map((font) => (
                          <button
                            key={font.key}
                            type="button"
                            className={`properties-trigger ${fontKey === font.key ? 'active' : ''}`}
                            aria-label={`${getFontTitle(font.key)} (${font.label})`}
                            aria-checked={fontKey === font.key}
                            role="radio"
                            data-testid={`font-family-${font.key}`}
                            title={font.label}
                            onClick={() => selectFont(font.key)}
                          >
                            {getFontIcon(font.key)}
                          </button>
                        ))}
                      </div>

                      <div className="ButtonSeparator" />

                      <div className="FontPicker__popoverRoot" onKeyDown={onFontPickerKeyDown}>
                        <button
                          type="button"
                          data-openpopup="fontFamily"
                          className={`properties-trigger FontPickerTrigger ${isFontPickerOpen ? 'active' : ''}`}
                          aria-label="Show fonts"
                          aria-haspopup="dialog"
                          aria-expanded={isFontPickerOpen}
                          data-testid="font-family-show-fonts"
                          title="Show fonts"
                          onClick={toggleFontPicker}
                        >
                          <Type aria-hidden="true" />
                          <ChevronDown aria-hidden="true" className="FontPickerTrigger__chevron" />
                        </button>

                        {isFontPickerOpen ? (
                          <div className="properties-content" role="dialog" aria-label="Font picker">
                            <label className="quick-search">
                              <Search aria-hidden="true" />
                              <input
                                className="quick-search-input"
                                type="text"
                                placeholder="Search fonts..."
                                aria-label="Search fonts"
                                value={fontSearch}
                                onChange={(event) => {
                                  setFontSearch(event.target.value)
                                  const nextQuery = event.target.value.trim().toLowerCase()
                                  const nextFont = fontOptions.find((font) => font.label.toLowerCase().includes(nextQuery))
                                  setHoveredFontKey(nextFont?.key ?? null)
                                }}
                              />
                            </label>

                            <div className="dropdown-menu fonts manual-hover">
                              {filteredSceneFonts.length ? (
                                <div className="dropdown-menu-group">
                                  <div className="dropdown-menu-group-title">Scene Fonts</div>
                                  {filteredSceneFonts.map((font) => (
                                    <button
                                      key={font.key}
                                      type="button"
                                      value={font.key}
                                      className={`dropdown-menu-item ${fontKey === font.key ? 'selected' : ''} ${
                                        hoveredFontKey === font.key ? 'hovered' : ''
                                      }`}
                                      title={font.label}
                                      tabIndex={fontKey === font.key ? 0 : -1}
                                      onClick={() => selectFont(font.key)}
                                      onMouseMove={() => setHoveredFontKey(font.key)}
                                    >
                                      {fontKey === font.key ? <Check aria-hidden="true" /> : getFontIcon(font.key)}
                                      <span
                                        className="dropdown-menu-item-content"
                                        style={{ fontFamily: font.family }}
                                      >
                                        {font.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}

                              {filteredAvailableFonts.length ? (
                                <div className="dropdown-menu-group">
                                  <div className="dropdown-menu-group-title">Available Fonts</div>
                                  {filteredAvailableFonts.map((font) => (
                                    <button
                                      key={font.key}
                                      type="button"
                                      value={font.key}
                                      className={`dropdown-menu-item ${fontKey === font.key ? 'selected' : ''} ${
                                        hoveredFontKey === font.key ? 'hovered' : ''
                                      }`}
                                      title={font.label}
                                      tabIndex={fontKey === font.key ? 0 : -1}
                                      onClick={() => selectFont(font.key)}
                                      onMouseMove={() => setHoveredFontKey(font.key)}
                                    >
                                      {fontKey === font.key ? <Check aria-hidden="true" /> : getFontIcon(font.key)}
                                      <span
                                        className="dropdown-menu-item-content"
                                        style={{ fontFamily: font.family }}
                                      >
                                        {font.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}

                              {!filteredFontOptions.length ? (
                                <div className="dropdown-menu-empty">No fonts found</div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </section>

                    <div className="ButtonSeparator" />

                    <div className="TextProperties__popoverRoot">
                      <button
                        type="button"
                        className={`properties-trigger TextPropertiesTrigger ${isTypographyOpen ? 'active' : ''}`}
                        aria-label="Text properties"
                        aria-haspopup="dialog"
                        aria-expanded={isTypographyOpen}
                        title="Text properties"
                        onClick={toggleTypography}
                      >
                        <SlidersHorizontal aria-hidden="true" />
                        <ChevronDown aria-hidden="true" className="FontPickerTrigger__chevron" />
                      </button>

                      {isTypographyOpen ? (
                        <div className="properties-content text-properties-content" role="dialog" aria-label="Text properties">
                          <section className="text-properties-section text-properties-font-size">
                            <h3>Font Size</h3>
                            <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Font size">
                              {textSizeOptions.map((size) => (
                                <button
                                  key={size.key}
                                  type="button"
                                  className={`properties-trigger text-size-trigger ${textSize === size.key ? 'active' : ''}`}
                                  aria-label={`${size.label} font size`}
                                  aria-checked={textSize === size.key}
                                  role="radio"
                                  onClick={() => selectTextSize(size.key)}
                                >
                                  <span>{size.label}</span>
                                </button>
                              ))}
                            </div>
                          </section>

                          <section className="text-properties-section text-properties-weight">
                            <h3>Weight</h3>
                            <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Text weight">
                              {fontWeights.map((weight) => (
                                <button
                                  key={weight}
                                  type="button"
                                  className={`properties-trigger typography-trigger ${fontWeight === weight ? 'active' : ''}`}
                                  aria-label={`Text weight ${weight}`}
                                  aria-checked={fontWeight === weight}
                                  role="radio"
                                  onClick={() => selectWeight(weight)}
                                >
                                  <span style={{ fontWeight: weight }}>{weight === '700' ? 'B' : weight === '800' ? 'H' : 'K'}</span>
                                </button>
                              ))}
                            </div>
                          </section>

                          <section className="text-properties-section text-properties-align-horizontal">
                            <h3>Text Alignment</h3>
                            <div className="buttonList text-property-button-list" role="radiogroup" aria-label="Text alignment">
                              {textAlignOptions.map((align) => (
                                <button
                                  key={align.key}
                                  type="button"
                                  className={`properties-trigger align-trigger ${textAlign === align.key ? 'active' : ''}`}
                                  aria-label={`${align.label} align text`}
                                  aria-checked={textAlign === align.key}
                                  role="radio"
                                  onClick={() => selectTextAlign(align.key)}
                                >
                                  {getTextAlignIcon(align.key)}
                                </button>
                              ))}
                            </div>
                          </section>

                          <section className="text-properties-section text-properties-align-vertical">
                            <h3>Vertical Alignment</h3>
                            <div
                              className="buttonList text-property-button-list"
                              role="radiogroup"
                              aria-label="Vertical text alignment"
                            >
                              {textVerticalAlignOptions.map((align) => (
                                <button
                                  key={align.key}
                                  type="button"
                                  className={`properties-trigger align-trigger ${
                                    textVerticalAlign === align.key ? 'active' : ''
                                  }`}
                                  aria-label={`${align.label} vertical align text`}
                                  aria-checked={textVerticalAlign === align.key}
                                  role="radio"
                                  onClick={() => selectTextVerticalAlign(align.key)}
                                >
                                  {getTextVerticalAlignIcon(align.key)}
                                </button>
                              ))}
                            </div>
                          </section>

                          <section className="text-properties-section text-properties-opacity">
                            <label>
                              <span className="opacity-label">Opacity</span>
                              <div className="opacity-slider-container">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={textOpacityValue}
                                  className="opacity-slider"
                                  aria-label="Text opacity"
                                  onChange={(event) => selectTextOpacity(event.target.value)}
                                />
                                <span className="opacity-value">{textOpacityValue}%</span>
                              </div>
                            </label>
                          </section>

                          <section className="text-properties-section text-properties-edit">
                            <button
                              type="button"
                              className="text-properties-edit-button"
                              onClick={() => {
                                setSettings({ tool: 'text' })
                                setIsEditingText(true)
                                setIsTypographyOpen(false)
                              }}
                            >
                              <Pencil aria-hidden="true" />
                              <span>Edit text</span>
                            </button>
                          </section>
                        </div>
                      ) : null}
                    </div>

                    <div className="App-toolbar__divider" />

                    <button
                      type="button"
                      className="ToolIcon Shape"
                      onClick={undoDesign}
                      aria-label="Undo"
                      aria-keyshortcuts="Meta+Z Control+Z"
                      title="Undo"
                      disabled={!canUndo}
                    >
                      <span className="ToolIcon__icon">
                        <Undo2 aria-hidden="true" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className="ToolIcon Shape"
                      onClick={redoDesign}
                      aria-label="Redo"
                      aria-keyshortcuts="Meta+Shift+Z Control+Y"
                      title="Redo"
                      disabled={!canRedo}
                    >
                      <span className="ToolIcon__icon">
                        <Redo2 aria-hidden="true" />
                      </span>
                    </button>

                    <div className="App-toolbar__divider" />

                    <ColorSwatchPicker
                      label="Bg"
                      value={backgroundColor}
                      isOpen={openColorPicker === 'bg'}
                      onToggle={() => toggleColorPicker('bg')}
                      onChange={(color) => updateSettingsWithHistory({ bg: color })}
                    />
                    <ColorSwatchPicker
                      label="Tx"
                      value={textColor}
                      isOpen={openColorPicker === 'fg'}
                      onToggle={() => toggleColorPicker('fg')}
                      onChange={(color) => updateSettingsWithHistory({ fg: color })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="layer-ui__wrapper__top-right zen-mode-transition" aria-label="Canvas actions">
            <div className="excalidraw-ui-top-right">
              <button type="button" className="excalidraw-button" onClick={resetDesign} title="Reset design">
                <RotateCcw aria-hidden="true" />
              </button>
              <button
                type="button"
                className="excalidraw-button collab-button"
                onClick={exportAllAssets}
                disabled={isExporting}
                title={isExporting ? 'Exporting assets' : 'Download assets'}
              >
                <Download aria-hidden="true" />
              </button>
            </div>

            <label className="sidebar-trigger__label-element" title="Device preview">
              <input
                type="checkbox"
                checked={isPreviewOpen}
                aria-label="Device preview"
                aria-keyshortcuts="0"
                onChange={() => setSettings({ preview: isPreviewOpen ? 'closed' : 'open' })}
              />
              <span className="sidebar-trigger default-sidebar-trigger">
                <Smartphone aria-hidden="true" />
              </span>
            </label>
          </div>
        </div>
      </div>

      <section className={`asset-generator-design ${isPreviewOpen ? 'is-preview-open' : ''}`}>
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
                opacity: textOpacity,
                textAlign,
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
