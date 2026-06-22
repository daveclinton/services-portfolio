import { describe, expect, it } from 'vitest'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { resetTestIds } from '../common/random'
import { newRectangleElement } from '../element/newElement'
import {
  createHistorySnapshot,
  createInitialEditorState,
  pushUndo,
  redo,
  undo,
} from './history'
import { createInitialSnapshot } from './updateScene'

const baseOpts = {
  strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
  backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
  strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
}

describe('history', () => {
  it('undoes and redoes element changes', () => {
    resetTestIds()

    let state = createInitialEditorState()
    const emptySnapshot = createHistorySnapshot(state.present)

    const withElement = {
      ...state.present,
      elements: [newRectangleElement({ ...baseOpts, x: 10, y: 10, width: 40, height: 40 })],
    }

    state = {
      ...pushUndo(state, state.present),
      present: withElement,
    }

    expect(state.present.elements).toHaveLength(1)
    expect(state.undoStack).toHaveLength(1)
    expect(createHistorySnapshot(state.present)).not.toEqual(emptySnapshot)

    state = undo(state)
    expect(state.present.elements).toHaveLength(0)
    expect(state.redoStack).toHaveLength(1)

    state = redo(state)
    expect(state.present.elements).toHaveLength(1)
  })
})