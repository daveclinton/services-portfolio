import {
  MIN_TEXT_HEIGHT,
  MIN_TEXT_WIDTH,
  TEXT_LINE_HEIGHT,
  CURSOR_TYPE,
} from '../common/constants'
import { DEFAULT_FONT_SIZE } from '../common/defaults'
import { getElementAtPosition, getSelectedElementIds } from './selection'
import {
  getCursorForResizingHandle,
  getTransformHandleAtPosition,
} from './transformHandles'
import type { AppState } from '../editor/types'
import type { AssetElement } from './types'

export function getTextLineHeightInPx(fontSize = DEFAULT_FONT_SIZE) {
  return fontSize * TEXT_LINE_HEIGHT
}

export function getTextTopForSceneY(sceneY: number, fontSize = DEFAULT_FONT_SIZE) {
  return sceneY - getTextLineHeightInPx(fontSize) / 2
}

export function getDefaultTextDimensions(fontSize = DEFAULT_FONT_SIZE) {
  const height = Math.max(MIN_TEXT_HEIGHT, getTextLineHeightInPx(fontSize))

  return {
    width: MIN_TEXT_WIDTH,
    height,
  }
}

export function getTextLines(text: string) {
  return text.split('\n')
}

export function measureTextDimensions(text: string, fontSize = DEFAULT_FONT_SIZE) {
  const lines = getTextLines(text || ' ')
  const widestLineLength = lines.reduce((max, line) => Math.max(max, line.length || 1), 1)
  const width = Math.max(MIN_TEXT_WIDTH, Math.ceil(widestLineLength * fontSize * 0.62))
  const height = Math.max(MIN_TEXT_HEIGHT, Math.ceil(lines.length * getTextLineHeightInPx(fontSize)))

  return { width, height }
}

export function getCanvasCursor(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
) {
  if (appState.editingElementId) {
    return CURSOR_TYPE.AUTO
  }

  const hit = x >= 0 && y >= 0 ? getElementAtPosition(elements, x, y) : null

  if (appState.activeTool.type === 'text') {
    return hit?.type === 'text' ? CURSOR_TYPE.TEXT : CURSOR_TYPE.CROSSHAIR
  }

  if (appState.activeTool.type === 'selection') {
    if (appState.interaction === 'dragging') {
      return CURSOR_TYPE.GRABBING
    }

    if (appState.interaction === 'resizing') {
      return getCursorForResizingHandle(appState.resizeHandle)
    }

    if (x >= 0 && y >= 0 && getSelectedElementIds(appState.selectedElementIds).length === 1) {
      const selected = elements.find((element) => appState.selectedElementIds[element.id])
      const resizeHandle = selected ? getTransformHandleAtPosition(selected, x, y) : null
      if (resizeHandle) {
        return getCursorForResizingHandle(resizeHandle)
      }
    }

    if (hit) {
      return CURSOR_TYPE.MOVE
    }

    return CURSOR_TYPE.AUTO
  }

  return CURSOR_TYPE.CROSSHAIR
}
