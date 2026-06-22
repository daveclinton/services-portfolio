import type { PreviewPlatform } from '../common/exportPresets'
import type { AssetElement, ToolType } from '../element/types'
import type { TransformHandleDirection } from '../element/transformHandles'

export type ActiveTool = {
  type: ToolType
  locked: boolean
}

export type InteractionMode = 'idle' | 'drawing' | 'dragging' | 'resizing' | 'marquee'

export type SelectionBox = {
  x: number
  y: number
  width: number
  height: number
}

export type AssetFile = {
  mimeType: string
  dataURL: string
  width: number
  height: number
}

export type AppState = {
  activeTool: ActiveTool
  viewBackgroundColor: string
  currentItemStrokeColor: string
  currentItemBackgroundColor: string
  currentItemStrokeWidth: number
  selectedElementIds: Record<string, true>
  newElement: AssetElement | null
  pointerOrigin: { x: number; y: number } | null
  interaction: InteractionMode
  resizeHandle: TransformHandleDirection | null
  originalElement: AssetElement | null
  originalElements: Record<string, AssetElement> | null
  selectionBox: SelectionBox | null
  selectionOriginIds: Record<string, true> | null
  editingElementId: string | null
  projectName: string
  previewPlatform: PreviewPlatform
  exportBackground: boolean
  exportScale: number
}

export type EditorSnapshot = {
  appState: AppState
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
}

export type SceneUpdate = {
  elements?: readonly AssetElement[]
  files?: Record<string, AssetFile>
  appState?: Partial<AppState>
}

export type PointerPayload = {
  phase: 'down' | 'move' | 'up'
  x: number
  y: number
  shiftKey?: boolean
}
