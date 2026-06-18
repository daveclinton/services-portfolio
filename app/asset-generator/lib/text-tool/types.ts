export type EditorTool = 'select' | 'hand' | 'text' | 'frame' | 'rectangle' | 'diamond' | 'ellipse'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize'

export type TextDecoration = 'none' | 'underline' | 'strikethrough'

export type CanvasPoint = { x: number; y: number }

export type TextObject = {
  id: string
  text: string
  x: number
  y: number
  /** null = inline text point (auto width) */
  width: number | null
  height: number | null
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  color: string
  textAlign: TextAlign
  lineHeight: number
  letterSpacing: number
  textTransform: TextTransform
  decoration: TextDecoration
  bold: boolean
  italic: boolean
  underline: boolean
}

export type TextToolState = {
  activeTool: EditorTool
  textObjects: TextObject[]
  selectedIds: string[]
  isEditing: boolean
  editingId: string | null
  selectionStart: number
  selectionEnd: number
  canvasCursor: string
  showBaselineGuides: boolean
  showDimensionIndicators: boolean
  showSelectionHighlight: boolean
  showBoundingBox: boolean
  showResizeHandles: boolean
  pendingTextBoxDrag: { origin: CanvasPoint } | null
  lastRenderTargets: string[]
}

export type TextToolAction =
  | { type: 'SELECT_TOOL'; tool: EditorTool }
  | { type: 'KEY_T' }
  | { type: 'CANVAS_POINTER_DOWN'; point: CanvasPoint; isDoubleClick?: boolean }
  | { type: 'CANVAS_POINTER_UP'; point: CanvasPoint }
  | { type: 'CANVAS_CLICK_OUTSIDE' }
  | { type: 'KEY_ESCAPE' }
  | { type: 'INSERT_TEXT'; value: string }
  | { type: 'BACKSPACE' }
  | { type: 'DELETE' }
  | { type: 'SET_SELECTION'; start: number; end: number }
  | { type: 'TOGGLE_BOLD' }
  | { type: 'TOGGLE_ITALIC' }
  | { type: 'TOGGLE_UNDERLINE' }
  | { type: 'UPDATE_STYLE'; id?: string; patch: Partial<TextObject> }
  | { type: 'MOVE_TEXT'; id: string; x: number; y: number }
  | { type: 'RESIZE_TEXT'; id: string; width: number; height: number }
  | { type: 'DELETE_TEXT'; id: string }
  | { type: 'SELECT_TEXT'; id: string }
  | { type: 'DOUBLE_CLICK_TEXT'; id: string }
  | { type: 'BATCH_UPDATE_STYLE'; ids: string[]; patch: Partial<TextObject> }
  | { type: 'MARK_RENDER_TARGETS'; ids: string[] }