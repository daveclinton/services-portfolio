'use client'

import { useCallback, useEffect, useReducer } from 'react'
import { ICON_SIZE } from '../common/constants'
import { downloadDocument, loadDocumentFromFile } from '../data/json'
import { importImageFile } from '../data/image'
import { getElementAtPosition, getPrimarySelectedElement } from '../element/selection'
import {
  bringForward,
  bringToFront,
  sendBackward,
  sendToBack,
} from '../element/zOrder'
import {
  createInitialEditorState,
  pushUndo,
  redo,
  snapshotsEqual,
  undo,
  cloneSnapshot,
  replacePresent,
} from './history'
import {
  createInitialSnapshot,
  deleteSelectedElements,
  duplicateSelectedElements,
  selectAllElements,
  selectElementForContextMenu,
  updateElementInScene,
  updateScene,
} from './updateScene'
import type { AssetFile, EditorSnapshot, SceneUpdate } from './types'
import type { ToolType } from '../element/types'
import type { EditorState } from './history'

type ZOrderAction = 'forward' | 'backward' | 'front' | 'back'

type EditorAction =
  | { type: 'update-scene'; update: SceneUpdate; recordHistory?: boolean }
  | {
      type: 'pointer'
      phase: 'down' | 'move' | 'up'
      x: number
      y: number
      shiftKey?: boolean
      altKey?: boolean
    }
  | {
      type: 'import-image'
      element: EditorSnapshot['elements'][number]
      fileId: string
      file: AssetFile
    }
  | { type: 'delete-selected' }
  | { type: 'duplicate-selected' }
  | { type: 'select-all' }
  | { type: 'update-selected-elements'; updates: Partial<EditorSnapshot['elements'][number]> }
  | { type: 'update-text-draft'; elementId: string; text: string }
  | { type: 'update-text'; elementId: string; text: string; viaKeyboard?: boolean }
  | { type: 'z-order'; direction: ZOrderAction }
  | { type: 'context-menu'; x: number; y: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'replace'; snapshot: EditorSnapshot }

function shouldCheckpointGesture(snapshot: EditorSnapshot) {
  const { interaction } = snapshot.appState
  return interaction === 'drawing' || interaction === 'dragging' || interaction === 'resizing'
}

