import type { EditorTool } from '../types'

export function isTextTool(tool: EditorTool): tool is 'text' {
  return tool === 'text'
}