export const ICON_SIZE = 1024
export const SAFE_AREA_SIZE = 820
export const ICON_RADIUS = 226
export const MIN_ELEMENT_SIZE = 8

export const MIN_TEXT_WIDTH = 240
export const MIN_TEXT_HEIGHT = 96
export const TEXT_LINE_HEIGHT = 1.1
export const TEXT_DRAG_THRESHOLD = 36
export const TEXT_CLICK_THRESHOLD = 4
export const SELECTION_DRAG_THRESHOLD = 4

// Touch double-tap to edit text: two taps within this time + proximity window.
export const TOUCH_DOUBLE_TAP_TIMEOUT = 300
export const TOUCH_DOUBLE_TAP_DISTANCE = 35

export const CURSOR_TYPE = {
  TEXT: 'text',
  CROSSHAIR: 'crosshair',
  GRABBING: 'grabbing',
  GRAB: 'grab',
  POINTER: 'pointer',
  MOVE: 'move',
  AUTO: '',
} as const

export const EXPORT_SIZES = [
  { label: 'App Store', size: 1024 },
  { label: 'iPad', size: 512 },
  { label: 'iPhone', size: 180 },
  { label: 'Notification', size: 60 },
] as const

export const MIME_TYPES = {
  png: 'image/png',
} as const
