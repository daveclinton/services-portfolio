import { createDefaultTextObject, resetTextIdCounter } from './defaults'
import { getCanvasCursorForTool } from './cursor'
import type { TextObject, TextToolAction, TextToolState } from './types'

const MIN_TEXT_BOX_DRAG = 8

function clampSelection(text: string, start: number, end: number) {
  const max = text.length
  return {
    start: Math.max(0, Math.min(start, max)),
    end: Math.max(0, Math.min(end, max)),
  }
}

function replaceRange(text: string, start: number, end: number, value: string) {
  const normalized = clampSelection(text, start, end)
  const from = Math.min(normalized.start, normalized.end)
  const to = Math.max(normalized.start, normalized.end)
  return {
    text: text.slice(0, from) + value + text.slice(to),
    cursor: from + value.length,
  }
}

function getTextAtPoint(state: TextToolState, point: { x: number; y: number }) {
  return [...state.textObjects]
    .reverse()
    .find((object) => {
      const width = object.width ?? Math.max(24, object.text.length * object.fontSize * 0.55)
      const height = object.height ?? object.fontSize * object.lineHeight * Math.max(1, object.text.split('\n').length)
      return point.x >= object.x && point.x <= object.x + width && point.y >= object.y && point.y <= object.y + height
    })
}

function applyStylePatch(object: TextObject, patch: Partial<TextObject>): TextObject {
  const next = { ...object, ...patch }

  if ('bold' in patch) {
    next.fontWeight = patch.bold ? 700 : 400
  }

  if ('italic' in patch) {
    next.fontStyle = patch.italic ? 'italic' : 'normal'
    next.italic = Boolean(patch.italic)
  }

  if ('underline' in patch) {
    next.underline = Boolean(patch.underline)
    next.decoration = patch.underline ? 'underline' : next.decoration === 'strikethrough' ? 'strikethrough' : 'none'
  }

  if ('decoration' in patch && patch.decoration) {
    next.underline = patch.decoration === 'underline'
  }

  return next
}

function enterEditMode(state: TextToolState, id: string): TextToolState {
  const object = state.textObjects.find((candidate) => candidate.id === id)
  if (!object) return state

  return {
    ...state,
    activeTool: 'text',
    selectedIds: [id],
    isEditing: true,
    editingId: id,
    selectionStart: object.text.length,
    selectionEnd: object.text.length,
    canvasCursor: getCanvasCursorForTool('text'),
    showBaselineGuides: true,
    showDimensionIndicators: true,
    showSelectionHighlight: true,
    showBoundingBox: false,
    showResizeHandles: false,
  }
}

function exitEditMode(state: TextToolState): TextToolState {
  const selectedId = state.editingId ?? state.selectedIds[0] ?? null

  return {
    ...state,
    isEditing: false,
    editingId: null,
    showBaselineGuides: false,
    showDimensionIndicators: false,
    showSelectionHighlight: false,
    showBoundingBox: Boolean(selectedId),
    showResizeHandles: Boolean(selectedId),
    selectedIds: selectedId ? [selectedId] : state.selectedIds,
    canvasCursor: getCanvasCursorForTool(state.activeTool),
  }
}

function createTextAtPoint(state: TextToolState, point: { x: number; y: number }, width: number | null) {
  const object = createDefaultTextObject(point, width)
  return {
    ...state,
    textObjects: [...state.textObjects, object],
    selectedIds: [object.id],
    isEditing: true,
    editingId: object.id,
    selectionStart: 0,
    selectionEnd: 0,
    showBaselineGuides: true,
    showDimensionIndicators: width !== null,
    showSelectionHighlight: true,
    showBoundingBox: false,
    showResizeHandles: false,
    lastRenderTargets: [object.id],
  }
}

export function createInitialTextToolState(): TextToolState {
  resetTextIdCounter()
  return {
    activeTool: 'select',
    textObjects: [],
    selectedIds: [],
    isEditing: false,
    editingId: null,
    selectionStart: 0,
    selectionEnd: 0,
    canvasCursor: getCanvasCursorForTool('select'),
    showBaselineGuides: false,
    showDimensionIndicators: false,
    showSelectionHighlight: false,
    showBoundingBox: false,
    showResizeHandles: false,
    pendingTextBoxDrag: null,
    lastRenderTargets: [],
  }
}

