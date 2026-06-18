import {
  createInitialRectangleToolState,
  rectangleToolReducer,
  reduceRectangleTool,
  type RectangleToolAction,
  type RectangleToolState,
} from '../lib/rectangle-tool'

export function runRectangleActions(state: RectangleToolState, actions: RectangleToolAction[]) {
  return reduceRectangleTool(state, ...actions)
}

export function activateRectangleTool(state = createInitialRectangleToolState()) {
  return rectangleToolReducer(state, { type: 'KEY_R' })
}

export function drawRectangle(
  state: RectangleToolState,
  origin: { x: number; y: number },
  end: { x: number; y: number },
  modifiers?: { shiftKey?: boolean; altKey?: boolean },
) {
  return runRectangleActions(activateRectangleTool(state), [
    { type: 'START_DRAW', origin },
    { type: 'FINISH_DRAW', point: end, modifiers },
  ])
}

export function getSelectedRectangle(state: RectangleToolState) {
  const id = state.selectedIds[0]
  return state.rectangles.find((rectangle) => rectangle.id === id) ?? null
}

export { createInitialRectangleToolState }