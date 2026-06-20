import type { EditorTool, ShapeType } from '../types'

export function isShapeTool(tool: EditorTool): tool is ShapeType {
  return tool === 'rectangle' || tool === 'diamond' || tool === 'ellipse'
}