export function textToolReducer(state: TextToolState, action: TextToolAction): TextToolState {
  switch (action.type) {
    case 'SELECT_TOOL': {
      const next = exitEditMode({ ...state, activeTool: action.tool })
      return {
        ...next,
        canvasCursor: getCanvasCursorForTool(action.tool),
      }
    }

    case 'KEY_T':
      return {
        ...state,
        activeTool: 'text',
        canvasCursor: getCanvasCursorForTool('text'),
      }

    case 'CANVAS_POINTER_DOWN': {
      const hit = getTextAtPoint(state, action.point)

      if (action.isDoubleClick && hit) {
        return enterEditMode(state, hit.id)
      }

      if (state.activeTool === 'text') {
        if (hit) {
          return enterEditMode(state, hit.id)
        }

        return {
          ...createTextAtPoint(state, action.point, null),
          pendingTextBoxDrag: { origin: action.point },
        }
      }

      if (hit) {
        return {
          ...exitEditMode(state),
          selectedIds: [hit.id],
          showBoundingBox: true,
          showResizeHandles: true,
        }
      }

      return {
        ...exitEditMode(state),
        selectedIds: [],
        showBoundingBox: false,
        showResizeHandles: false,
      }
    }

    case 'CANVAS_POINTER_UP': {
      if (!state.pendingTextBoxDrag) return state

      const dx = Math.abs(action.point.x - state.pendingTextBoxDrag.origin.x)
      const dy = Math.abs(action.point.y - state.pendingTextBoxDrag.origin.y)
      const isDrag = dx >= MIN_TEXT_BOX_DRAG || dy >= MIN_TEXT_BOX_DRAG

      if (!isDrag) {
        return { ...state, pendingTextBoxDrag: null }
      }

      const width = Math.max(32, dx)
      const height = Math.max(24, dy)
      const origin = state.pendingTextBoxDrag.origin
      const editingId = state.editingId

      if (!editingId) {
        return { ...state, pendingTextBoxDrag: null }
      }

      return {
        ...state,
        pendingTextBoxDrag: null,
        textObjects: state.textObjects.map((object) =>
          object.id === editingId ? { ...object, width, height } : object,
        ),
        showDimensionIndicators: true,
        lastRenderTargets: [editingId],
      }
    }

    case 'CANVAS_CLICK_OUTSIDE':
    case 'KEY_ESCAPE':
      return exitEditMode(state)

    case 'INSERT_TEXT': {
      if (!state.editingId) return state
      const object = state.textObjects.find((candidate) => candidate.id === state.editingId)
      if (!object) return state

      const hasSelection = state.selectionStart !== state.selectionEnd
      const { text, cursor } = hasSelection
        ? replaceRange(object.text, state.selectionStart, state.selectionEnd, action.value)
        : replaceRange(object.text, state.selectionStart, state.selectionStart, action.value)

      return {
        ...state,
        textObjects: state.textObjects.map((candidate) =>
          candidate.id === object.id ? { ...candidate, text } : candidate,
        ),
        selectionStart: cursor,
        selectionEnd: cursor,
        lastRenderTargets: [object.id],
      }
    }

    case 'BACKSPACE': {
      if (!state.editingId) return state
      const object = state.textObjects.find((candidate) => candidate.id === state.editingId)
      if (!object) return state

      if (state.selectionStart !== state.selectionEnd) {
        const { text, cursor } = replaceRange(object.text, state.selectionStart, state.selectionEnd, '')
        return {
          ...state,
          textObjects: state.textObjects.map((candidate) =>
            candidate.id === object.id ? { ...candidate, text } : candidate,
          ),
          selectionStart: cursor,
          selectionEnd: cursor,
          lastRenderTargets: [object.id],
        }
      }

      if (state.selectionStart === 0) return state
      const { text, cursor } = replaceRange(object.text, state.selectionStart - 1, state.selectionStart, '')
      return {
        ...state,
        textObjects: state.textObjects.map((candidate) =>
          candidate.id === object.id ? { ...candidate, text } : candidate,
        ),
        selectionStart: cursor,
        selectionEnd: cursor,
        lastRenderTargets: [object.id],
      }
    }

    case 'DELETE': {
      if (!state.editingId) return state
      const object = state.textObjects.find((candidate) => candidate.id === state.editingId)
      if (!object) return state

      if (state.selectionStart !== state.selectionEnd) {
        const { text, cursor } = replaceRange(object.text, state.selectionStart, state.selectionEnd, '')
        return {
          ...state,
          textObjects: state.textObjects.map((candidate) =>
            candidate.id === object.id ? { ...candidate, text } : candidate,
          ),
          selectionStart: cursor,
          selectionEnd: cursor,
          lastRenderTargets: [object.id],
        }
      }

      if (state.selectionStart >= object.text.length) return state
      const { text, cursor } = replaceRange(object.text, state.selectionStart, state.selectionStart + 1, '')
      return {
        ...state,
        textObjects: state.textObjects.map((candidate) =>
          candidate.id === object.id ? { ...candidate, text } : candidate,
        ),
        selectionStart: cursor,
        selectionEnd: cursor,
        lastRenderTargets: [object.id],
      }
    }

    case 'SET_SELECTION':
      return {
        ...state,
        selectionStart: action.start,
        selectionEnd: action.end,
        showSelectionHighlight: true,
      }

    case 'TOGGLE_BOLD': {
      if (!state.editingId) return state
      const object = state.textObjects.find((candidate) => candidate.id === state.editingId)
      if (!object) return state
      const bold = !object.bold
      return {
        ...state,
        textObjects: state.textObjects.map((candidate) =>
          candidate.id === object.id ? applyStylePatch(candidate, { bold, fontWeight: bold ? 700 : 400 }) : candidate,
        ),
        lastRenderTargets: [object.id],
      }
    }

    case 'TOGGLE_ITALIC': {
      if (!state.editingId) return state
      const object = state.textObjects.find((candidate) => candidate.id === state.editingId)
      if (!object) return state
      const italic = !object.italic
      return {
        ...state,
        textObjects: state.textObjects.map((candidate) =>
          candidate.id === object.id
            ? applyStylePatch(candidate, { italic, fontStyle: italic ? 'italic' : 'normal' })
            : candidate,
        ),
        lastRenderTargets: [object.id],
      }
    }

    case 'TOGGLE_UNDERLINE': {
      if (!state.editingId) return state
      const object = state.textObjects.find((candidate) => candidate.id === state.editingId)
      if (!object) return state
      const underline = !object.underline
      return {
        ...state,
        textObjects: state.textObjects.map((candidate) =>
          candidate.id === object.id
            ? applyStylePatch(candidate, { underline, decoration: underline ? 'underline' : 'none' })
            : candidate,
        ),
        lastRenderTargets: [object.id],
      }
    }

    case 'UPDATE_STYLE': {
      const ids = action.id ? [action.id] : state.selectedIds
      if (!ids.length) return state

      return {
        ...state,
        textObjects: state.textObjects.map((object) =>
          ids.includes(object.id) ? applyStylePatch(object, action.patch) : object,
        ),
        lastRenderTargets: ids,
      }
    }

    case 'BATCH_UPDATE_STYLE':
      return {
        ...state,
        textObjects: state.textObjects.map((object) =>
          action.ids.includes(object.id) ? applyStylePatch(object, action.patch) : object,
        ),
        lastRenderTargets: action.ids,
      }

    case 'MOVE_TEXT':
      return {
        ...state,
        textObjects: state.textObjects.map((object) =>
          object.id === action.id ? { ...object, x: action.x, y: action.y } : object,
        ),
        lastRenderTargets: [action.id],
      }

    case 'RESIZE_TEXT':
      return {
        ...state,
        textObjects: state.textObjects.map((object) =>
          object.id === action.id ? { ...object, width: action.width, height: action.height } : object,
        ),
        showDimensionIndicators: true,
        lastRenderTargets: [action.id],
      }

    case 'DELETE_TEXT':
      return {
        ...exitEditMode(state),
        textObjects: state.textObjects.filter((object) => object.id !== action.id),
        selectedIds: state.selectedIds.filter((id) => id !== action.id),
        showBoundingBox: false,
        showResizeHandles: false,
        lastRenderTargets: [],
      }

    case 'SELECT_TEXT':
      return {
        ...exitEditMode(state),
        selectedIds: [action.id],
        showBoundingBox: true,
        showResizeHandles: true,
      }

    case 'DOUBLE_CLICK_TEXT':
      return enterEditMode(state, action.id)

    case 'MARK_RENDER_TARGETS':
      return {
        ...state,
        lastRenderTargets: action.ids,
      }

    default:
      return state
  }
}

export function reduceTextTool(state: TextToolState, ...actions: TextToolAction[]) {
  return actions.reduce((current, action) => textToolReducer(current, action), state)
}