function applyZOrder(snapshot: EditorSnapshot, direction: ZOrderAction): EditorSnapshot {
  const selectedId = getPrimarySelectedElement(
    snapshot.elements,
    snapshot.appState.selectedElementIds,
  )?.id
  if (!selectedId) {
    return snapshot
  }

  let elements = snapshot.elements

  switch (direction) {
    case 'forward':
      elements = bringForward(elements, selectedId)
      break
    case 'backward':
      elements = sendBackward(elements, selectedId)
      break
    case 'front':
      elements = bringToFront(elements, selectedId)
      break
    case 'back':
      elements = sendToBack(elements, selectedId)
      break
    default:
      break
  }

  return { ...snapshot, elements }
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'undo':
      return undo(state)
    case 'redo':
      return redo(state)
    case 'replace':
      return replacePresent(state, action.snapshot)
    case 'pointer': {
      if (action.phase === 'down') {
        const checkpoint = cloneSnapshot(state.present)
        const present = updateScene(state.present, {}, action)

        return {
          ...state,
          present,
          gestureCheckpoint: shouldCheckpointGesture(present) ? checkpoint : null,
          textEditCheckpoint: null,
        }
      }

      if (action.phase === 'move') {
        return {
          ...state,
          present: updateScene(state.present, {}, action),
        }
      }

      const present = updateScene(state.present, {}, action)
      let nextState: EditorState = {
        ...state,
        present,
        gestureCheckpoint: null,
        textEditCheckpoint: null,
      }

      if (state.gestureCheckpoint && !snapshotsEqual(state.gestureCheckpoint, present)) {
        nextState = pushUndo(nextState, state.gestureCheckpoint)
      }

      return nextState
    }
    case 'update-scene': {
      const present = updateScene(state.present, action.update)
      const clearsTextEdit =
        action.update.appState &&
        ('editingElementId' in action.update.appState ||
          'activeTool' in action.update.appState)

      if (!action.recordHistory || snapshotsEqual(state.present, present)) {
        return {
          ...state,
          present,
          textEditCheckpoint: clearsTextEdit ? null : state.textEditCheckpoint,
        }
      }

      return {
        ...pushUndo(state, state.present),
        present,
        textEditCheckpoint: clearsTextEdit ? null : state.textEditCheckpoint,
      }
    }
    case 'delete-selected': {
      const present = deleteSelectedElements(state.present)
      if (snapshotsEqual(state.present, present)) {
        return state
      }

      return {
        ...pushUndo(state, state.present),
        present,
        gestureCheckpoint: null,
        textEditCheckpoint: null,
      }
    }
    case 'duplicate-selected': {
      const present = duplicateSelectedElements(state.present)
      if (snapshotsEqual(state.present, present)) {
        return state
      }

      return {
        ...pushUndo(state, state.present),
        present,
        gestureCheckpoint: null,
        textEditCheckpoint: null,
      }
    }
    case 'update-selected-elements': {
      const selectedIds = Object.keys(state.present.appState.selectedElementIds)
      if (selectedIds.length === 0) {
        return state
      }

      const present = selectedIds.reduce(
        (snapshot, elementId) => updateElementInScene(snapshot, elementId, action.updates),
        state.present,
      )

      if (snapshotsEqual(state.present, present)) {
        return state
      }

      return {
        ...pushUndo(state, state.present),
        present,
        gestureCheckpoint: null,
        textEditCheckpoint: null,
      }
    }
    case 'update-text-draft': {
      const present = updateElementInScene(state.present, action.elementId, {
        text: action.text,
      })

      return {
        ...state,
        present,
        textEditCheckpoint: state.textEditCheckpoint ?? cloneSnapshot(state.present),
      }
    }
    case 'select-all': {
      const present = selectAllElements(state.present)
      return { ...state, present, gestureCheckpoint: null, textEditCheckpoint: null }
    }
    case 'context-menu': {
      const present = selectElementForContextMenu(state.present, action.x, action.y)
      return { ...state, present, gestureCheckpoint: null, textEditCheckpoint: null }
    }
    case 'update-text': {
      const trimmed = action.text.trim()
      const checkpoint = state.textEditCheckpoint ?? state.present

      if (!trimmed) {
        const present: EditorSnapshot = {
          ...state.present,
          elements: state.present.elements.filter((element) => element.id !== action.elementId),
          appState: {
            ...state.present.appState,
            editingElementId: null,
            selectedElementIds: {},
            selectionBox: null,
            selectionOriginIds: null,
          },
        }

        if (snapshotsEqual(state.present, present)) {
          return state
        }

        return {
          ...pushUndo(state, checkpoint),
          present,
          gestureCheckpoint: null,
          textEditCheckpoint: null,
        }
      }

      const updated = updateElementInScene(state.present, action.elementId, {
        text: action.text,
      })
      const present: EditorSnapshot = {
        ...updated,
        appState: {
          ...updated.appState,
          editingElementId: null,
          selectedElementIds: action.viaKeyboard
            ? { [action.elementId]: true as const }
            : updated.appState.selectedElementIds,
          selectionBox: null,
          selectionOriginIds: null,
        },
      }

      if (snapshotsEqual(checkpoint, present)) {
        return {
          ...state,
          present,
          gestureCheckpoint: null,
          textEditCheckpoint: null,
        }
      }

      return {
        ...pushUndo(state, checkpoint),
        present,
        gestureCheckpoint: null,
        textEditCheckpoint: null,
      }
    }
    case 'z-order': {
      const present = applyZOrder(state.present, action.direction)
      if (snapshotsEqual(state.present, present)) {
        return state
      }

      return {
        ...pushUndo(state, state.present),
        present,
        gestureCheckpoint: null,
        textEditCheckpoint: null,
      }
    }
    case 'import-image': {
      const present: EditorSnapshot = {
        ...state.present,
        elements: [...state.present.elements, action.element],
        files: {
          ...state.present.files,
          [action.fileId]: action.file,
        },
        appState: {
          ...state.present.appState,
          activeTool: { type: 'selection', locked: false },
          selectedElementIds: { [action.element.id]: true as const },
          newElement: null,
          pointerOrigin: null,
          interaction: 'idle',
          resizeHandle: null,
          originalElement: null,
          originalElements: null,
          selectionBox: null,
          selectionOriginIds: null,
          editingElementId: null,
        },
      }

      return {
        ...pushUndo(state, state.present),
        present,
        gestureCheckpoint: null,
        textEditCheckpoint: null,
      }
    }
    default:
      return state
  }
}

export function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * ICON_SIZE
  const y = ((clientY - rect.top) / rect.height) * ICON_SIZE

  return { x, y }
}

