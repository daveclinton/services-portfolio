'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { DesignCanvasStack } from './components/DesignCanvasStack'
import { PhonePreview } from './components/PhonePreview'
import { EditorToolsToolbar } from './components/EditorToolsToolbar'
import { PropertiesPanel } from './components/PropertiesPanel'
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
import {
  createDualCanvasRenderScheduler,
  type CanvasOverlayState,
  type DualCanvasTargets,
} from './lib/canvas-render-scheduler'
import { hitTestLayerAtPoint } from './lib/hit-detection'
import { startPointerSession } from './lib/pointer-session'
import { clearTextTapState, registerTextTap } from './lib/text-double-tap'

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
      clickedLayerId: DesignLayer['id']
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
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null)
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
  const liveDocumentRef = useRef(getDefaultAssetDocument())
  const liveOverlayRef = useRef<CanvasOverlayState>({
    marquee: null,
    shapePreview: null,
    textPreview: null,
  })
  const editorStateRef = useRef<EditorState>(createDefaultEditorState())
  const isInteractingRef = useRef(false)
  const endPointerSessionRef = useRef<(() => void) | null>(null)
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
  liveDocumentRef.current = document
  editorStateRef.current = editorState
  const design = document.icon
  const { activeTool, selectedLayerIds, editingTextLayerId } = editorState
  editingTextLayerIdRef.current = editingTextLayerId

  const getCanvasTargets = useCallback(
    (): DualCanvasTargets => ({
      staticCanvas: staticCanvasRef.current,
      interactiveCanvas: interactiveCanvasRef.current,
    }),
    [],
  )

  const renderScheduler = useMemo(
    () =>
      createDualCanvasRenderScheduler(() => ({
        document: liveDocumentRef.current,
        selectedLayerIds: editorStateRef.current.selectedLayerIds,
        editingTextLayerId: editorStateRef.current.editingTextLayerId,
        overlay: liveOverlayRef.current,
      })),
    [],
  )

  const scheduleSceneRender = useCallback(() => {
    renderScheduler.scheduleAll(getCanvasTargets())
  }, [getCanvasTargets, renderScheduler])

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
    setEditorState((current) => {
      const nextState: EditorState = {
        ...current,
        selectedLayerIds:
          nextSelectedLayerIds.length > 0 ? nextSelectedLayerIds : (['background'] as const),
      }
      editorStateRef.current = nextState
      return nextState
    })
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
      const canvas = interactiveCanvasRef.current
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
      setEditorState((current) => {
        const nextState: EditorState = {
          ...current,
          activeTool: 'select',
          selectedLayerIds: [layerId],
          editingTextLayerId: layerId,
        }
        editorStateRef.current = nextState
        return nextState
      })
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

  const applyLiveDocument = useCallback(
    (nextDocument: AssetDocument) => {
      liveDocumentRef.current = nextDocument
      const targets = getCanvasTargets()
      renderScheduler.scheduleStatic(targets)
      renderScheduler.scheduleInteractive(targets)
    },
    [getCanvasTargets, renderScheduler],
  )

  const applyLiveOverlay = useCallback(
    (overlay: CanvasOverlayState) => {
      liveOverlayRef.current = overlay
      renderScheduler.scheduleInteractive(getCanvasTargets())
    },
    [getCanvasTargets, renderScheduler],
  )

  const onWindowPointerMoveRef = useRef<(event: PointerEvent) => void>(() => {})
  const onWindowPointerUpRef = useRef<(event: PointerEvent) => void>(() => {})

  const ensurePointerSession = useCallback(
    (canvas: HTMLCanvasElement, pointerId: number) => {
      endPointerSessionRef.current?.()
      isInteractingRef.current = true
      const session = startPointerSession({
        canvas,
        pointerId,
        onMove: (event) => onWindowPointerMoveRef.current(event),
        onUp: (event) => onWindowPointerUpRef.current(event),
      })
      endPointerSessionRef.current = session.cleanup
      scheduleSceneRender()
    },
    [scheduleSceneRender],
  )

  useEffect(() => {
    if (isMobile) {
      setIsPreviewOpen(false)
    }
  }, [isMobile])

  const lastPaintedDocumentRef = useRef(document)
  const lastPaintedEditingLayerRef = useRef(editingTextLayerId)

  useEffect(() => {
    if (isInteractingRef.current) return

    liveDocumentRef.current = document
    liveOverlayRef.current = { marquee, shapePreview, textPreview }

    const targets = getCanvasTargets()
    const needsStaticPaint =
      lastPaintedDocumentRef.current !== document ||
      lastPaintedEditingLayerRef.current !== editingTextLayerId

    lastPaintedDocumentRef.current = document
    lastPaintedEditingLayerRef.current = editingTextLayerId

    if (needsStaticPaint) {
      renderScheduler.renderAllNow(targets)
      return
    }

    renderScheduler.renderInteractiveNow(targets.interactiveCanvas)
  }, [
    document,
    editingTextLayerId,
    getCanvasTargets,
    marquee,
    renderScheduler,
    selectedLayerIds,
    shapePreview,
    textPreview,
  ])

  useEffect(() => () => {
    endPointerSessionRef.current?.()
    renderScheduler.cancel()
  }, [renderScheduler])

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

  const syncInteractionToReact = useCallback(
    (nextDocument?: AssetDocument) => {
      isInteractingRef.current = false
      if (nextDocument) setDocument(nextDocument)
      setMarquee(null)
      setShapePreview(null)
      setTextPreview(null)
      liveOverlayRef.current = { marquee: null, shapePreview: null, textPreview: null }
    },
    [setDocument],
  )

  const onWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      const canvas = interactiveCanvasRef.current
      if (!canvas) return

      const point = getCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

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
        applyLiveOverlay({ ...liveOverlayRef.current, textPreview: rect, shapePreview: null, marquee: null })
        return
      }

      if (drag.mode === 'box-select') {
        applyLiveOverlay({
          ...liveOverlayRef.current,
          marquee: getRectFromPoints(drag.origin, point),
          shapePreview: null,
          textPreview: null,
        })
        return
      }

      if (drag.mode === 'draw-shape') {
        applyLiveOverlay({
          ...liveOverlayRef.current,
          shapePreview: {
            shapeType: drag.shapeType,
            rect: resolveRectangleBounds(drag.origin, point, {
              shiftKey: event.shiftKey,
              altKey: event.altKey,
            }),
          },
          textPreview: null,
          marquee: null,
        })
        return
      }

      if (drag.mode === 'resize-layer') {
        drag.hasMoved = true
        setIsResizing(true)

        if (drag.startTextLayer && isTextLayerId(drag.layerId)) {
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          applyLiveDocument(
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

        applyLiveDocument(
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
        applyLiveDocument(rotateTextLayerInDocument(drag.before, drag.layerId, rotation))
        return
      }

      if (drag.mode === 'move-selection' && !drag.hasMoved && hasExceededDragThreshold(drag.origin, point)) {
        drag.hasMoved = true
        setIsDragging(true)
      }

      if (drag.mode === 'move-selection' && drag.hasMoved) {
        applyLiveDocument(
          moveLayersByDelta(drag.before, drag.layerIds, {
            x: point.x - drag.origin.x,
            y: point.y - drag.origin.y,
          }),
        )
      }

    },
    [applyLiveDocument, applyLiveOverlay],
  )

  const onWindowPointerUp = useCallback(
    (event: PointerEvent) => {
      const canvas = interactiveCanvasRef.current
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      const point = canvas
        ? getCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
        : null
      const currentDocument = liveDocumentRef.current
      const currentDesign = currentDocument.icon
      const { selectedLayerIds: currentSelection } = editorStateRef.current
      const overlay = liveOverlayRef.current

      if (drag.mode === 'draw-text') {
        const ctx = canvas?.getContext('2d')
        const drawPoint = point ?? drag.origin
        if (ctx) {
          const textSizeOption = getTextSizeOption(defaults.textSize)
          const minWidth = getMinTextBoxWidth(
            ctx,
            getFontFamily(defaults.font),
            defaults.fontWeight,
            textSizeOption.maxFontSize,
          )
          const { rect, autoResize } = resolveTextBoxBounds(drag.origin, drawPoint, minWidth)
          const layer = autoResize
            ? createTextLayerAtClick(drag.origin)
            : createTextLayerFromBox(rect, { autoResize: false })
          const after = addIconLayer(drag.before, layer)
          liveDocumentRef.current = after
          syncInteractionToReact(after)
          startTextEditing(layer.id, {
            autoSelect: true,
            sourceDocument: after,
            historyBefore: drag.before,
          })
          commitHistory(drag.before, after)
        } else {
          syncInteractionToReact()
        }
        dragRef.current = null
        endPointerSessionRef.current = null
        return
      }

      if (drag.mode === 'draw-shape') {
        const rect = point
          ? resolveRectangleBounds(drag.origin, point, {
              shiftKey: event.shiftKey,
              altKey: event.altKey,
            })
          : overlay.shapePreview?.rect ?? null

        if (rect && rect.width >= MIN_SHAPE_SIZE && rect.height >= MIN_SHAPE_SIZE) {
          const shape = createShapeLayer(drag.shapeType, rect)
          const after = addIconLayer(drag.before, shape)
          setDocument(after)
          selectLayers([shape.id])
          setEditorState((current) => ({ ...current, activeTool: 'select' }))
          commitHistory(drag.before, after)
        }
        syncInteractionToReact()
        dragRef.current = null
        endPointerSessionRef.current = null
        return
      }

      if (drag.mode === 'resize-layer' || drag.mode === 'rotate-layer') {
        if (drag.hasMoved) commitHistory(drag.before, liveDocumentRef.current)
        syncInteractionToReact(drag.hasMoved ? liveDocumentRef.current : undefined)
        dragRef.current = null
        setIsResizing(false)
        endPointerSessionRef.current = null
        return
      }

      if (drag.mode === 'move-selection') {
        if (drag.hasMoved) {
          commitHistory(drag.before, liveDocumentRef.current)
          clearTextTapState()
        }
        syncInteractionToReact(drag.hasMoved ? liveDocumentRef.current : undefined)
        dragRef.current = null
        setIsDragging(false)
        endPointerSessionRef.current = null
        return
      }

      if (drag.mode === 'box-select') {
        const ctx = canvas?.getContext('2d')
        const nextMarquee = point ? getRectFromPoints(drag.origin, point) : overlay.marquee

        if (ctx && nextMarquee) {
          if (isMarqueeGesture(nextMarquee)) {
            const marqueeLayerIds = getLayersInMarquee(currentDesign, nextMarquee, ctx)
            selectLayers(
              drag.additive
                ? mergeMarqueeSelection(currentSelection, marqueeLayerIds)
                : marqueeLayerIds,
            )
          } else if (!drag.additive) {
            selectLayers(['background'])
          }
        }
        clearTextTapState()
        syncInteractionToReact()
        dragRef.current = null
        endPointerSessionRef.current = null
      }
    },
    [
      commitHistory,
      selectLayers,
      startTextEditing,
      syncInteractionToReact,
    ],
  )

  onWindowPointerMoveRef.current = onWindowPointerMove
  onWindowPointerUpRef.current = onWindowPointerUp

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = interactiveCanvasRef.current
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

      dragRef.current = {
        mode: 'draw-text',
        pointerId: event.pointerId,
        origin: point,
        before: cloneDocument(document),
      }
      applyLiveOverlay({
        textPreview: { x: point.x, y: point.y, width: 0, height: 1 },
        shapePreview: null,
        marquee: null,
      })
      ensurePointerSession(canvas, event.pointerId)
      return
    }

    if (isShapeTool(activeTool)) {
      dragRef.current = {
        mode: 'draw-shape',
        shapeType: activeTool,
        pointerId: event.pointerId,
        origin: point,
        before: cloneDocument(document),
      }
      applyLiveOverlay({
        shapePreview: { shapeType: activeTool, rect: { x: point.x, y: point.y, width: 0, height: 0 } },
        textPreview: null,
        marquee: null,
      })
      ensurePointerSession(canvas, event.pointerId)
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
          applyLiveOverlay({ marquee: null, shapePreview: null, textPreview: null })
          ensurePointerSession(canvas, event.pointerId)
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
          dragRef.current = {
            mode: 'resize-layer',
            pointerId: event.pointerId,
            layerId: selectedLayer.id,
            handle,
            startRect: getResizableLayerRect(selectedLayer),
            before: cloneDocument(document),
            hasMoved: false,
          }
          applyLiveOverlay({ marquee: null, shapePreview: null, textPreview: null })
          ensurePointerSession(canvas, event.pointerId)
          return
        }
      }
    }

    const hitLayerId = hitTestLayerAtPoint(design, point, ctx)

    if (hitLayerId !== 'background') {
      if (
        isTextLayerHit(design, hitLayerId) &&
        !event.shiftKey &&
        registerTextTap(event.clientX, event.clientY)
      ) {
        const layer = getDesignTextLayerById(design, hitLayerId)
        if (layer) {
          const initialCaretOffset = getCaretOffsetAtPoint(ctx, layer, point)
          startTextEditing(hitLayerId, { initialCaretOffset })
          return
        }
      }

      const { selectedLayerIds: nextSelection, shouldDrag } = resolveClickSelection(
        selectedLayerIds,
        hitLayerId,
        event.shiftKey,
      )
      selectLayers(nextSelection)

      if (!shouldDrag) return

      const movableLayerIds = getMovableLayerIds(nextSelection)
      if (movableLayerIds.length === 0) return

      dragRef.current = {
        mode: 'move-selection',
        pointerId: event.pointerId,
        origin: point,
        before: cloneDocument(document),
        layerIds: movableLayerIds,
        clickedLayerId: hitLayerId,
        hasMoved: false,
      }
      applyLiveOverlay({ marquee: null, shapePreview: null, textPreview: null })
      ensurePointerSession(canvas, event.pointerId)
      return
    }

    clearTextTapState()

    if (!event.shiftKey) {
      selectLayers(['background'])
    }

    dragRef.current = {
      mode: 'box-select',
      pointerId: event.pointerId,
      origin: point,
      additive: event.shiftKey,
    }
    applyLiveOverlay({
      marquee: { x: point.x, y: point.y, width: 0, height: 0 },
      shapePreview: null,
      textPreview: null,
    })
    ensurePointerSession(canvas, event.pointerId)
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
    if (isInteractingRef.current) return

    const canvas = interactiveCanvasRef.current
    if (!canvas) return

    const point = getCanvasPoint(canvas, event.clientX, event.clientY, masterSize)
    const hoverDesign = liveDocumentRef.current.icon

    if (activeTool === 'text') {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const hitLayerId = hitTestLayerAtPoint(hoverDesign, point, ctx)
        canvas.style.cursor = isTextLayerHit(hoverDesign, hitLayerId) ? 'text' : 'crosshair'
      }
      return
    }

    updateResizeHandleCursor(canvas, point)
  }

  const handleCanvasPointerUp = () => {
    // Window pointer session handles commit; keep for React event parity.
  }

  const handleCanvasDoubleClick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (editingTextLayerId || activeTool !== 'select') return

    const canvas = interactiveCanvasRef.current
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
    clearTextTapState()
    startTextEditing(hitLayerId, { initialCaretOffset })
  }

  const handleCanvasPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const hadMutation =
      (drag.mode === 'move-selection' ||
        drag.mode === 'resize-layer' ||
        drag.mode === 'rotate-layer') &&
      drag.hasMoved

    if (hadMutation) {
      liveDocumentRef.current = drag.before
    }

    endPointerSessionRef.current?.()
    endPointerSessionRef.current = null
    dragRef.current = null
    syncInteractionToReact(hadMutation ? drag.before : undefined)
    setIsDragging(false)
    setIsResizing(false)
    clearTextTapState()
  }

  return (
    <main
      className={`asset-generator-page${isMobile ? ' asset-generator-page--mobile' : ''}`}
      id="main-content"
    >
      <div className="App-menu">
        <div className="App-menu_top">
          <div className="App-menu_top__left zen-mode-transition">
            <PropertiesPanel
              document={document}
              selectedLayerIds={selectedLayerIds}
              isMobile={isMobile}
              cloneDocument={cloneDocument}
              setDocument={setDocument}
              commitHistory={commitHistory}
              onEditText={(layerId) => startTextEditing(layerId)}
            />
          </div>

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
            <DesignCanvasStack
              staticCanvasRef={staticCanvasRef}
              interactiveCanvasRef={interactiveCanvasRef}
              interactiveClassName={`${getCanvasCursorClass(activeTool, selectedLayerIds)}${marquee ? ' is-marquee-active' : ''}${shapePreview ? ' is-shape-preview-active' : ''}${textPreview ? ' is-text-preview-active' : ''}${isDragging ? ' is-dragging' : ''}${isResizing ? ' is-resizing' : ''}${editingTextLayerId ? ' is-text-editing' : ''}`}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerCancel}
              onDoubleClick={handleCanvasDoubleClick}
            />
            {editingTextLayer && textEditFrozenStyleRef.current ? (
              <TextLayerEditor
                canvasRef={interactiveCanvasRef}
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