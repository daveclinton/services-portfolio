'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Smartphone, X } from 'lucide-react'
import { defaults, masterSize } from './constants'
import {
  addIconLayer,
  createShapeLayer,
  createTextLayerAtClick,
  createTextLayerFromBox,
  getDefaultAssetDocument,
  getTextLayerById,
  getTextSizeOption,
  removeIconLayers,
  resizeLayerInDocument,
  resizeTextLayerInDocument,
  rotateTextLayerInDocument,
  updateTextLayerContent,
} from './document'
import { useDocumentHistory } from './hooks/useDocumentHistory'
import { getColorWithOpacity, getFontFamily, renderDesign } from './utils/'
import { getRectFromPoints, type CanvasRect } from './utils/geometry'
import { PhonePreview } from './components/PhonePreview'
import { EditorToolsToolbar } from './components/EditorToolsToolbar'
import { TextLayerEditor } from './components/TextLayerEditor'
import { useIsMobile } from './hooks/useIsMobile'
import { getCanvasCursorClass } from './lib/canvas-cursor'
import { getAppIconCanvasPoint, getCanvasPoint } from './lib/canvas-coords'
import { createDefaultEditorState } from './lib/editor-state'
import {
  getMovableLayerIds,
  hasExceededDragThreshold,
  moveLayersByDelta,
} from './lib/drag-elements'
import { hitTestLayerAtPoint } from './lib/hit-detection'
import { renderMarquee } from './lib/render-marquee'
import { renderShapePreview } from './lib/render-shape-preview'
import { renderTextBoxPreview } from './lib/render-text-preview'
import { getMinTextBoxWidth, resolveTextBoxBounds } from './lib/text-box-tool'
import {
  getCursorForTransformHandle,
  getResizableLayerRect,
  getResizeHandleAtPoint,
  getTransformHandleAtPoint,
  isResizableLayer,
  resizeRectFromHandle,
  type ResizeHandle,
} from './lib/resize-handles'
import {
  getTextLayerBoxCenter,
  getTextLayerResizeRect,
  prepareTextLayerForResize,
} from './lib/text-layer-box'
import { resizeTextLayerFromHandle } from './lib/text-resize'
import { computeRotatedAngle, getPointerAngleDegrees } from './lib/text-rotate'
import { MIN_SHAPE_SIZE, resolveRectangleBounds } from './lib/rectangle-tool'
import {
  getLayersInMarquee,
  isMarqueeGesture,
  mergeMarqueeSelection,
  resolveClickSelection,
} from './lib/selection'
import { documentsEqual } from './lib/document-history'
import { isShapeTool } from './lib/shape-tool'
import { getCaretOffsetAtPoint } from './lib/text-caret'
import {
  captureFrozenTextEditorStyle,
  type FrozenTextEditorStyle,
} from './lib/text-editor-layout'
import {
  getTextLayerById as getDesignTextLayerById,
  isTextLayerHit,
  isTextLayerId,
} from './lib/text-layer'
import { isTextTool } from './lib/text-tool'
import type { AssetDocument, DesignLayer, EditorState, ShapeType, TextLayer } from './types'

type PreviewPlatform = 'ios' | 'android'

type DragState =
  | {
      mode: 'box-select'
      pointerId: number
      origin: { x: number; y: number }
      additive: boolean
    }
  | {
      mode: 'move-selection'
      pointerId: number
      origin: { x: number; y: number }
      before: AssetDocument
      layerIds: DesignLayer['id'][]
      hasMoved: boolean
    }
  | {
      mode: 'resize-layer'
      pointerId: number
      layerId: DesignLayer['id']
      handle: ResizeHandle
      startRect: CanvasRect
      before: AssetDocument
      hasMoved: boolean
      startTextLayer?: TextLayer
    }
  | {
      mode: 'rotate-layer'
      pointerId: number
      layerId: TextLayer['id']
      startRotation: number
      startPointerAngle: number
      center: { x: number; y: number }
      before: AssetDocument
      hasMoved: boolean
    }
  | {
      mode: 'draw-shape'
      shapeType: ShapeType
      pointerId: number
      origin: { x: number; y: number }
      before: AssetDocument
    }
  | {
      mode: 'draw-text'
      pointerId: number
      origin: { x: number; y: number }
      before: AssetDocument
    }

