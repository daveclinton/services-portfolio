import { newElementForTool, normalizeRect } from '../element/newElement'
import { newElementWith } from '../element/mutateElement'
import {
  getElementAtPosition,
  getPrimarySelectedElement,
  getSelectedElementIds,
  getSelectedElements,
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
  }
}

function buildOriginalElementsMap(elements: readonly AssetElement[], ids: Record<string, true>) {
  return Object.fromEntries(
    getSelectedElements(elements, ids).map((element) => [element.id, { ...element }]),
  )
}

function commitDraftElement(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
) {
  if (!appState.newElement || !appState.pointerOrigin) {
    return {
      appState: resetInteraction(appState),
      elements,
    }
  }

  const committed = newElementWith(appState.newElement, {
    ...normalizeRect(
      appState.pointerOrigin.x,
      appState.pointerOrigin.y,
      x,
      y,
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
      ...resetInteraction(appState),
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
      },
      elements,
    }
  }

  if (!shiftKey) {
    return {
      appState: {
        ...appState,
        editingElementId: null,
        selectedElementIds: {},
        interaction: 'idle',
        originalElement: null,
        originalElements: null,
        pointerOrigin: null,
        newElement: null,
        resizeHandle: null,
      },
      elements,
    }
  }

  return {
    appState: {
      ...appState,
      editingElementId: null,
      interaction: 'idle',
      originalElement: null,
      originalElements: null,
      pointerOrigin: null,
      newElement: null,
      resizeHandle: null,
    },
    elements,
  }
}

function handleSelectionPointerMove(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
): Pick<EditorSnapshot, 'appState' | 'elements'> {
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
    },
    elements,
    files,
  }
}

export function updateElementInScene(
  snapshot: EditorSnapshot,
  elementId: string,
  updates: Partial<AssetElement>,
): EditorSnapshot {
  return {
    ...snapshot,
    elements: snapshot.elements.map((element) =>
      element.id === elementId ? newElementWith(element, updates) : element,
    ),
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
      },
      elements,
      files,
    }
  }

  if (pointer.phase === 'move') {
    if (appState.activeTool.type === 'selection') {
      return {
        ...handleSelectionPointerMove(appState, elements, pointer.x, pointer.y),
        files,
      }
    }

    if (!appState.pointerOrigin || !appState.newElement) {
      return { appState, elements, files }
    }

    const rect = normalizeRect(
      appState.pointerOrigin.x,
      appState.pointerOrigin.y,
      pointer.x,
      pointer.y,
    )

    const nextDraft =
      appState.newElement.type === 'text'
        ? newElementWith(appState.newElement, {
            ...rect,
            width: Math.max(rect.width, 240),
            height: Math.max(rect.height, 96),
          })
        : newElementWith(appState.newElement, rect)

    return {
      appState: {
        ...appState,
        newElement: nextDraft,
      },
      elements,
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
    ...commitDraftElement(appState, elements, pointer.x, pointer.y),
    files,
  }
}