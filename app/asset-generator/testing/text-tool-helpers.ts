import {
  createInitialTextToolState,
  reduceTextTool,
  textToolReducer,
  TEXT_TOOL_DEFAULTS,
  type TextToolAction,
  type TextToolState,
} from '../lib/text-tool'

export function runTextToolActions(state: TextToolState, actions: TextToolAction[]) {
  return reduceTextTool(state, ...actions)
}

export function activateTextTool(state = createInitialTextToolState()) {
  return textToolReducer(state, { type: 'KEY_T' })
}

export function createTextPoint(state: TextToolState, point: { x: number; y: number }) {
  return reduceTextTool(activateTextTool(state), {
    type: 'CANVAS_POINTER_DOWN',
    point,
  })
}

export function createTextBox(
  state: TextToolState,
  origin: { x: number; y: number },
  end: { x: number; y: number },
) {
  const afterDown = reduceTextTool(activateTextTool(state), {
    type: 'CANVAS_POINTER_DOWN',
    point: origin,
  })
  return textToolReducer(afterDown, { type: 'CANVAS_POINTER_UP', point: end })
}

export function getEditingObject(state: TextToolState) {
  return state.textObjects.find((object) => object.id === state.editingId) ?? null
}

export function getSelectedObject(state: TextToolState) {
  const id = state.selectedIds[0]
  return state.textObjects.find((object) => object.id === id) ?? null
}

export { createInitialTextToolState, TEXT_TOOL_DEFAULTS }