import type { AssetFile, SelectionBox } from '../editor/types'
import type { AssetElement } from '../element/types'

export type StaticSceneRenderConfig = {
  canvas: HTMLCanvasElement
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
  backgroundColor: string
  selectedElementIds: Record<string, true>
  draftElement: AssetElement | null
  selectionBox: SelectionBox | null
  editingElementId?: string | null
  showGuides: boolean
  safeAreaViolationIds?: Record<string, true>
}

export type ExportSceneConfig = {
  elements: readonly AssetElement[]
  files: Record<string, AssetFile>
  backgroundColor: string
  exportSize: number
}
