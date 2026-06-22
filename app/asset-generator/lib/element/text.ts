import {
  MIN_TEXT_HEIGHT,
  MIN_TEXT_WIDTH,
  TEXT_LINE_HEIGHT,
} from '../common/constants'
import { DEFAULT_FONT_SIZE } from '../common/defaults'
import { getElementAtPosition } from './selection'
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

export function getCanvasCursor(
  appState: AppState,
  elements: readonly AssetElement[],
  x: number,
  y: number,
) {
  if (appState.editingElementId) {
    return 'default'
  }

  const hit = x >= 0 && y >= 0 ? getElementAtPosition(elements, x, y) : null

  if (appState.activeTool.type === 'text') {
    return hit?.type === 'text' ? 'text' : 'crosshair'
  }

  if (appState.activeTool.type === 'selection') {
    if (hit && appState.selectedElementIds[hit.id]) {
      return 'move'
    }

    if (hit) {
      return 'pointer'
    }

    return 'default'
  }

  return 'crosshair'
}