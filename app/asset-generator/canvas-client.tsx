'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from 'react'
import { Download, Menu, RotateCcw, SlidersHorizontal, Smartphone, X } from 'lucide-react'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useOutsideClick } from '@/lib/use-outside-click'
import {
  assets,
  defaults,
  fontKeys,
  fontOptions,
  fontWeights,
  masterSize,
  platforms,
  previewStates,
  textAlignments,
  textSizeKeys,
  textVerticalAlignments,
  tools,
} from './constants'
import {
  addIconLayer,
  createAssetDocumentFromSettings,
  createDefaultEditorState,
  createFrameLayer,
  createShapeLayer,
  getBackgroundLayer,
  getDefaultAssetDocument,
  getTextLayer as getDocumentTextLayer,
  getTextSizeOption,
  serializeDocumentToSettings,
  serializeEditorToSettings,
  updateIconLayer,
} from './document'
import type {
  AssetDocument,
  DesignLayer,
  EditorState,
  EditorTool,
  FontKey,
  FontWeight,
  FrameLayer,
  ShapeLayer,
  ShapeType,
  TextAlign,
  TextSizeKey,
  TextVerticalAlign,
} from './types'
import {
  canvasToBlob,
  downloadBlob,
  getFittedFontSizeForText,
  getColorWithOpacity,
  getFontFamily,
  getTextLayerLayout,
  renderAsset,
  renderDesign,
  CanvasRect,
} from './utils/'
import { ColorSwatchPicker } from './components/ColorSwatchPicker'
import { ColorPickerSidePanel, getColorPickerLabel } from './components/ColorPickerSidePanel'
import { EditorStyleToolbar } from './components/EditorStyleToolbar'
import { EditorToolsToolbar } from './components/EditorToolsToolbar'
import { PhonePreview } from './components/PhonePreview'
import { exportAllAssets as exportAllAssetsLib } from './lib/export-logic'
import { useIsMobile } from './hooks/useIsMobile'
import { getTopPicksForTarget } from './lib/color-palette'
import { getCanvasStyleDomain, getStrokeFillLayer } from './lib/style-domain'

