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
    }
  | {
      type: 'import-image'
      element: EditorSnapshot['elements'][number]
      fileId: string
      file: AssetFile
    }
  | { type: 'delete-selected' }
  | { type: 'update-text'; elementId: string; text: string }
  | { type: 'z-order'; direction: ZOrderAction }
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
      }

      if (state.gestureCheckpoint && !snapshotsEqual(state.gestureCheckpoint, present)) {
        nextState = pushUndo(nextState, state.gestureCheckpoint)
      }

      return nextState
    }
    case 'update-scene': {
      const present = updateScene(state.present, action.update)

      if (!action.recordHistory || snapshotsEqual(state.present, present)) {
        return { ...state, present }
      }

      return {
        ...pushUndo(state, state.present),
        present,
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
      }
    }
    case 'update-text': {
      const present = updateElementInScene(state.present, action.elementId, {
        text: action.text,
      })

      return {
        ...pushUndo(state, state.present),
        present: {
          ...present,
          appState: {
            ...present.appState,
            editingElementId: null,
          },
        },
        gestureCheckpoint: null,
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
          editingElementId: null,
        },
      }

      return {
        ...pushUndo(state, state.present),
        present,
        gestureCheckpoint: null,
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
          editingElementId: null,
        },
      },
    })
  }, [])

  const onPointerDown = useCallback((x: number, y: number, shiftKey = false) => {
    dispatch({ type: 'pointer', phase: 'down', x, y, shiftKey })
  }, [])

  const onPointerMove = useCallback((x: number, y: number, shiftKey = false) => {
    dispatch({ type: 'pointer', phase: 'move', x, y, shiftKey })
  }, [])

  const onPointerUp = useCallback((x: number, y: number, shiftKey = false) => {
    dispatch({ type: 'pointer', phase: 'up', x, y, shiftKey })
  }, [])

  const importImage = useCallback(async (file: File) => {
    const { element, fileId, file: assetFile } = await importImageFile(file)
    dispatch({ type: 'import-image', element, fileId, file: assetFile })
  }, [])

  const deleteSelected = useCallback(() => {
    dispatch({ type: 'delete-selected' })
  }, [])

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
          pointerOrigin: null,
        },
      },
    })
  }, [])

  const finishTextEditing = useCallback(() => {
    dispatch({
      type: 'update-scene',
      update: {
        appState: {
          editingElementId: null,
        },
      },
    })
  }, [])

  const updateText = useCallback((elementId: string, text: string) => {
    dispatch({ type: 'update-text', elementId, text })
  }, [])

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    const hit = getElementAtPosition(snapshot.elements, x, y)
    if (hit?.type === 'text') {
      startTextEditing(hit.id)
    }
  }, [snapshot.elements, startTextEditing])

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
  }, [changeZOrder, deleteSelected, redoChange, snapshot.appState.selectedElementIds, undoChange])

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
    startTextEditing,
    finishTextEditing,
    updateText,
    deleteSelected,
    undoChange,
    redoChange,
    changeZOrder,
    saveDocument,
    loadDocument,
    importImage,
  }
}