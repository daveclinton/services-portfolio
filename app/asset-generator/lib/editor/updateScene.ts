import {
  SELECTION_DRAG_THRESHOLD,
  TEXT_CLICK_THRESHOLD,
  TEXT_DRAG_THRESHOLD,
} from '../common/constants'
import { DEFAULT_FONT_SIZE } from '../common/defaults'
import { randomId, randomSeed } from '../common/random'
import { newElementForTool, newTextElement, normalizeRect } from '../element/newElement'
import {
  measureTextDimensions,
  getTextLineHeightInPx,
  getTextTopForSceneY,
} from '../element/text'
import { newElementWith } from '../element/mutateElement'
import {
  getElementAtPosition,
  getPrimarySelectedElement,
  getSelectedElementIds,
  getSelectedElements,
  getSelectedElementsWithinBox,
  isElementLargeEnough,
  isElementSelected,
  isMultiSelection,
  selectOnly,
  toggleSelection,
} from '../element/selection'
import { dragElement, dragSelectedElements, resizeElement } from '../element/transform'
import { getTransformHandleAtPosition } from '../element/transformHandles'
import type { AssetElement } from '../element/types'
import { getDefaultAppState } from './appState'
import type { AppState, EditorSnapshot, PointerPayload, SceneUpdate } from './types'

export function createInitialSnapshot(): EditorSnapshot {
  return {
    appState: getDefaultAppState(),
    elements: [],
    files: {},
  }
}

function replaceElement(
  elements: readonly AssetElement[],
  nextElement: AssetElement,
) {
  return elements.map((element) => (element.id === nextElement.id ? nextElement : element))
}

function resetInteraction(appState: AppState): AppState {
  return {
    ...appState,
    interaction: 'idle',
    resizeHandle: null,
    originalElement: null,
    originalElements: null,
    pointerOrigin: null,
    newElement: null,
    selectionBox: null,
    selectionOriginIds: null,
  }
}

function buildOriginalElementsMap(elements: readonly AssetElement[], ids: Record<string, true>) {
  return Object.fromEntries(
    getSelectedElements(elements, ids).map((element) => [element.id, { ...element }]),
  )
}

function switchToSelectionTool(appState: AppState): AppState {
  return {
    ...appState,
    activeTool: { type: 'selection', locked: false },
  }
}

function pointerTravelSq(
  origin: { x: number; y: number } | null,
  x: number,
  y: number,
) {
  if (!origin) {
    return 0
  }

  const dx = x - origin.x
  const dy = y - origin.y
  return dx * dx + dy * dy
}

function getConstrainedShapeRect(
  originX: number,
  originY: number,
  currentX: number,
  currentY: number,
  maintainAspectRatio = false,
  resizeFromCenter = false,
) {
  const dx = currentX - originX
  const dy = currentY - originY
  const directionX = dx < 0 ? -1 : 1
  const directionY = dy < 0 ? -1 : 1
  let width = Math.abs(dx)
  let height = Math.abs(dy)

  if (maintainAspectRatio) {
    const size = Math.max(width, height)
    width = size
    height = size
  }

  if (resizeFromCenter) {
    return {
      x: originX - width,
      y: originY - height,
      width: width * 2,
      height: height * 2,
    }
  }

  return normalizeRect(
    originX,
    originY,
    originX + width * directionX,
    originY + height * directionY,
  )
}

function handleTextPointerDown(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
): Pick<EditorSnapshot, 'appState' | 'elements'> {
  if (appState.editingElementId) {
    return { appState, elements }
  }

  const hit = getElementAtPosition(elements, x, y)
  if (hit?.type === 'text') {
    return {
      appState: {
        ...switchToSelectionTool(appState),
        editingElementId: hit.id,
        selectedElementIds: { [hit.id]: true as const },
        interaction: 'idle',
        resizeHandle: null,
        originalElement: null,
        originalElements: null,
        pointerOrigin: null,
        newElement: null,
        selectionBox: null,
        selectionOriginIds: null,
      },
      elements,
    }
  }

  const fontSize = appState.currentItemFontSize
  const draft = newTextElement({
    x,
    y: getTextTopForSceneY(y, fontSize),
    width: 0,
    height: getTextLineHeightInPx(fontSize),
    text: '',
    fontSize,
    strokeColor: appState.currentItemStrokeColor,
  })

  return {
    appState: {
      ...switchToSelectionTool(appState),
      editingElementId: null,
      selectedElementIds: {},
      newElement: draft,
      pointerOrigin: { x, y },
      interaction: 'drawing',
      resizeHandle: null,
      originalElement: null,
      originalElements: null,
      selectionBox: null,
      selectionOriginIds: null,
    },
    elements,
  }
}

