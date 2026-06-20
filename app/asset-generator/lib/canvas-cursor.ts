import { isShapeTool } from './shape-tool'
import type { DesignLayer, EditorState } from '../types'

export function getCanvasCursorClass(
  activeTool: EditorState['activeTool'],
  selectedLayerIds: DesignLayer['id'][],
) {
  if (activeTool === 'text') return 'is-text-tool-active'
  if (isShapeTool(activeTool)) return 'is-shape-tool-active'
  if (activeTool !== 'select') return ''

  const primarySelection = selectedLayerIds[0] ?? 'background'

  if (primarySelection === 'text') return 'is-text-selected'
  if (primarySelection === 'background') return 'is-canvas-selected'
  return 'is-shape-selected'
}