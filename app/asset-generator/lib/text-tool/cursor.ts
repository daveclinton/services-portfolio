import type { EditorTool } from './types'

export const CURSOR_TEXT = 'text'
export const CURSOR_DEFAULT = 'default'
export const CURSOR_MOVE = 'move'

export function getCanvasCursorForTool(tool: EditorTool): string {
  if (tool === 'text') return CURSOR_TEXT
  if (tool === 'hand') return 'grab'
  if (tool === 'select') return CURSOR_DEFAULT
  return 'crosshair'
}