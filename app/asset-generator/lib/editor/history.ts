import { getDefaultAppState } from './appState'
import { createInitialSnapshot } from './updateScene'
import type { AppState, EditorSnapshot } from './types'

export type HistorySnapshot = {
  elements: EditorSnapshot['elements']
  files: EditorSnapshot['files']
  viewBackgroundColor: string
  projectName: string
}

export type EditorState = {
  present: EditorSnapshot
  undoStack: HistorySnapshot[]
  redoStack: HistorySnapshot[]
  gestureCheckpoint: EditorSnapshot | null
  textEditCheckpoint: EditorSnapshot | null
}

export const MAX_HISTORY_ENTRIES = 50

export function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    appState: { ...snapshot.appState },
    elements: snapshot.elements.map((element) => ({ ...element })),
    files: { ...snapshot.files },
  }
}

export function createHistorySnapshot(snapshot: EditorSnapshot): HistorySnapshot {
  return {
    elements: snapshot.elements.map((element) => ({ ...element })),
    files: { ...snapshot.files },
    viewBackgroundColor: snapshot.appState.viewBackgroundColor,
    projectName: snapshot.appState.projectName,
  }
}

export function applyHistorySnapshot(
  present: EditorSnapshot,
  history: HistorySnapshot,
): EditorSnapshot {
  return {
    appState: resetTransientAppState({
      ...present.appState,
      viewBackgroundColor: history.viewBackgroundColor,
      projectName: history.projectName,
    }),
    elements: history.elements.map((element) => ({ ...element })),
    files: { ...history.files },
  }
}

export function resetTransientAppState(appState: AppState): AppState {
  return {
    ...appState,
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
  }
}

export function createInitialEditorState(): EditorState {
  return {
    present: createInitialSnapshot(),
    undoStack: [],
    redoStack: [],
    gestureCheckpoint: null,
    textEditCheckpoint: null,
  }
}

export function pushUndo(state: EditorState, snapshot: EditorSnapshot): EditorState {
  const entry = createHistorySnapshot(snapshot)
  const undoStack = [...state.undoStack, entry].slice(-MAX_HISTORY_ENTRIES)

  return {
    ...state,
    undoStack,
    redoStack: [],
  }
}

export function undo(state: EditorState): EditorState {
  if (state.undoStack.length === 0) {
    return state
  }

  const previous = state.undoStack[state.undoStack.length - 1]
  const undoStack = state.undoStack.slice(0, -1)
  const redoStack = [...state.redoStack, createHistorySnapshot(state.present)]

  return {
    ...state,
    present: applyHistorySnapshot(state.present, previous),
    undoStack,
    redoStack,
    gestureCheckpoint: null,
    textEditCheckpoint: null,
  }
}

export function redo(state: EditorState): EditorState {
  if (state.redoStack.length === 0) {
    return state
  }

  const next = state.redoStack[state.redoStack.length - 1]
  const redoStack = state.redoStack.slice(0, -1)
  const undoStack = [...state.undoStack, createHistorySnapshot(state.present)]

  return {
    ...state,
    present: applyHistorySnapshot(state.present, next),
    undoStack,
    redoStack,
    gestureCheckpoint: null,
    textEditCheckpoint: null,
  }
}

export function snapshotsEqual(left: EditorSnapshot, right: EditorSnapshot) {
  return JSON.stringify(createHistorySnapshot(left)) === JSON.stringify(createHistorySnapshot(right))
}

export function replacePresent(state: EditorState, snapshot: EditorSnapshot): EditorState {
  return {
    present: {
      ...snapshot,
      appState: resetTransientAppState({
        ...getDefaultAppState(),
        ...snapshot.appState,
      }),
    },
    undoStack: [],
    redoStack: [],
    gestureCheckpoint: null,
    textEditCheckpoint: null,
  }
}
