import type { CanvasRect } from '../../utils/geometry'

export type RectangleStrokeStyle = 'solid' | 'dashed' | 'dotted'

export type RectangleCornerRadius =
  | number
  | {
      topLeft: number
      topRight: number
      bottomRight: number
      bottomLeft: number
    }

export type RectangleShadow = {
  blur: number
  offsetX: number
  offsetY: number
  color: string
  opacity: number
}

export type RectangleGradientFill = {
  type: 'linear'
  angle: number
  stops: Array<{ offset: number; color: string }>
}

export type RectangleObject = {
  id: string
  x: number
  y: number
  width: number
  height: number
  fillColor: string
  fillOpacity: number
  strokeColor: string
  strokeWidth: number
  strokeStyle: RectangleStrokeStyle
  cornerRadius: RectangleCornerRadius
  rotation: number
  shadow: RectangleShadow | null
  blendMode: string
  gradientFill: RectangleGradientFill | null
}

export type RectangleToolState = {
  activeTool: 'select' | 'rectangle' | 'hand' | 'text' | 'frame' | 'diamond' | 'ellipse'
  rectangles: RectangleObject[]
  selectedIds: string[]
  canvasCursor: string
  isDrawing: boolean
  drawOrigin: { x: number; y: number } | null
  previewRect: CanvasRect | null
  showResizeHandles: boolean
  showRotationHandle: boolean
  showCornerRadiusHandles: boolean
  lastRenderTargets: string[]
}

export type DrawModifiers = {
  shiftKey?: boolean
  altKey?: boolean
}

export type RectangleToolAction =
  | { type: 'SELECT_TOOL'; tool: RectangleToolState['activeTool'] }
  | { type: 'KEY_R' }
  | { type: 'START_DRAW'; origin: { x: number; y: number } }
  | { type: 'UPDATE_PREVIEW'; point: { x: number; y: number }; modifiers?: DrawModifiers }
  | { type: 'FINISH_DRAW'; point: { x: number; y: number }; modifiers?: DrawModifiers }
  | { type: 'CANCEL_DRAW' }
  | { type: 'SELECT_RECTANGLE'; id: string }
  | { type: 'UPDATE_STYLE'; id?: string; patch: Partial<RectangleObject> }
  | { type: 'MOVE_RECTANGLE'; id: string; x: number; y: number }
  | { type: 'RESIZE_RECTANGLE'; id: string; width: number; height: number; lockAspectRatio?: boolean }
  | { type: 'SET_SIZE'; id: string; width: number; height: number }
  | { type: 'SET_POSITION'; id: string; x: number; y: number }
  | { type: 'DELETE_RECTANGLE'; id: string }
  | { type: 'DUPLICATE_RECTANGLE'; id: string }
  | { type: 'TOGGLE_ROUNDED_CORNERS'; id: string }
  | { type: 'ROTATE_RECTANGLE'; id: string; rotation: number }