export function useEditor() {
  const [state, dispatch] = useReducer(editorReducer, undefined, createInitialEditorState)

  const snapshot = state.present

  const updateAppState = useCallback((appState: SceneUpdate['appState']) => {
    dispatch({
      type: 'update-scene',
      update: { appState },
    })
  }, [])

  const setActiveTool = useCallback((type: ToolType) => {
    dispatch({
      type: 'update-scene',
      update: {
        appState: {
          activeTool: { type, locked: false },
          selectedElementIds: {},
          newElement: null,
          pointerOrigin: null,
          interaction: 'idle',
          resizeHandle: null,
          originalElement: null,
          originalElements: null,
          selectionBox: null,
          selectionOriginIds: null,
          editingElementId: null,
        },
      },
    })
  }, [])

  const onPointerDown = useCallback((x: number, y: number, shiftKey = false, altKey = false) => {
    dispatch({ type: 'pointer', phase: 'down', x, y, shiftKey, altKey })
  }, [])

  const onPointerMove = useCallback((x: number, y: number, shiftKey = false, altKey = false) => {
    dispatch({ type: 'pointer', phase: 'move', x, y, shiftKey, altKey })
  }, [])

  const onPointerUp = useCallback((x: number, y: number, shiftKey = false, altKey = false) => {
    dispatch({ type: 'pointer', phase: 'up', x, y, shiftKey, altKey })
  }, [])

  const importImage = useCallback(async (file: File) => {
    const { element, fileId, file: assetFile } = await importImageFile(file)
    dispatch({ type: 'import-image', element, fileId, file: assetFile })
  }, [])

  const deleteSelected = useCallback(() => {
    dispatch({ type: 'delete-selected' })
  }, [])

  const duplicateSelected = useCallback(() => {
    dispatch({ type: 'duplicate-selected' })
  }, [])

  const selectAll = useCallback(() => {
    dispatch({ type: 'select-all' })
  }, [])

  const updateSelectedElements = useCallback(
    (updates: Partial<EditorSnapshot['elements'][number]>) => {
      dispatch({ type: 'update-selected-elements', updates })
    },
    [],
  )

  const undoChange = useCallback(() => {
    dispatch({ type: 'undo' })
  }, [])

  const redoChange = useCallback(() => {
    dispatch({ type: 'redo' })
  }, [])

  const changeZOrder = useCallback((direction: ZOrderAction) => {
    dispatch({ type: 'z-order', direction })
  }, [])

  const saveDocument = useCallback(() => {
    const filename = `${snapshot.appState.projectName.trim() || 'asset'}-project.json`
    downloadDocument(snapshot, filename.replace(/[^a-zA-Z0-9._-]+/g, '-'))
  }, [snapshot])

  const loadDocument = useCallback(async (file: File) => {
    const loaded = await loadDocumentFromFile(file)
    dispatch({ type: 'replace', snapshot: loaded })
  }, [])

  const startTextEditing = useCallback((elementId: string) => {
    dispatch({
      type: 'update-scene',
      update: {
        appState: {
          editingElementId: elementId,
          selectedElementIds: { [elementId]: true as const },
          interaction: 'idle',
          resizeHandle: null,
          originalElement: null,
          originalElements: null,
          selectionBox: null,
          selectionOriginIds: null,
          pointerOrigin: null,
        },
      },
    })
  }, [])

  const updateText = useCallback((elementId: string, text: string, viaKeyboard = false) => {
    dispatch({ type: 'update-text', elementId, text, viaKeyboard })
  }, [])

  const updateTextDraft = useCallback((elementId: string, text: string) => {
    dispatch({ type: 'update-text-draft', elementId, text })
  }, [])

  const handleCanvasContextMenu = useCallback((x: number, y: number) => {
    dispatch({ type: 'context-menu', x, y })
  }, [])

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    if (snapshot.appState.activeTool.type !== 'selection') {
      return
    }

    const hit = getElementAtPosition(snapshot.elements, x, y)
    if (hit?.type === 'text') {
      startTextEditing(hit.id)
    }
  }, [snapshot.appState.activeTool.type, snapshot.elements, startTextEditing])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      const isMeta = event.metaKey || event.ctrlKey

      if (isMeta && event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault()
        redoChange()
        return
      }

      if (isMeta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undoChange()
        return
      }

      if (isMeta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redoChange()
        return
      }

      if (isMeta && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        selectAll()
        return
      }

      if (isMeta && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelected()
        return
      }

      if (event.key === 'Enter') {
        const selectedIds = Object.keys(snapshot.appState.selectedElementIds)
        if (selectedIds.length === 1) {
          const selected = snapshot.elements.find((element) => element.id === selectedIds[0])
          if (selected?.type === 'text') {
            event.preventDefault()
            startTextEditing(selected.id)
            return
          }
        }
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        deleteSelected()
        return
      }

      if (event.key === ']' && Object.keys(snapshot.appState.selectedElementIds).length > 0) {
        event.preventDefault()
        changeZOrder('forward')
        return
      }

      if (event.key === '[' && Object.keys(snapshot.appState.selectedElementIds).length > 0) {
        event.preventDefault()
        changeZOrder('backward')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    changeZOrder,
    deleteSelected,
    duplicateSelected,
    redoChange,
    selectAll,
    snapshot.appState.selectedElementIds,
    snapshot.elements,
    startTextEditing,
    undoChange,
  ])

  return {
    appState: snapshot.appState,
    elements: snapshot.elements,
    files: snapshot.files,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    setActiveTool,
    updateAppState,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onCanvasDoubleClick: handleCanvasDoubleClick,
    onCanvasContextMenu: handleCanvasContextMenu,
    startTextEditing,
    updateText,
    updateTextDraft,
    updateSelectedElements,
    deleteSelected,
    duplicateSelected,
    selectAll,
    undoChange,
    redoChange,
    changeZOrder,
    saveDocument,
    loadDocument,
    importImage,
  }
}