function handleTextPointerMove(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
): Pick<EditorSnapshot, 'appState' | 'elements'> {
  if (!appState.newElement || appState.newElement.type !== 'text' || !appState.pointerOrigin) {
    return { appState, elements }
  }

  const fontSize = appState.newElement.fontSize ?? DEFAULT_FONT_SIZE
  const dragWidth = Math.max(x - appState.pointerOrigin.x, 0)
  const defaultDimensions = measureTextDimensions('', fontSize)
  const fixedWidth =
    dragWidth > TEXT_DRAG_THRESHOLD
      ? Math.max(dragWidth, defaultDimensions.width)
      : defaultDimensions.width

  return {
    appState: {
      ...appState,
      newElement: newElementWith(appState.newElement, {
        width: fixedWidth,
        height: defaultDimensions.height,
        y: getTextTopForSceneY(appState.pointerOrigin.y, fontSize),
      }),
    },
    elements,
  }
}

function commitTextDraft(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
): Pick<EditorSnapshot, 'appState' | 'elements'> {
  if (!appState.newElement || appState.newElement.type !== 'text' || !appState.pointerOrigin) {
    return {
      appState: resetInteraction(appState),
      elements,
    }
  }

  const fontSize = appState.newElement.fontSize ?? DEFAULT_FONT_SIZE
  const dragWidth = Math.max(x - appState.pointerOrigin.x, 0)
  const defaultDimensions = measureTextDimensions('', fontSize)
  const width =
    dragWidth > TEXT_DRAG_THRESHOLD
      ? Math.max(dragWidth, defaultDimensions.width)
      : defaultDimensions.width

  const committed = newElementWith(appState.newElement, {
    width,
    height: defaultDimensions.height,
    y: getTextTopForSceneY(appState.pointerOrigin.y, fontSize),
  })

  return {
    appState: {
      ...resetInteraction(appState),
      editingElementId: committed.id,
      selectedElementIds: { [committed.id]: true as const },
    },
    elements: [...elements, committed],
  }
}

function maybeEnterTextEditOnPointerUp(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
): Pick<EditorSnapshot, 'appState' | 'elements'> | null {
  if (
    appState.activeTool.type !== 'selection' ||
    appState.interaction !== 'dragging' ||
    appState.originalElement?.type !== 'text' ||
    !appState.pointerOrigin
  ) {
    return null
  }

  if (pointerTravelSq(appState.pointerOrigin, x, y) > TEXT_CLICK_THRESHOLD * TEXT_CLICK_THRESHOLD) {
    return null
  }

  const selectedCount = Object.keys(appState.selectedElementIds).length
  if (
    selectedCount !== 1 ||
    !appState.selectedElementIds[appState.originalElement.id]
  ) {
    return null
  }

  return {
    appState: {
      ...resetInteraction(appState),
      editingElementId: appState.originalElement.id,
      selectedElementIds: { [appState.originalElement.id]: true as const },
    },
    elements,
  }
}

function commitDraftElement(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
  shiftKey = false,
  altKey = false,
) {
  if (!appState.newElement || !appState.pointerOrigin) {
    return {
      appState: resetInteraction(appState),
      elements,
    }
  }

  const committed = newElementWith(appState.newElement, {
    ...getConstrainedShapeRect(
      appState.pointerOrigin.x,
      appState.pointerOrigin.y,
      x,
      y,
      shiftKey,
      altKey,
    ),
  })

  if (!isElementLargeEnough(committed)) {
    return {
      appState: {
        ...resetInteraction(appState),
        selectedElementIds: {} as Record<string, true>,
      },
      elements,
    }
  }

  return {
    appState: {
      ...switchToSelectionTool(resetInteraction(appState)),
      selectedElementIds: { [committed.id]: true as const },
    },
    elements: [...elements, committed],
  }
}