export function CanvasClient() {
  const masterCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasStageRef = useRef<HTMLDivElement>(null)
  const masterContainerRef = useRef<HTMLDivElement>(null)
  const phonePreviewRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const textEditBeforeRef = useRef<AssetDocument | null>(null)
  const textEditAutoSelectRef = useRef(false)
  const textEditCaretOffsetRef = useRef<number | null>(null)
  const textEditFrozenStyleRef = useRef<FrozenTextEditorStyle | null>(null)
  const editingTextLayerIdRef = useRef<DesignLayer['id'] | null>(null)
  const documentSnapshotRef = useRef<AssetDocument | null>(null)
  const isMobile = useIsMobile()
  const [platform, setPlatform] = useState<PreviewPlatform>('ios')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const { document, setDocument, commitHistory, undo, redo, cloneDocument } = useDocumentHistory(
    getDefaultAssetDocument(),
  )
  const [editorState, setEditorState] = useState<EditorState>(() => createDefaultEditorState())
  const [marquee, setMarquee] = useState<CanvasRect | null>(null)
  const [shapePreview, setShapePreview] = useState<{ shapeType: ShapeType; rect: CanvasRect } | null>(
    null,
  )
  const [textPreview, setTextPreview] = useState<CanvasRect | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  documentSnapshotRef.current = document
  const design = document.icon
  const { activeTool, selectedLayerIds, editingTextLayerId } = editorState
  editingTextLayerIdRef.current = editingTextLayerId
  const editingTextLayer: TextLayer | null = editingTextLayerId
    ? (design.layers.find(
        (layer): layer is TextLayer => layer.id === editingTextLayerId && layer.type === 'text',
      ) ?? null)
    : null
  const splashPreviewBackground = getColorWithOpacity(
    document.preview.splashBackgroundColor,
    document.preview.splashBackgroundOpacity,
    defaults.splashBackgroundColor,
  )
  const showPreviewPanel = !isMobile || isPreviewOpen

  const selectLayers = useCallback((nextSelectedLayerIds: DesignLayer['id'][]) => {
    setEditorState((current) => ({
      ...current,
      selectedLayerIds: nextSelectedLayerIds.length > 0 ? nextSelectedLayerIds : ['background'],
    }))
  }, [])

  const finishTextEditing = useCallback(() => {
    const before = textEditBeforeRef.current
    if (!before) return

    const layerId = editingTextLayerIdRef.current
    if (!layerId || !isTextLayerId(layerId)) return

    let after = documentSnapshotRef.current ?? before
    const textLayer = getTextLayerById(after, layerId)

    if (!textLayer?.text.trim()) {
      after = removeIconLayers(after, [layerId])
      selectLayers(['background'])
    } else {
      selectLayers([layerId])
    }

    setDocument(after)

    if (!documentsEqual(before, after)) {
      commitHistory(before, after)
    }

    textEditBeforeRef.current = null
    textEditAutoSelectRef.current = false
    textEditCaretOffsetRef.current = null
    textEditFrozenStyleRef.current = null
    editingTextLayerIdRef.current = null
    setEditorState((current) => ({ ...current, editingTextLayerId: null }))
  }, [commitHistory, selectLayers, setDocument])

  const startTextEditing = useCallback(
    (
      layerId: TextLayer['id'],
      options: {
        autoSelect?: boolean
        initialCaretOffset?: number | null
        sourceDocument?: AssetDocument
        historyBefore?: AssetDocument
      } = {},
    ) => {
      const canvas = masterCanvasRef.current
      const stage = canvasStageRef.current
      const ctx = canvas?.getContext('2d')
      const sourceDocument = options.sourceDocument ?? document
      const layer = getTextLayerById(sourceDocument, layerId)
      if (!canvas || !stage || !layer || !ctx) return

      textEditFrozenStyleRef.current = captureFrozenTextEditorStyle(canvas, stage, ctx, layer)
      textEditBeforeRef.current = options.historyBefore ?? cloneDocument(sourceDocument)
      textEditAutoSelectRef.current = options.autoSelect ?? false
      textEditCaretOffsetRef.current = options.initialCaretOffset ?? null
      editingTextLayerIdRef.current = layerId
      setEditorState((current) => ({
        ...current,
        activeTool: 'select',
        selectedLayerIds: [layerId],
        editingTextLayerId: layerId,
      }))
    },
    [cloneDocument, document],
  )

  const handleTextLayerChange = useCallback(
    (text: string) => {
      setDocument((current) => {
        const layerId = editingTextLayerIdRef.current
        if (!layerId || !isTextLayerId(layerId)) return current
        return updateTextLayerContent(current, layerId, text)
      })
    },
    [setDocument],
  )

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
    renderDesign(ctx, design, masterSize, {
      selectedLayerIds,
      editingTextLayerId,
      showSafeAreaGuide: true,
    })

    if (shapePreview) {
      renderShapePreview(ctx, shapePreview.shapeType, shapePreview.rect, masterSize)
    } else if (textPreview) {
      renderTextBoxPreview(ctx, textPreview, masterSize)
    } else if (marquee) {
      renderMarquee(ctx, marquee, masterSize)
    }
  }, [design, editingTextLayerId, marquee, selectedLayerIds, shapePreview, textPreview])

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

      const isMetaZ = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z'

      if (isMetaZ && event.shiftKey) {
        event.preventDefault()
        redo()
        return
      }

      if (isMetaZ) {
        event.preventDefault()
        undo()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const deletableLayerIds = selectedLayerIds.filter((layerId) => layerId !== 'background')
        if (deletableLayerIds.length === 0) return

        event.preventDefault()
        const before = cloneDocument(document)
        const after = removeIconLayers(document, deletableLayerIds)
        setDocument(after)
        selectLayers(['background'])
        commitHistory(before, after)
        return
      }

      if (event.key === 'Escape') {
        if (editingTextLayerId) {
          finishTextEditing()
          return
        }

        selectLayers(['background'])
        setMarquee(null)
        setEditorState((current) => ({ ...current, activeTool: 'select' }))
        return
      }

      if (event.key.toLowerCase() === 'v' || event.key === '1') {
        setEditorState((current) => ({ ...current, activeTool: 'select' }))
      }

      if (event.key.toLowerCase() === 't' || event.key === '8') {
        setEditorState((current) => ({ ...current, activeTool: 'text' }))
      }

      if (event.key.toLowerCase() === 'r' || event.key === '2') {
        setEditorState((current) => ({ ...current, activeTool: 'rectangle' }))
      }

      if (event.key.toLowerCase() === 'd') {
        setEditorState((current) => ({ ...current, activeTool: 'diamond' }))
      }

      if (event.key.toLowerCase() === 'o') {
        setEditorState((current) => ({ ...current, activeTool: 'ellipse' }))
      }

      const selectedTextLayerIds = selectedLayerIds.filter(isTextLayerId)

      if (
        selectedTextLayerIds.length > 0 &&
        ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)
      ) {
        event.preventDefault()
        const distance = event.shiftKey ? 10 : 1
        const delta = {
          ArrowUp: { x: 0, y: -distance },
          ArrowRight: { x: distance, y: 0 },
          ArrowDown: { x: 0, y: distance },
          ArrowLeft: { x: -distance, y: 0 },
        }[event.key]

        if (delta) {
          const before = cloneDocument(document)
          const after = moveLayersByDelta(document, selectedTextLayerIds, delta)
          setDocument(after)
          commitHistory(before, after)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    cloneDocument,
    commitHistory,
    document,
    editingTextLayerId,
    finishTextEditing,
    selectLayers,
    selectedLayerIds,
    redo,
    undo,
  ])

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = masterCanvasRef.current
    if (!canvas) return

    if (editingTextLayerId) {
      requestAnimationFrame(() => {
        finishTextEditing()
      })
      return
    }

    const point = getAppIconCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
    if (!point) return

    const ctx = canvas.getContext('2d')

    if (isTextTool(activeTool)) {
      if (!ctx) return

      const hitLayerId = hitTestLayerAtPoint(design, point, ctx)
      if (isTextLayerHit(design, hitLayerId)) {
        const layer = getDesignTextLayerById(design, hitLayerId)
        if (layer) {
          const initialCaretOffset = getCaretOffsetAtPoint(ctx, layer, point)
          startTextEditing(hitLayerId, { initialCaretOffset })
        }
        return
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        mode: 'draw-text',
        pointerId: event.pointerId,
        origin: point,
        before: cloneDocument(document),
      }
      setTextPreview({ x: point.x, y: point.y, width: 0, height: 1 })
      return
    }

    if (isShapeTool(activeTool)) {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        mode: 'draw-shape',
        shapeType: activeTool,
        pointerId: event.pointerId,
        origin: point,
        before: cloneDocument(document),
      }
      setShapePreview({ shapeType: activeTool, rect: { x: point.x, y: point.y, width: 0, height: 0 } })
      return
    }

    if (activeTool !== 'select') return

    if (!ctx) return

    if (selectedLayerIds.length === 1) {
      const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerIds[0])

      if (selectedLayer?.type === 'text') {
        const { layer: preparedLayer, rect } = prepareTextLayerForResize(ctx, selectedLayer)
        const rotation = preparedLayer.rotation ?? 0
        const handle = getTransformHandleAtPoint(point, rect, undefined, rotation)

        if (handle) {
          event.currentTarget.setPointerCapture(event.pointerId)
          if (handle === 'rotation') {
            dragRef.current = {
              mode: 'rotate-layer',
              pointerId: event.pointerId,
              layerId: selectedLayer.id,
              startRotation: rotation,
              startPointerAngle: getPointerAngleDegrees(getTextLayerBoxCenter(rect), point),
              center: getTextLayerBoxCenter(rect),
              before: cloneDocument(document),
              hasMoved: false,
            }
          } else {
            dragRef.current = {
              mode: 'resize-layer',
              pointerId: event.pointerId,
              layerId: selectedLayer.id,
              handle,
              startRect: rect,
              before: cloneDocument(document),
              hasMoved: false,
              startTextLayer: preparedLayer,
            }
          }
          setMarquee(null)
          return
        }
      } else if (isResizableLayer(selectedLayer)) {
        const shapeRotation =
          selectedLayer.type === 'rectangle' ||
          selectedLayer.type === 'diamond' ||
          selectedLayer.type === 'ellipse'
            ? (selectedLayer.rotation ?? 0)
            : 0
        const handle = getResizeHandleAtPoint(
          point,
          getResizableLayerRect(selectedLayer),
          undefined,
          shapeRotation,
        )
        if (handle) {
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = {
            mode: 'resize-layer',
            pointerId: event.pointerId,
            layerId: selectedLayer.id,
            handle,
            startRect: getResizableLayerRect(selectedLayer),
            before: cloneDocument(document),
            hasMoved: false,
          }
          setMarquee(null)
          return
        }
      }
    }

    const hitLayerId = hitTestLayerAtPoint(design, point, ctx)

    if (hitLayerId !== 'background') {
      const { selectedLayerIds: nextSelection, shouldDrag } = resolveClickSelection(
        selectedLayerIds,
        hitLayerId,
        event.shiftKey,
      )
      selectLayers(nextSelection)

      if (!shouldDrag) return

      const movableLayerIds = getMovableLayerIds(nextSelection)
      if (movableLayerIds.length === 0) return

      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        mode: 'move-selection',
        pointerId: event.pointerId,
        origin: point,
        before: cloneDocument(document),
        layerIds: movableLayerIds,
        hasMoved: false,
      }
      setMarquee(null)
      return
    }

    if (!event.shiftKey) {
      selectLayers(['background'])
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode: 'box-select',
      pointerId: event.pointerId,
      origin: point,
      additive: event.shiftKey,
    }
    setMarquee({ x: point.x, y: point.y, width: 0, height: 0 })
  }

  const updateResizeHandleCursor = (
    canvas: HTMLCanvasElement,
    point: { x: number; y: number },
  ) => {
    if (activeTool !== 'select' || selectedLayerIds.length !== 1) {
      canvas.style.cursor = ''
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const selectedLayer = design.layers.find((layer) => layer.id === selectedLayerIds[0])
    if (!selectedLayer) {
      canvas.style.cursor = ''
      return
    }

    if (selectedLayer.type === 'text') {
      const rect = getTextLayerResizeRect(ctx, selectedLayer)
      const handle = getTransformHandleAtPoint(point, rect, undefined, selectedLayer.rotation ?? 0)
      canvas.style.cursor = handle ? getCursorForTransformHandle(handle) : ''
      return
    }

    if (isResizableLayer(selectedLayer)) {
      const shapeRotation =
        selectedLayer.type === 'rectangle' ||
        selectedLayer.type === 'diamond' ||
        selectedLayer.type === 'ellipse'
          ? (selectedLayer.rotation ?? 0)
          : 0
      const handle = getResizeHandleAtPoint(
        point,
        getResizableLayerRect(selectedLayer),
        undefined,
        shapeRotation,
      )
      canvas.style.cursor = handle ? getCursorForTransformHandle(handle) : ''
      return
    }

    canvas.style.cursor = ''
  }

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = masterCanvasRef.current
    if (!canvas) return

    const point = getCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) {
      if (activeTool === 'text') {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const hitLayerId = hitTestLayerAtPoint(design, point, ctx)
          canvas.style.cursor = isTextLayerHit(design, hitLayerId) ? 'text' : 'crosshair'
        }
      } else {
        updateResizeHandleCursor(canvas, point)
      }
      return
    }

    if (drag.mode === 'draw-text') {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const textSizeOption = getTextSizeOption(defaults.textSize)
      const minWidth = getMinTextBoxWidth(
        ctx,
        getFontFamily(defaults.font),
        defaults.fontWeight,
        textSizeOption.maxFontSize,
      )
      const { rect } = resolveTextBoxBounds(drag.origin, point, minWidth)
      setTextPreview(rect)
      return
    }

    if (drag.mode === 'box-select') {
      setMarquee(getRectFromPoints(drag.origin, point))
      return
    }

    if (drag.mode === 'draw-shape') {
      setShapePreview({
        shapeType: drag.shapeType,
        rect: resolveRectangleBounds(drag.origin, point, {
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        }),
      })
      return
    }

    if (drag.mode === 'resize-layer') {
      drag.hasMoved = true
      setIsResizing(true)

      if (drag.startTextLayer && isTextLayerId(drag.layerId)) {
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        setDocument(
          resizeTextLayerInDocument(
            drag.before,
            drag.layerId,
            resizeTextLayerFromHandle(
              ctx,
              drag.startTextLayer,
              drag.startRect,
              drag.handle,
              point,
              { shiftKey: event.shiftKey },
            ),
          ),
        )
        return
      }

      setDocument(
        resizeLayerInDocument(
          drag.before,
          drag.layerId,
          resizeRectFromHandle(drag.handle, drag.startRect, point, { shiftKey: event.shiftKey }),
        ),
      )
      return
    }

    if (drag.mode === 'rotate-layer') {
      drag.hasMoved = true
      setIsResizing(true)
      const currentAngle = getPointerAngleDegrees(drag.center, point)
      const rotation = computeRotatedAngle(
        drag.startRotation,
        drag.startPointerAngle,
        currentAngle,
        event.shiftKey,
      )
      setDocument(rotateTextLayerInDocument(drag.before, drag.layerId, rotation))
      return
    }

    if (!drag.hasMoved && hasExceededDragThreshold(drag.origin, point)) {
      drag.hasMoved = true
      setIsDragging(true)
    }

    if (drag.hasMoved) {
      setDocument(
        moveLayersByDelta(drag.before, drag.layerIds, {
          x: point.x - drag.origin.x,
          y: point.y - drag.origin.y,
        }),
      )
      return
    }
  }

  const finishTransformLayer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.mode !== 'resize-layer' && drag.mode !== 'rotate-layer') return

    if (drag.hasMoved) {
      commitHistory(drag.before)
    }

    dragRef.current = null
    setIsResizing(false)
  }

  const finishMoveSelection = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'move-selection') return

    if (drag.hasMoved) {
      commitHistory(drag.before)
    }

    dragRef.current = null
    setIsDragging(false)
  }

  const abortDrawShape = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'draw-shape') return

    dragRef.current = null
    setShapePreview(null)
  }

  const abortDrawText = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'draw-text') return

    dragRef.current = null
    setTextPreview(null)
  }

  const abortBoxSelect = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'box-select') return

    dragRef.current = null
    setMarquee(null)
  }

  const finishDrawShape = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'draw-shape') return

    const canvas = masterCanvasRef.current
    const point = canvas ? getCanvasPoint(canvas, event.clientX, event.clientY, masterSize) : null
    const rect = point
      ? resolveRectangleBounds(drag.origin, point, {
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        })
      : shapePreview?.rect ?? null

    if (rect && rect.width >= MIN_SHAPE_SIZE && rect.height >= MIN_SHAPE_SIZE) {
      const shape = createShapeLayer(drag.shapeType, rect)
      const after = addIconLayer(drag.before, shape)
      setDocument(after)
      selectLayers([shape.id])
      setEditorState((current) => ({ ...current, activeTool: 'select' }))
      commitHistory(drag.before, after)
    }

    dragRef.current = null
    setShapePreview(null)
  }

  const finishDrawText = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || drag.mode !== 'draw-text') return

    const canvas = masterCanvasRef.current
    const ctx = canvas?.getContext('2d')
    const point = canvas
      ? getCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
      : drag.origin

    if (!ctx) {
      dragRef.current = null
      setTextPreview(null)
      return
    }

    const textSizeOption = getTextSizeOption(defaults.textSize)
    const minWidth = getMinTextBoxWidth(
      ctx,
      getFontFamily(defaults.font),
      defaults.fontWeight,
      textSizeOption.maxFontSize,
    )
    const { rect, autoResize } = resolveTextBoxBounds(drag.origin, point, minWidth)
    const layer = autoResize ? createTextLayerAtClick(drag.origin) : createTextLayerFromBox(rect, { autoResize: false })
    const after = addIconLayer(drag.before, layer)

    setDocument(after)
    startTextEditing(layer.id, {
      autoSelect: true,
      sourceDocument: after,
      historyBefore: drag.before,
    })
    commitHistory(drag.before, after)

    dragRef.current = null
    setTextPreview(null)
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
        const marqueeLayerIds = getLayersInMarquee(design, nextMarquee, ctx)
        selectLayers(
          drag.additive
            ? mergeMarqueeSelection(selectedLayerIds, marqueeLayerIds)
            : marqueeLayerIds,
        )
      } else if (!drag.additive) {
        selectLayers(['background'])
      }
    }

    dragRef.current = null
    setMarquee(null)
  }

  const handleCanvasPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    finishDrawText(event)
    finishDrawShape(event)
    finishTransformLayer(event)
    finishMoveSelection(event)
    finishBoxSelect(event)
  }

  const handleCanvasDoubleClick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (editingTextLayerId || activeTool !== 'select') return

    const canvas = masterCanvasRef.current
    if (!canvas) return

    const point = getAppIconCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
    if (!point) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const hitLayerId = hitTestLayerAtPoint(design, point, ctx)
    if (!isTextLayerHit(design, hitLayerId)) return

    const layer = getDesignTextLayerById(design, hitLayerId)
    if (!layer) return

    const initialCaretOffset = getCaretOffsetAtPoint(ctx, layer, point)
    startTextEditing(hitLayerId, { initialCaretOffset })
  }

  const handleCanvasPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag?.mode === 'move-selection' && drag.hasMoved) {
      setDocument(drag.before)
    }
    if ((drag?.mode === 'resize-layer' || drag?.mode === 'rotate-layer') && drag.hasMoved) {
      setDocument(drag.before)
    }

    abortDrawText(event)
    abortDrawShape(event)
    abortBoxSelect(event)
    finishTransformLayer(event)
    finishMoveSelection(event)
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
        <div className="asset-generator-master" ref={masterContainerRef}>
          <div
            className={`asset-generator-canvas-stage${editingTextLayerId ? ' is-text-editing' : ''}`}
            ref={canvasStageRef}
          >
            <canvas
              ref={masterCanvasRef}
              aria-label="Master design canvas"
              className={`${getCanvasCursorClass(activeTool, selectedLayerIds)}${marquee ? ' is-marquee-active' : ''}${shapePreview ? ' is-shape-preview-active' : ''}${textPreview ? ' is-text-preview-active' : ''}${isDragging ? ' is-dragging' : ''}${isResizing ? ' is-resizing' : ''}${editingTextLayerId ? ' is-text-editing' : ''}`}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerCancel}
              onDoubleClick={handleCanvasDoubleClick}
            />
            {editingTextLayer && textEditFrozenStyleRef.current ? (
              <TextLayerEditor
                canvasRef={masterCanvasRef}
                containerRef={canvasStageRef}
                layer={editingTextLayer}
                frozenStyle={textEditFrozenStyleRef.current}
                autoSelect={textEditAutoSelectRef.current}
                initialCaretOffset={textEditCaretOffsetRef.current}
                onChange={handleTextLayerChange}
                onSubmit={finishTextEditing}
              />
            ) : null}
          </div>
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