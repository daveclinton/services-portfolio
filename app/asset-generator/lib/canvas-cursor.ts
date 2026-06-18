export function getCanvasCursorClass(
  activeTool: string,
  selectedLayerId: string,
  isEditingText: boolean,
) {
  if (activeTool === 'text') return 'is-text-tool-active'
  if (activeTool === 'rectangle' || activeTool === 'diamond' || activeTool === 'ellipse' || activeTool === 'frame') {
    return 'is-shape-tool-active'
  }
  if (selectedLayerId === 'text' && !isEditingText) return 'is-text-selected'
  if (selectedLayerId === 'background') return 'is-canvas-selected'
  return undefined
}