function handleSelectionPointerDown(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
  shiftKey = false,
): Pick<EditorSnapshot, 'appState' | 'elements'> {
  const selectedIds = appState.selectedElementIds
  const primarySelected = getPrimarySelectedElement(elements, selectedIds)

  if (primarySelected && getSelectedElementIds(selectedIds).length === 1) {
    const handle = getTransformHandleAtPosition(primarySelected, x, y)
    if (handle) {
      return {
        appState: {
          ...appState,
          editingElementId: null,
          interaction: 'resizing',
          resizeHandle: handle,
          originalElement: primarySelected,
          originalElements: null,
          pointerOrigin: { x, y },
          newElement: null,
          selectionBox: null,
          selectionOriginIds: null,
        },
        elements,
      }
    }
  }

  const hit = getElementAtPosition(elements, x, y)

  if (hit) {
    if (shiftKey) {
      return {
        appState: {
          ...appState,
          editingElementId: null,
          selectedElementIds: toggleSelection(selectedIds, hit.id),
          interaction: 'idle',
          originalElement: null,
          originalElements: null,
          pointerOrigin: null,
          newElement: null,
          resizeHandle: null,
          selectionBox: null,
          selectionOriginIds: null,
        },
        elements,
      }
    }

    if (isElementSelected(selectedIds, hit.id) && isMultiSelection(selectedIds)) {
      return {
        appState: {
          ...appState,
          editingElementId: null,
          interaction: 'dragging',
          originalElement: null,
          originalElements: buildOriginalElementsMap(elements, selectedIds),
          pointerOrigin: { x, y },
          newElement: null,
          resizeHandle: null,
          selectionBox: null,
          selectionOriginIds: null,
        },
        elements,
      }
    }

    return {
      appState: {
        ...appState,
        editingElementId: null,
        selectedElementIds: selectOnly(hit.id),
        interaction: 'dragging',
        originalElement: hit,
        originalElements: null,
        pointerOrigin: { x, y },
        newElement: null,
        resizeHandle: null,
        selectionBox: null,
        selectionOriginIds: null,
      },
      elements,
    }
  }

  if (!shiftKey) {
    return {
      appState: {
        ...appState,
        editingElementId: null,
        selectedElementIds: {} as Record<string, true>,
        interaction: 'marquee',
        originalElement: null,
        originalElements: null,
        pointerOrigin: { x, y },
        newElement: null,
        resizeHandle: null,
        selectionBox: null,
        selectionOriginIds: {},
      },
      elements,
    }
  }

  return {
    appState: {
      ...appState,
      editingElementId: null,
      interaction: 'marquee',
      originalElement: null,
      originalElements: null,
      pointerOrigin: { x, y },
      newElement: null,
      resizeHandle: null,
      selectionBox: null,
      selectionOriginIds: selectedIds,
    },
    elements,
  }
}

function handleSelectionPointerMove(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
  shiftKey = false,
): Pick<EditorSnapshot, 'appState' | 'elements'> {
  if (appState.interaction === 'marquee' && appState.pointerOrigin) {
    if (
      pointerTravelSq(appState.pointerOrigin, x, y) <=
      SELECTION_DRAG_THRESHOLD * SELECTION_DRAG_THRESHOLD
    ) {
      return { appState, elements }
    }

    const selectionBox = normalizeRect(appState.pointerOrigin.x, appState.pointerOrigin.y, x, y)
    const selectedWithinBox = Object.fromEntries(
      getSelectedElementsWithinBox(elements, selectionBox).map((element) => [
        element.id,
        true as const,
      ]),
    )

    return {
      appState: {
        ...appState,
        selectedElementIds: {
          ...(appState.selectionOriginIds ?? {}),
          ...selectedWithinBox,
        },
        selectionBox,
      },
      elements,
    }
  }

  if (
    appState.interaction === 'dragging' &&
    pointerTravelSq(appState.pointerOrigin, x, y) <=
      SELECTION_DRAG_THRESHOLD * SELECTION_DRAG_THRESHOLD
  ) {
    return { appState, elements }
  }

  if (
    appState.interaction === 'dragging' &&
    appState.originalElements &&
    appState.pointerOrigin
  ) {
    return {
      appState,
      elements: dragSelectedElements(
        elements,
        appState.originalElements,
        appState.pointerOrigin,
        x,
        y,
      ),
    }
  }

  if (
    appState.interaction === 'dragging' &&
    appState.originalElement &&
    appState.pointerOrigin
  ) {
    const current = elements.find((element) => element.id === appState.originalElement?.id)
    if (!current) {
      return { appState, elements }
    }

    const nextElement = dragElement(
      current,
      appState.originalElement,
      appState.pointerOrigin,
      x,
      y,
    )

    return {
      appState,
      elements: replaceElement(elements, nextElement),
    }
  }

  if (
    appState.interaction === 'resizing' &&
    appState.originalElement &&
    appState.resizeHandle
  ) {
    const current = elements.find((element) => element.id === appState.originalElement?.id)
    if (!current) {
      return { appState, elements }
    }

    const nextElement = resizeElement(
      current,
      appState.resizeHandle,
      x,
      y,
      appState.originalElement,
      shiftKey,
    )

    return {
      appState,
      elements: replaceElement(elements, nextElement),
    }
  }

  return { appState, elements }
}