export function CanvasClient() {
  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const phonePreviewRef = useRef<HTMLCanvasElement>(null)
  const mainMenuRef = useRef<HTMLDivElement>(null)
  const fontPickerRef = useRef<HTMLDivElement>(null)
  const textPropertiesRef = useRef<HTMLDivElement>(null)
  const backgroundColorPickerRef = useRef<HTMLDivElement>(null)
  const textColorPickerRef = useRef<HTMLDivElement>(null)
  const shapeStrokeColorPickerRef = useRef<HTMLDivElement>(null)
  const shapeFillColorPickerRef = useRef<HTMLDivElement>(null)
  const splashColorPickerRef = useRef<HTMLDivElement>(null)
  const mobilePropertiesRef = useRef<HTMLDivElement>(null)
  const colorPickerPanelRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [settings, setSettings] = useQueryStates(
    {
      text: parseAsString.withDefault(defaults.text),
      bg: parseAsString.withDefault(defaults.backgroundColor),
      bgOpacity: parseAsString.withDefault(defaults.backgroundOpacity),
      fg: parseAsString.withDefault(defaults.textColor),
      fgOpacity: parseAsString.withDefault(defaults.textColorOpacity),
      splashBg: parseAsString.withDefault(defaults.splashBackgroundColor),
      splashOpacity: parseAsString.withDefault(defaults.splashBackgroundOpacity),
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
  const [document, setDocument] = useState<AssetDocument>(() => createAssetDocumentFromSettings(settings))
  const [editorState, setEditorState] = useState<EditorState>(() => createDefaultEditorState(settings))
  const [progress, setProgress] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [openColorPicker, setOpenColorPicker] = useState<'bg' | 'fg' | 'shapeStroke' | 'shapeFill' | 'splash' | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false)
  const [isTypographyOpen, setIsTypographyOpen] = useState(false)
  const [fontSearch, setFontSearch] = useState('')
  const [hoveredFontKey, setHoveredFontKey] = useState<FontKey | null>(null)
  const [isMobilePropertiesOpen, setIsMobilePropertiesOpen] = useState(false)
  const backgroundLayer = getBackgroundLayer(document)
  const textLayer = getDocumentTextLayer(document)
  const design = document.icon
  const platform = editorState.platform
  const activeTool = editorState.activeTool
  const selectedLayerId = editorState.selectedLayerId
  const isPreviewOpen = editorState.previewOpen
  const text = textLayer.text
  const backgroundColor = backgroundLayer.color
  const textColor = textLayer.color
  const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerId) ?? backgroundLayer
  const styleDomain = getCanvasStyleDomain(selectedLayer)
  const strokeFillLayer = getStrokeFillLayer(selectedLayer)
  const strokeColor = strokeFillLayer?.strokeColor ?? '#1e1e1e'
  const fillColor = strokeFillLayer?.backgroundColor ?? 'transparent'
  const strokeFillOpacityValue = Math.round((strokeFillLayer?.opacity ?? 1) * 100)
  const splashBackgroundColor = document.preview.splashBackgroundColor
  const fontKey = textLayer.fontKey
  const fontFamily = textLayer.fontFamily
  const fontWeight = textLayer.fontWeight
  const textSize = textLayer.textSize
  const textAlign = textLayer.textAlign
  const textVerticalAlign = textLayer.verticalAlign
  const backgroundOpacityValue = Math.round(backgroundLayer.opacity * 100)
  const textColorOpacityValue = Math.round(textLayer.colorOpacity * 100)
  const splashBackgroundOpacityValue = Math.round(document.preview.splashBackgroundOpacity * 100)
  const textOpacityValue = Math.round(textLayer.opacity * 100)
  const textColorOpacity = textLayer.colorOpacity
  const textOpacity = textLayer.opacity
  const splashPreviewBackground = getColorWithOpacity(
    splashBackgroundColor,
    document.preview.splashBackgroundOpacity,
    defaults.splashBackgroundColor,
  )
  const textSizeOption = getTextSizeOption(textSize)
  const textPosition = { x: textLayer.x, y: textLayer.y }
  const [isEditingText, setIsEditingText] = useState(false)
  const [selectionRect, setSelectionRect] = useState<CanvasRect | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const undoStackRef = useRef<AssetDocument[]>([])
  const redoStackRef = useRef<AssetDocument[]>([])
  const textEditSnapshotRef = useRef<AssetDocument | null>(null)
  const dragRef = useRef<
    | {
        mode: 'move-text'
        pointerId: number
        offsetX: number
        offsetY: number
        origin: { x: number; y: number }
        before: AssetDocument
      }
    | {
        mode: 'box-select'
        pointerId: number
        origin: { x: number; y: number }
      }
    | {
        mode: 'draw-frame'
        pointerId: number
        origin: { x: number; y: number }
        before: AssetDocument
      }
    | {
        mode: 'draw-shape'
        pointerId: number
        shapeType: ShapeType
        origin: { x: number; y: number }
        before: AssetDocument
      }
    | {
        mode: 'move-frame'
        pointerId: number
        layerId: FrameLayer['id']
        offsetX: number
        offsetY: number
        before: AssetDocument
      }
    | {
        mode: 'move-shape'
        pointerId: number
        layerId: ShapeLayer['id']
        offsetX: number
        offsetY: number
        before: AssetDocument
      }
    | null
  >(null)
  const canUndo = undoStackRef.current.length > 0
  const canRedo = redoStackRef.current.length > 0

  useOutsideClick(mainMenuRef, () => {
    if (isMenuOpen) setIsMenuOpen(false)
  })

  useOutsideClick(fontPickerRef, () => {
    if (isFontPickerOpen) {
      setIsFontPickerOpen(false)
      setFontSearch('')
    }
  })

  useOutsideClick(textPropertiesRef, () => {
    if (isTypographyOpen) setIsTypographyOpen(false)
  })

  useOutsideClick(backgroundColorPickerRef, () => {
    if (openColorPicker === 'bg') setOpenColorPicker(null)
  })

  useOutsideClick(textColorPickerRef, () => {
    if (openColorPicker === 'fg') setOpenColorPicker(null)
  })

  useOutsideClick(shapeStrokeColorPickerRef, () => {
    if (openColorPicker === 'shapeStroke') setOpenColorPicker(null)
  })

  useOutsideClick(shapeFillColorPickerRef, () => {
    if (openColorPicker === 'shapeFill') setOpenColorPicker(null)
  })

  useOutsideClick(splashColorPickerRef, () => {
    if (openColorPicker === 'splash') setOpenColorPicker(null)
  })

  useOutsideClick(mobilePropertiesRef, () => {
    if (isMobilePropertiesOpen) setIsMobilePropertiesOpen(false)
  })

  const editorFontSize = useMemo(
    () => getFittedFontSizeForText(text, 240, Math.round(textSizeOption.maxFontSize * 0.3), 16, fontFamily, fontWeight),
    [fontFamily, fontWeight, text, textSizeOption.maxFontSize],
  )
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

  const getSnapshot = () => document

  const documentsEqual = (a: AssetDocument, b: AssetDocument) => JSON.stringify(a) === JSON.stringify(b)

  const applyDocument = (nextDocument: AssetDocument) => {
    setDocument(nextDocument)
    setSettings(serializeDocumentToSettings(nextDocument))
  }

  const updateDocument = (updater: (current: AssetDocument) => AssetDocument) => {
    const nextDocument = updater(document)
    applyDocument(nextDocument)
    return nextDocument
  }

  const setSelectedLayerId = (selectedLayerId: DesignLayer['id']) => {
    setEditorState((current) => ({ ...current, selectedLayerId }))
  }

  const updateEditorState = (updater: (current: EditorState) => EditorState) => {
    const nextEditorState = updater(editorState)
    setEditorState(nextEditorState)
    setSettings(serializeEditorToSettings(nextEditorState))
  }

  const applySnapshot = (snapshot: AssetDocument) => {
    applyDocument(snapshot)
    setSelectedLayerId('background')
    setIsEditingText(false)
    setSelectionRect(null)
  }

  const commitHistory = (before: AssetDocument, after = getSnapshot()) => {
    if (documentsEqual(before, after)) return

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

  const updateDocumentWithHistory = (updater: (current: AssetDocument) => AssetDocument) => {
    const before = getSnapshot()
    const after = updateDocument(updater)
    commitHistory(before, after)
  }

  const selectFont = (nextFont: FontKey) => {
    updateDocumentWithHistory((current) =>
      updateIconLayer(current, 'text', (layer) => ({
        ...layer,
        fontKey: nextFont,
        fontFamily: getFontFamily(nextFont),
      })),
    )
    setHoveredFontKey(nextFont)
    setIsFontPickerOpen(false)
  }

  const selectWeight = (nextWeight: FontWeight) => {
    updateDocumentWithHistory((current) => updateIconLayer(current, 'text', (layer) => ({ ...layer, fontWeight: nextWeight })))
  }

  const selectTextSize = (nextSize: TextSizeKey) => {
    const nextSizeOption = getTextSizeOption(nextSize)
    updateDocumentWithHistory((current) =>
      updateIconLayer(current, 'text', (layer) => ({
        ...layer,
        textSize: nextSize,
        maxFontSize: nextSizeOption.maxFontSize,
      })),
    )
  }

  const selectTextAlign = (nextAlign: TextAlign) => {
    updateDocumentWithHistory((current) => updateIconLayer(current, 'text', (layer) => ({ ...layer, textAlign: nextAlign })))
  }

  const selectTextVerticalAlign = (nextAlign: TextVerticalAlign) => {
    updateDocumentWithHistory((current) =>
      updateIconLayer(current, 'text', (layer) => ({ ...layer, verticalAlign: nextAlign })),
    )
  }

  const selectTextOpacity = (nextOpacity: string) => {
    updateDocumentWithHistory((current) =>
      updateIconLayer(current, 'text', (layer) => ({
        ...layer,
        opacity: Math.min(100, Math.max(0, Number.parseInt(nextOpacity, 10) || 0)) / 100,
      })),
    )
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
          const after = updateDocument((current) =>
            updateIconLayer(current, 'text', (layer) => ({
              ...layer,
              x: nextPosition.x,
              y: nextPosition.y,
            })),
          )
          commitHistory(before, after)
        }
        return
      }

      if (event.key.toLowerCase() === 'h') {
        updateEditorState((current) => ({ ...current, activeTool: 'hand' }))
        setIsEditingText(false)
      }

      if (event.key.toLowerCase() === 'v' || event.key === '1') {
        updateEditorState((current) => ({ ...current, activeTool: 'select' }))
        setIsEditingText(false)
      }

      if (event.key.toLowerCase() === 't') {
        updateEditorState((current) => ({ ...current, activeTool: 'text', selectedLayerId: 'text' }))
        setSelectedLayerId('text')
        setIsEditingText(true)
      }

      if (event.key.toLowerCase() === 'r') {
        updateEditorState((current) => ({ ...current, activeTool: 'rectangle' }))
        setIsEditingText(false)
      }

      if (event.key.toLowerCase() === 'd') {
        updateEditorState((current) => ({ ...current, activeTool: 'diamond' }))
        setIsEditingText(false)
      }

      if (event.key.toLowerCase() === 'o') {
        updateEditorState((current) => ({ ...current, activeTool: 'ellipse' }))
        setIsEditingText(false)
      }

      if (event.key.toLowerCase() === 'f') {
        updateEditorState((current) => ({ ...current, activeTool: 'frame' }))
        setIsEditingText(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commitHistory, getSnapshot, redoDesign, selectedLayerId, textPosition.x, textPosition.y, undoDesign])

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

  const isShapeTool = (tool: EditorState['activeTool']): tool is ShapeType =>
    tool === 'rectangle' || tool === 'diamond' || tool === 'ellipse'

  const getFrameLayers = () =>
    design.layers.filter((layer): layer is FrameLayer => layer.type === 'frame')

  const getShapeLayers = () =>
    design.layers.filter((layer): layer is ShapeLayer => layer.type === 'rectangle' || layer.type === 'diamond' || layer.type === 'ellipse')

  const getFrameLayer = (layerId: DesignLayer['id']) => {
    const layer = design.layers.find((candidate) => candidate.id === layerId)
    return layer?.type === 'frame' ? layer : null
  }

  const getFrameLayerAtPoint = (point: { x: number; y: number }) => {
    const edgePadding = 14
    return [...getFrameLayers()].reverse().find((frame) => {
      const insideX = point.x >= frame.x - edgePadding && point.x <= frame.x + frame.width + edgePadding
      const insideY = point.y >= frame.y - edgePadding && point.y <= frame.y + frame.height + edgePadding
      if (!insideX || !insideY) return false

      const nearLeft = Math.abs(point.x - frame.x) <= edgePadding
      const nearRight = Math.abs(point.x - (frame.x + frame.width)) <= edgePadding
      const nearTop = Math.abs(point.y - frame.y) <= edgePadding
      const nearBottom = Math.abs(point.y - (frame.y + frame.height)) <= edgePadding

      return nearLeft || nearRight || nearTop || nearBottom
    })
  }

  const getShapeLayer = (layerId: DesignLayer['id']) => {
    const layer = design.layers.find((candidate) => candidate.id === layerId)
    return layer?.type === 'rectangle' || layer?.type === 'diamond' || layer?.type === 'ellipse' ? layer : null
  }

  const getShapeLayerAtPoint = (point: { x: number; y: number }) => {
    return [...getShapeLayers()].reverse().find((shape) => {
      if (point.x < shape.x || point.x > shape.x + shape.width || point.y < shape.y || point.y > shape.y + shape.height) {
        return false
      }

      if (shape.type === 'ellipse') {
        const rx = shape.width / 2
        const ry = shape.height / 2
        const cx = shape.x + rx
        const cy = shape.y + ry
        return ((point.x - cx) ** 2) / (rx ** 2 || 1) + ((point.y - cy) ** 2) / (ry ** 2 || 1) <= 1
      }

      if (shape.type === 'diamond') {
        const rx = shape.width / 2
        const ry = shape.height / 2
        const cx = shape.x + rx
        const cy = shape.y + ry
        return Math.abs(point.x - cx) / (rx || 1) + Math.abs(point.y - cy) / (ry || 1) <= 1
      }

      return true
    })
  }

  const moveFrameLayer = (layerId: FrameLayer['id'], point: { x: number; y: number }, offsetX: number, offsetY: number) => {
    const layer = getFrameLayer(layerId)
    if (!layer) return

    const nextX = Math.min(masterSize - layer.width, Math.max(0, point.x - offsetX))
    const nextY = Math.min(masterSize - layer.height, Math.max(0, point.y - offsetY))

    updateDocument((current) =>
      updateIconLayer(current, layerId, (frame) => ({
        ...frame,
        x: nextX,
        y: nextY,
      })),
    )
  }

  const moveShapeLayer = (layerId: ShapeLayer['id'], point: { x: number; y: number }, offsetX: number, offsetY: number) => {
    const layer = getShapeLayer(layerId)
    if (!layer) return

    const nextX = Math.min(masterSize - layer.width, Math.max(0, point.x - offsetX))
    const nextY = Math.min(masterSize - layer.height, Math.max(0, point.y - offsetY))

    updateDocument((current) =>
      updateIconLayer(current, layerId, (shape) => ({
        ...shape,
        x: nextX,
        y: nextY,
      })),
    )
  }

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
    const nextPosition = {
      x: Math.min(masterSize - margin, Math.max(margin, point.x - offsetX)),
      y: Math.min(masterSize - margin, Math.max(margin, point.y - offsetY)),
    }
    updateDocument((current) =>
      updateIconLayer(current, 'text', (layer) => ({
        ...layer,
        x: nextPosition.x,
        y: nextPosition.y,
      })),
    )
  }

  const handleExportAssets = async () => {
    setIsExporting(true)
    try {
      await exportAllAssetsLib(design, (progress) => setProgress(progress))
    } catch {
      setProgress('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const resetDesign = () => {
    const before = getSnapshot()
    const nextDocument = getDefaultAssetDocument()
    const nextEditorState: EditorState = {
      ...editorState,
      activeTool: defaults.tool,
      selectedLayerId: 'background',
    }
    applyDocument(nextDocument)
    setEditorState(nextEditorState)
    setSettings(serializeEditorToSettings(nextEditorState))
    setIsEditingText(false)
    setOpenColorPicker(null)
    setIsMenuOpen(false)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
    setFontSearch('')
    setHoveredFontKey(defaults.font)
    setProgress('Reset')
    commitHistory(before, nextDocument)
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

  const toggleColorPicker = (target: 'bg' | 'fg' | 'shapeStroke' | 'shapeFill' | 'splash') => {
    setOpenColorPicker(openColorPicker === target ? null : target)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
    setIsMenuOpen(false)
  }

  const handleSelectTool = (tool: EditorTool, options?: { selectText?: boolean; editText?: boolean }) => {
    updateEditorState((current) => ({
      ...current,
      activeTool: tool,
      ...(options?.selectText ? { selectedLayerId: 'text' as const } : {}),
    }))
    if (options?.selectText) setSelectedLayerId('text')
    if (options?.editText) setIsEditingText(true)
    else setIsEditingText(false)
  }

  useEffect(() => {
    setOpenColorPicker(null)
    setIsFontPickerOpen(false)
    setIsTypographyOpen(false)
    setFontSearch('')
    setIsMobilePropertiesOpen(false)
  }, [selectedLayerId])

  const colorPickerAnchorRef =
    openColorPicker === 'bg'
      ? backgroundColorPickerRef
      : openColorPicker === 'fg'
        ? textColorPickerRef
        : openColorPicker === 'shapeStroke'
          ? shapeStrokeColorPickerRef
          : openColorPicker === 'shapeFill'
            ? shapeFillColorPickerRef
            : openColorPicker === 'splash'
              ? splashColorPickerRef
              : null

  useEffect(() => {
    if (!openColorPicker) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (colorPickerPanelRef.current?.contains(target)) return
      const anchor =
        openColorPicker === 'bg'
          ? backgroundColorPickerRef.current
          : openColorPicker === 'fg'
            ? textColorPickerRef.current
            : openColorPicker === 'shapeStroke'
              ? shapeStrokeColorPickerRef.current
              : openColorPicker === 'shapeFill'
                ? shapeFillColorPickerRef.current
                : openColorPicker === 'splash'
                  ? splashColorPickerRef.current
                  : null
      if (anchor?.contains(target)) return
      setOpenColorPicker(null)
    }

    globalThis.document.addEventListener('pointerdown', onPointerDown)
    return () => globalThis.document.removeEventListener('pointerdown', onPointerDown)
  }, [openColorPicker])

  const styleToolbar = (
    <EditorStyleToolbar
      styleDomain={styleDomain}
      backgroundColor={backgroundColor}
      backgroundOpacityValue={backgroundOpacityValue}
      textColor={textColor}
      textColorOpacityValue={textColorOpacityValue}
      textOpacityValue={textOpacityValue}
      fontKey={fontKey}
      fontWeight={fontWeight}
      textSize={textSize}
      textAlign={textAlign}
      textVerticalAlign={textVerticalAlign}
      strokeFillLayer={strokeFillLayer}
      strokeColor={strokeColor}
      fillColor={fillColor}
      strokeFillOpacityValue={strokeFillOpacityValue}
      openColorPicker={openColorPicker}
      isFontPickerOpen={isFontPickerOpen}
      isTypographyOpen={isTypographyOpen}
      fontSearch={fontSearch}
      hoveredFontKey={hoveredFontKey}
      filteredSceneFonts={filteredSceneFonts}
      filteredAvailableFonts={filteredAvailableFonts}
      filteredFontOptions={filteredFontOptions}
      fontPickerRef={fontPickerRef}
      textPropertiesRef={textPropertiesRef}
      backgroundColorPickerRef={backgroundColorPickerRef}
      textColorPickerRef={textColorPickerRef}
      shapeStrokeColorPickerRef={shapeStrokeColorPickerRef}
      shapeFillColorPickerRef={shapeFillColorPickerRef}
      onToggleColorPicker={toggleColorPicker}
      onBackgroundColorChange={(color) =>
        updateDocumentWithHistory((current) =>
          updateIconLayer(current, 'background', (layer) => ({ ...layer, color })),
        )
      }
      onBackgroundOpacityChange={(opacity) =>
        updateDocumentWithHistory((current) =>
          updateIconLayer(current, 'background', (layer) => ({ ...layer, opacity: opacity / 100 })),
        )
      }
      onTextColorChange={(color) =>
        updateDocumentWithHistory((current) => updateIconLayer(current, 'text', (layer) => ({ ...layer, color })))
      }
      onTextColorOpacityChange={(opacity) =>
        updateDocumentWithHistory((current) =>
          updateIconLayer(current, 'text', (layer) => ({ ...layer, colorOpacity: opacity / 100 })),
        )
      }
      onStrokeColorChange={(color) => {
        if (!strokeFillLayer) return
        updateDocumentWithHistory((current) =>
          updateIconLayer(current, strokeFillLayer.id, (layer) => ({ ...layer, strokeColor: color })),
        )
      }}
      onStrokeOpacityChange={(opacity) => {
        if (!strokeFillLayer) return
        updateDocumentWithHistory((current) =>
          updateIconLayer(current, strokeFillLayer.id, (layer) => ({ ...layer, opacity: opacity / 100 })),
        )
      }}
      onFillColorChange={(color) => {
        if (!strokeFillLayer) return
        updateDocumentWithHistory((current) =>
          updateIconLayer(current, strokeFillLayer.id, (layer) => ({ ...layer, backgroundColor: color })),
        )
      }}
      onFillOpacityChange={(opacity) => {
        if (!strokeFillLayer) return
        updateDocumentWithHistory((current) =>
          updateIconLayer(current, strokeFillLayer.id, (layer) => ({
            ...layer,
            backgroundColor:
              opacity === 0
                ? 'transparent'
                : layer.backgroundColor === 'transparent'
                  ? '#ffffff'
                  : layer.backgroundColor,
            opacity: opacity / 100,
          })),
        )
      }}
      onToggleFontPicker={toggleFontPicker}
      onToggleTypography={toggleTypography}
      onFontSearchChange={(value) => {
        setFontSearch(value)
        const nextQuery = value.trim().toLowerCase()
        const nextFont = fontOptions.find((font) => font.label.toLowerCase().includes(nextQuery))
        setHoveredFontKey(nextFont?.key ?? null)
      }}
      onHoverFont={setHoveredFontKey}
      onSelectFont={selectFont}
      onSelectWeight={selectWeight}
      onSelectTextSize={selectTextSize}
      onSelectTextAlign={selectTextAlign}
      onSelectTextVerticalAlign={selectTextVerticalAlign}
      onSelectTextOpacity={selectTextOpacity}
      onEditText={() => {
        updateEditorState((current) => ({ ...current, activeTool: 'text', selectedLayerId: 'text' }))
        setIsEditingText(true)
        setIsTypographyOpen(false)
      }}
      onFontPickerKeyDown={onFontPickerKeyDown}
    />
  )

  const toolsToolbar = (
    <EditorToolsToolbar
      activeTool={activeTool}
      canUndo={canUndo}
      canRedo={canRedo}
      onSelectTool={handleSelectTool}
      onUndo={undoDesign}
      onRedo={redoDesign}
    />
  )

  return (
    <main className={`asset-generator-page${isMobile ? " asset-generator-page--mobile" : ""}`} id="main-content">
      <div className="App-menu">
        <div className="App-menu_top">
          <div
            className="Stack Stack_vertical App-menu_top__left zen-mode-transition"
            style={{ '--gap': 4 } as CSSProperties}
          >
            <div className="dropdown-menu-event-wrapper" ref={mainMenuRef}>
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
                      handleExportAssets()
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

            <div className="selected-shape-actions-container zen-mode-transition">
              {!isMobile ? (
                <div className="Island App-menu__left" style={{ '--padding': 2 } as CSSProperties}>
                  {styleToolbar}
                </div>
              ) : null}
            </div>
          </div>

          <section className="shapes-section" aria-labelledby="asset-generator-shapes-title">
            <div className="Stack Stack_vertical" style={{ '--gap': 1 } as CSSProperties}>
              <div
                className="Stack Stack_horizontal App-toolbar-container"
                style={{ '--gap': 1, justifyContent: 'center' } as CSSProperties}
              >
                <h2 className="visually-hidden" id="asset-generator-shapes-title">
                  Canvas tools
                </h2>
                {!isMobile ? toolsToolbar : null}
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
                onClick={handleExportAssets}
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
                onChange={() => updateEditorState((current) => ({ ...current, previewOpen: !current.previewOpen }))}
              />
              <span className="sidebar-trigger default-sidebar-trigger">
                <Smartphone aria-hidden="true" />
              </span>
            </label>
          </div>
        </div>
      </div>

      <section className={`asset-generator-design ${isPreviewOpen && !isMobile ? 'is-preview-open' : ''}${isMobile ? ' is-mobile-canvas' : ''}`}>
        <div className="asset-generator-master">
          <canvas
            ref={masterCanvasRef}
            aria-label="Master design canvas"
            className={
              selectedLayerId === 'text'
                ? 'is-text-selected'
                : selectedLayerId === 'background'
                  ? 'is-canvas-selected'
                  : undefined
            }
            onPointerDown={(event) => {
              const point = getCanvasPoint(event)
              if (!point) return

              setSelectionRect(null)
              if (activeTool === 'frame') {
                event.currentTarget.setPointerCapture(event.pointerId)
                const before = getSnapshot()
                dragRef.current = {
                  mode: 'draw-frame',
                  pointerId: event.pointerId,
                  origin: point,
                  before,
                }
                setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 })
                setIsEditingText(false)
                return
              }

              if (isShapeTool(activeTool)) {
                event.currentTarget.setPointerCapture(event.pointerId)
                const before = getSnapshot()
                dragRef.current = {
                  mode: 'draw-shape',
                  pointerId: event.pointerId,
                  shapeType: activeTool,
                  origin: point,
                  before,
                }
                setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 })
                setIsEditingText(false)
                return
              }

              const hitShape = getShapeLayerAtPoint(point)
              if (hitShape) {
                setSelectedLayerId(hitShape.id)
                setIsEditingText(false)
                if (activeTool === 'select') {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragRef.current = {
                    mode: 'move-shape',
                    pointerId: event.pointerId,
                    layerId: hitShape.id,
                    offsetX: point.x - hitShape.x,
                    offsetY: point.y - hitShape.y,
                    before: getSnapshot(),
                  }
                }
                return
              }

              const hitFrame = getFrameLayerAtPoint(point)
              if (hitFrame) {
                setSelectedLayerId(hitFrame.id)
                setIsEditingText(false)
                if (activeTool === 'select') {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragRef.current = {
                    mode: 'move-frame',
                    pointerId: event.pointerId,
                    layerId: hitFrame.id,
                    offsetX: point.x - hitFrame.x,
                    offsetY: point.y - hitFrame.y,
                    before: getSnapshot(),
                  }
                }
                return
              }

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

              if (drag.mode === 'draw-frame') {
                setSelectionRect(getRectFromPoints(drag.origin, point))
                return
              }

              if (drag.mode === 'draw-shape') {
                setSelectionRect(getRectFromPoints(drag.origin, point))
                return
              }

              if (drag.mode === 'move-frame') {
                moveFrameLayer(drag.layerId, point, drag.offsetX, drag.offsetY)
                return
              }

              if (drag.mode === 'move-shape') {
                moveShapeLayer(drag.layerId, point, drag.offsetX, drag.offsetY)
                return
              }

              moveTextLayer(point, drag.offsetX, drag.offsetY)
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current
              if (!drag || drag.pointerId !== event.pointerId) return

              if (drag.mode === 'move-text' || drag.mode === 'move-frame' || drag.mode === 'move-shape') {
                commitHistory(drag.before)
              } else if (drag.mode === 'draw-frame') {
                const point = getCanvasPoint(event)
                const rect = point ? getRectFromPoints(drag.origin, point) : selectionRect
                const minFrameSize = 32

                if (rect && rect.width >= minFrameSize && rect.height >= minFrameSize) {
                  const frame = createFrameLayer(rect)
                  const after = addIconLayer(document, frame)
                  applyDocument(after)
                  setSelectedLayerId(frame.id)
                  commitHistory(drag.before, after)
                }

                setSelectionRect(null)
              } else if (drag.mode === 'draw-shape') {
                const point = getCanvasPoint(event)
                const rect = point ? getRectFromPoints(drag.origin, point) : selectionRect
                const minShapeSize = 24

                if (rect && rect.width >= minShapeSize && rect.height >= minShapeSize) {
                  const shape = createShapeLayer(drag.shapeType, rect)
                  const after = addIconLayer(document, shape)
                  applyDocument(after)
                  setSelectedLayerId(shape.id)
                  commitHistory(drag.before, after)
                }

                setSelectionRect(null)
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
                opacity: textOpacity * textColorOpacity,
                textAlign,
                left: `${(textPosition.x / masterSize) * 100}%`,
                top: `${(textPosition.y / masterSize) * 100}%`,
              }}
              aria-label="Edit asset text"
              onChange={(event) => {
                textEditSnapshotRef.current = textEditSnapshotRef.current ?? getSnapshot()
                updateDocument((current) =>
                  updateIconLayer(current, 'text', (layer) => ({
                    ...layer,
                    text: event.target.value,
                  })),
                )
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
              onClick={() => updateEditorState((current) => ({ ...current, platform: 'android' }))}
            >
              Android
            </button>
            <button
              type="button"
              className={platform === 'ios' ? 'is-active' : ''}
              onClick={() => updateEditorState((current) => ({ ...current, platform: 'ios' }))}
            >
              iOS
            </button>
          </div>

          <div className="asset-generator-preview-controls" aria-label="Splash screen color">
            <ColorSwatchPicker
              label="Splash"
              value={splashBackgroundColor}
              isOpen={openColorPicker === 'splash'}
              topPicks={getTopPicksForTarget('splash')}
              containerRef={splashColorPickerRef}
              opacity={splashBackgroundOpacityValue}
              onToggle={() => toggleColorPicker('splash')}
              onChange={(color) =>
                updateDocumentWithHistory((current) => ({
                  ...current,
                  preview: { ...current.preview, splashBackgroundColor: color },
                }))
              }
            />
          </div>

          <PhonePreview
            title={platform === 'ios' ? 'iOS' : 'Android'}
            platform={platform}
            canvasRef={phonePreviewRef}
            splashBackgroundColor={splashPreviewBackground}
          />
        </section>
      ) : null}

      {openColorPicker ? (
          <ColorPickerSidePanel
            panelRef={colorPickerPanelRef}
            target={openColorPicker}
            label={getColorPickerLabel(openColorPicker)}
            value={
              openColorPicker === 'bg'
                ? backgroundColor
                : openColorPicker === 'fg'
                  ? textColor
                  : openColorPicker === 'splash'
                    ? splashBackgroundColor
                    : openColorPicker === 'shapeFill' && fillColor === 'transparent'
                      ? '#ffffff'
                      : openColorPicker === 'shapeFill'
                        ? fillColor
                        : openColorPicker === 'shapeStroke'
                          ? strokeColor
                          : backgroundColor
            }
            opacity={
              openColorPicker === 'bg'
                ? backgroundOpacityValue
                : openColorPicker === 'fg'
                  ? textColorOpacityValue
                  : openColorPicker === 'splash'
                    ? splashBackgroundOpacityValue
                    : openColorPicker === 'shapeFill' && fillColor === 'transparent'
                      ? 0
                      : strokeFillOpacityValue
            }
            isOpen={Boolean(openColorPicker)}
            isMobile={isMobile}
            anchorRef={colorPickerAnchorRef ?? backgroundColorPickerRef}
            onClose={() => setOpenColorPicker(null)}
            onChange={(color) => {
              if (openColorPicker === 'bg') {
                updateDocumentWithHistory((current) =>
                  updateIconLayer(current, 'background', (layer) => ({ ...layer, color })),
                )
                return
              }
              if (openColorPicker === 'fg') {
                updateDocumentWithHistory((current) => updateIconLayer(current, 'text', (layer) => ({ ...layer, color })))
                return
              }
              if (openColorPicker === 'splash') {
                updateDocumentWithHistory((current) => ({
                  ...current,
                  preview: { ...current.preview, splashBackgroundColor: color },
                }))
                return
              }
              if (!strokeFillLayer) return
              if (openColorPicker === 'shapeStroke') {
                updateDocumentWithHistory((current) =>
                  updateIconLayer(current, strokeFillLayer.id, (layer) => ({ ...layer, strokeColor: color })),
                )
                return
              }
              updateDocumentWithHistory((current) =>
                updateIconLayer(current, strokeFillLayer.id, (layer) => ({ ...layer, backgroundColor: color })),
              )
            }}
            onOpacityChange={(opacity) => {
              if (openColorPicker === 'bg') {
                updateDocumentWithHistory((current) =>
                  updateIconLayer(current, 'background', (layer) => ({ ...layer, opacity: opacity / 100 })),
                )
                return
              }
              if (openColorPicker === 'fg') {
                updateDocumentWithHistory((current) =>
                  updateIconLayer(current, 'text', (layer) => ({ ...layer, colorOpacity: opacity / 100 })),
                )
                return
              }
              if (openColorPicker === 'splash') {
                updateDocumentWithHistory((current) => ({
                  ...current,
                  preview: { ...current.preview, splashBackgroundOpacity: opacity / 100 },
                }))
                return
              }
              if (!strokeFillLayer) return
              updateDocumentWithHistory((current) =>
                updateIconLayer(current, strokeFillLayer.id, (layer) => ({
                  ...layer,
                  backgroundColor:
                    openColorPicker === 'shapeFill' && opacity === 0
                      ? 'transparent'
                      : layer.backgroundColor === 'transparent'
                        ? '#ffffff'
                        : layer.backgroundColor,
                  opacity: opacity / 100,
                })),
              )
            }}
          />
      ) : null}

      {isMobile ? (
        <>
          {isMobilePropertiesOpen ? (
            <div
              className="asset-generator-mobile-properties-backdrop"
              aria-hidden="true"
              onClick={() => setIsMobilePropertiesOpen(false)}
            />
          ) : null}
          <div
            ref={mobilePropertiesRef}
            className={`asset-generator-mobile-properties-sheet ${isMobilePropertiesOpen ? 'is-open' : ''}`}
            role={isMobilePropertiesOpen ? 'dialog' : undefined}
            aria-label={isMobilePropertiesOpen ? 'Element properties' : undefined}
            aria-hidden={!isMobilePropertiesOpen}
          >
            <div className="asset-generator-mobile-properties-sheet__header">
              <span>Properties</span>
              <button
                type="button"
                className="asset-generator-mobile-properties-sheet__close"
                aria-label="Close properties"
                onClick={() => setIsMobilePropertiesOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="Island App-menu__left asset-generator-mobile-properties-sheet__body">
              {styleToolbar}
            </div>
          </div>

          <div className="asset-generator-bottom-bar">
            <div className="asset-generator-mobile-shape-actions">
              <button
                type="button"
                className={`compact-action-button properties-trigger ${isMobilePropertiesOpen ? 'active' : ''}`}
                aria-label="Show properties"
                aria-expanded={isMobilePropertiesOpen}
                title="Properties"
                onClick={() => setIsMobilePropertiesOpen((open) => !open)}
              >
                <SlidersHorizontal aria-hidden="true" />
              </button>
            </div>
            <div className="Island App-toolbar App-toolbar--compact App-toolbar--mobile">{toolsToolbar}</div>
          </div>
        </>
      ) : null}


    </main>
  )
}
