import { createDefaultRectangle, MIN_RECTANGLE_SIZE, RECTANGLE_TOOL_DEFAULTS, resetRectangleIdCounter } from './defaults'
import { getCanvasCursorForRectangleTool, resolveRectangleBounds, resizeWithAspectLock } from './geometry'
import type { RectangleObject, RectangleToolAction, RectangleToolState } from './types'

function applyPatch(object: RectangleObject, patch: Partial<RectangleObject>): RectangleObject {
  return { ...object, ...patch }
}

function duplicateRectangle(object: RectangleObject): RectangleObject {
  return {
    ...object,
    id: `rect-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    x: object.x + 16,
    y: object.y + 16,
  }
}

export function createInitialRectangleToolState(): RectangleToolState {
  resetRectangleIdCounter()
  return {
    activeTool: 'select',
    rectangles: [],
    selectedIds: [],
    canvasCursor: getCanvasCursorForRectangleTool('select'),
    isDrawing: false,
    drawOrigin: null,
    previewRect: null,
    showResizeHandles: false,
    showRotationHandle: false,
    showCornerRadiusHandles: false,
    lastRenderTargets: [],
  }
}

export function rectangleToolReducer(state: RectangleToolState, action: RectangleToolAction): RectangleToolState {
  switch (action.type) {
    case 'SELECT_TOOL':
      return {
        ...state,
        activeTool: action.tool,
        canvasCursor: getCanvasCursorForRectangleTool(action.tool),
        isDrawing: false,
        drawOrigin: null,
        previewRect: null,
      }

    case 'KEY_R':
      return {
        ...state,
        activeTool: 'rectangle',
        canvasCursor: getCanvasCursorForRectangleTool('rectangle'),
      }

    case 'START_DRAW':
      return {
        ...state,
        isDrawing: true,
        drawOrigin: action.origin,
        previewRect: { x: action.origin.x, y: action.origin.y, width: 0, height: 0 },
      }

    case 'UPDATE_PREVIEW': {
      if (!state.drawOrigin) return state
      return {
        ...state,
        previewRect: resolveRectangleBounds(state.drawOrigin, action.point, action.modifiers),
      }
    }

    case 'FINISH_DRAW': {
      if (!state.drawOrigin) return state
      const rect = resolveRectangleBounds(state.drawOrigin, action.point, action.modifiers)
      if (rect.width < MIN_RECTANGLE_SIZE || rect.height < MIN_RECTANGLE_SIZE) {
        return { ...state, isDrawing: false, drawOrigin: null, previewRect: null }
      }

      const created = createDefaultRectangle(rect)
      return {
        ...state,
        rectangles: [...state.rectangles, created],
        selectedIds: [created.id],
        isDrawing: false,
        drawOrigin: null,
        previewRect: null,
        showResizeHandles: true,
        showRotationHandle: true,
        showCornerRadiusHandles: true,
        lastRenderTargets: [created.id],
      }
    }

    case 'CANCEL_DRAW':
      return { ...state, isDrawing: false, drawOrigin: null, previewRect: null }

    case 'SELECT_RECTANGLE':
      return {
        ...state,
        selectedIds: [action.id],
        showResizeHandles: true,
        showRotationHandle: true,
        showCornerRadiusHandles: true,
      }

    case 'UPDATE_STYLE': {
      const ids = action.id ? [action.id] : state.selectedIds
      if (!ids.length) return state
      return {
        ...state,
        rectangles: state.rectangles.map((rectangle) =>
          ids.includes(rectangle.id) ? applyPatch(rectangle, action.patch) : rectangle,
        ),
        lastRenderTargets: ids,
      }
    }

    case 'MOVE_RECTANGLE':
      return {
        ...state,
        rectangles: state.rectangles.map((rectangle) =>
          rectangle.id === action.id ? { ...rectangle, x: action.x, y: action.y } : rectangle,
        ),
        lastRenderTargets: [action.id],
      }

    case 'RESIZE_RECTANGLE': {
      const target = state.rectangles.find((rectangle) => rectangle.id === action.id)
      if (!target) return state
      const aspectRatio = target.width / target.height || 1
      const nextSize = resizeWithAspectLock(action.width, action.height, Boolean(action.lockAspectRatio), aspectRatio)
      return {
        ...state,
        rectangles: state.rectangles.map((rectangle) =>
          rectangle.id === action.id ? { ...rectangle, ...nextSize } : rectangle,
        ),
        lastRenderTargets: [action.id],
      }
    }

    case 'SET_SIZE':
      return {
        ...state,
        rectangles: state.rectangles.map((rectangle) =>
          rectangle.id === action.id ? { ...rectangle, width: action.width, height: action.height } : rectangle,
        ),
        lastRenderTargets: [action.id],
      }

    case 'SET_POSITION':
      return {
        ...state,
        rectangles: state.rectangles.map((rectangle) =>
          rectangle.id === action.id ? { ...rectangle, x: action.x, y: action.y } : rectangle,
        ),
        lastRenderTargets: [action.id],
      }

    case 'DELETE_RECTANGLE':
      return {
        ...state,
        rectangles: state.rectangles.filter((rectangle) => rectangle.id !== action.id),
        selectedIds: state.selectedIds.filter((id) => id !== action.id),
        showResizeHandles: false,
        showRotationHandle: false,
        showCornerRadiusHandles: false,
        lastRenderTargets: [],
      }

    case 'DUPLICATE_RECTANGLE': {
      const source = state.rectangles.find((rectangle) => rectangle.id === action.id)
      if (!source) return state
      const copy = duplicateRectangle(source)
      return {
        ...state,
        rectangles: [...state.rectangles, copy],
        selectedIds: [copy.id],
        showResizeHandles: true,
        showRotationHandle: true,
        showCornerRadiusHandles: true,
        lastRenderTargets: [copy.id],
      }
    }

    case 'TOGGLE_ROUNDED_CORNERS': {
      const target = state.rectangles.find((rectangle) => rectangle.id === action.id)
      if (!target) return state
      const current = typeof target.cornerRadius === 'number' ? target.cornerRadius : 0
      const next = current > 0 ? 0 : 12
      return {
        ...state,
        rectangles: state.rectangles.map((rectangle) =>
          rectangle.id === action.id ? { ...rectangle, cornerRadius: next } : rectangle,
        ),
        lastRenderTargets: [action.id],
      }
    }

    case 'ROTATE_RECTANGLE':
      return {
        ...state,
        rectangles: state.rectangles.map((rectangle) =>
          rectangle.id === action.id ? { ...rectangle, rotation: action.rotation } : rectangle,
        ),
        lastRenderTargets: [action.id],
      }

    default:
      return state
  }
}

export function reduceRectangleTool(state: RectangleToolState, ...actions: RectangleToolAction[]) {
  return actions.reduce((current, action) => rectangleToolReducer(current, action), state)
}

export { RECTANGLE_TOOL_DEFAULTS, MIN_RECTANGLE_SIZE }