export function deleteSelectedElements(snapshot: EditorSnapshot): EditorSnapshot {
  const selectedIds = new Set(Object.keys(snapshot.appState.selectedElementIds))

  if (selectedIds.size === 0) {
    return snapshot
  }

  const elements = snapshot.elements.filter((element) => !selectedIds.has(element.id))
  const usedFileIds = new Set(
    elements.map((element) => element.fileId).filter((fileId): fileId is string => Boolean(fileId)),
  )
  const files = Object.fromEntries(
    Object.entries(snapshot.files).filter(([fileId]) => usedFileIds.has(fileId)),
  )

  return {
    appState: {
      ...snapshot.appState,
      selectedElementIds: {},
      editingElementId: null,
      interaction: 'idle',
      resizeHandle: null,
      originalElement: null,
      originalElements: null,
      pointerOrigin: null,
      selectionBox: null,
      selectionOriginIds: null,
    },
    elements,
    files,
  }
}

export function duplicateSelectedElements(snapshot: EditorSnapshot): EditorSnapshot {
  const selectedIds = new Set(Object.keys(snapshot.appState.selectedElementIds))

  if (selectedIds.size === 0) {
    return snapshot
  }

  const duplicatedElements = snapshot.elements
    .filter((element) => selectedIds.has(element.id))
    .map((element) => ({
      ...element,
      id: randomId(),
      x: element.x + 24,
      y: element.y + 24,
      version: 1,
      seed: randomSeed(),
    }))

  return {
    ...snapshot,
    elements: [...snapshot.elements, ...duplicatedElements],
    appState: {
      ...resetInteraction(snapshot.appState),
      selectedElementIds: Object.fromEntries(
        duplicatedElements.map((element) => [element.id, true as const]),
      ),
      editingElementId: null,
    },
  }
}

export function selectElementForContextMenu(
  snapshot: EditorSnapshot,
  x: number,
  y: number,
): EditorSnapshot {
  const hit = getElementAtPosition(snapshot.elements, x, y)

  if (!hit || snapshot.appState.selectedElementIds[hit.id]) {
    return {
      ...snapshot,
      appState: {
        ...resetInteraction(snapshot.appState),
        selectedElementIds: snapshot.appState.selectedElementIds,
        editingElementId: null,
      },
    }
  }

  return {
    ...snapshot,
    appState: {
      ...resetInteraction(snapshot.appState),
      activeTool: { type: 'selection', locked: false },
      selectedElementIds: { [hit.id]: true as const },
      editingElementId: null,
    },
  }
}

export function selectAllElements(snapshot: EditorSnapshot): EditorSnapshot {
  if (snapshot.elements.length === 0) {
    return snapshot
  }

  return {
    ...snapshot,
    appState: {
      ...resetInteraction(snapshot.appState),
      selectedElementIds: Object.fromEntries(
        snapshot.elements.map((element) => [element.id, true as const]),
      ),
      editingElementId: null,
    },
  }
}

