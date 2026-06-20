import type { EditorState } from '../types'

export function createDefaultEditorState(): EditorState {
  return {
    activeTool: 'select',
    selectedLayerIds: ['background'],
  }
}