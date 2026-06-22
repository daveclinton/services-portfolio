import { DEFAULT_CANVAS_BACKGROUND, DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import type { AppState } from './types'

export function getDefaultAppState(): AppState {
  return {
    activeTool: {
      type: 'selection',
      locked: false,
    },
    viewBackgroundColor: DEFAULT_CANVAS_BACKGROUND,
    currentItemStrokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
    currentItemBackgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
    currentItemStrokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
    selectedElementIds: {},
    newElement: null,
    pointerOrigin: null,
    interaction: 'idle',
    resizeHandle: null,
    originalElement: null,
    originalElements: null,
    selectionBox: null,
    selectionOriginIds: null,
    editingElementId: null,
    projectName: 'my-app',
    previewPlatform: 'ios',
    exportBackground: true,
    exportScale: 1,
  }
}