export function updateElementInScene(
  snapshot: EditorSnapshot,
  elementId: string,
  updates: Partial<AssetElement>,
): EditorSnapshot {
  return {
    ...snapshot,
    elements: snapshot.elements.map((element) => {
      if (element.id !== elementId) {
        return element
      }

      if (element.type !== 'text') {
        const supportedUpdates = { ...updates }
        delete supportedUpdates.text
        delete supportedUpdates.fontSize
        return Object.keys(supportedUpdates).length > 0
          ? newElementWith(element, supportedUpdates)
          : element
      }

      const nextText = typeof updates.text === 'string' ? updates.text : element.text ?? ''
      const nextFontSize =
        typeof updates.fontSize === 'number'
          ? updates.fontSize
          : element.fontSize ?? DEFAULT_FONT_SIZE
      const textUpdates = {
        ...updates,
        ...measureTextDimensions(nextText, nextFontSize),
      }
      const changed = Object.entries(textUpdates).some(
        ([key, value]) => element[key as keyof AssetElement] !== value,
      )

      return changed ? newElementWith(element, textUpdates) : element
    }),
  }
}

export function updateScene(
  snapshot: EditorSnapshot,
  update: SceneUpdate,
  pointer?: PointerPayload,
): EditorSnapshot {
  let appState: AppState = {
    ...snapshot.appState,
    ...update.appState,
  }
  let elements = update.elements ?? snapshot.elements
  let files = update.files ?? snapshot.files

  if (!pointer) {
    return { appState, elements, files }
  }

  if (pointer.phase === 'down') {
    if (appState.editingElementId) {
      return { appState, elements, files }
    }

    if (appState.activeTool.type === 'text') {
      return {
        ...handleTextPointerDown(appState, elements, pointer.x, pointer.y),
        files,
      }
    }

    if (appState.activeTool.type === 'selection') {
      return {
        ...handleSelectionPointerDown(appState, elements, pointer.x, pointer.y, pointer.shiftKey),
        files,
      }
    }

    const draft = newElementForTool(appState.activeTool.type, {
      x: pointer.x,
      y: pointer.y,
      strokeColor: appState.currentItemStrokeColor,
      backgroundColor: appState.currentItemBackgroundColor,
      strokeWidth: appState.currentItemStrokeWidth,
    })

    return {
      appState: {
        ...appState,
        editingElementId: null,
        selectedElementIds: {} as Record<string, true>,
        newElement: draft,
        pointerOrigin: { x: pointer.x, y: pointer.y },
        interaction: 'drawing',
        resizeHandle: null,
        originalElement: null,
        originalElements: null,
        selectionBox: null,
        selectionOriginIds: null,
      },
      elements,
      files,
    }
  }

  if (pointer.phase === 'move') {
    if (appState.newElement?.type === 'text') {
      return {
        ...handleTextPointerMove(appState, elements, pointer.x, pointer.y),
        files,
      }
    }

    if (appState.activeTool.type === 'selection') {
      return {
        ...handleSelectionPointerMove(
          appState,
          elements,
          pointer.x,
          pointer.y,
          pointer.shiftKey,
        ),
        files,
      }
    }

    if (!appState.pointerOrigin || !appState.newElement) {
      return { appState, elements, files }
    }

    const rect = getConstrainedShapeRect(
      appState.pointerOrigin.x,
      appState.pointerOrigin.y,
      pointer.x,
      pointer.y,
      pointer.shiftKey,
      pointer.altKey,
    )

    const nextDraft = newElementWith(appState.newElement, rect)

    return {
      appState: {
        ...appState,
        newElement: nextDraft,
      },
      elements,
      files,
    }
  }

  if (appState.newElement?.type === 'text') {
    return {
      ...commitTextDraft(appState, elements, pointer.x, pointer.y),
      files,
    }
  }

  const textEdit = maybeEnterTextEditOnPointerUp(appState, elements, pointer.x, pointer.y)
  if (textEdit) {
    return {
      ...textEdit,
      files,
    }
  }

  if (appState.activeTool.type === 'selection') {
    return {
      appState: {
        ...resetInteraction(appState),
        selectedElementIds: appState.selectedElementIds,
      },
      elements,
      files,
    }
  }

  return {
    ...commitDraftElement(
      appState,
      elements,
      pointer.x,
      pointer.y,
      pointer.shiftKey,
      pointer.altKey,
    ),
    files,
  }
}
