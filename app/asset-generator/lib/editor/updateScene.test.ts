import { describe, expect, it } from 'vitest'
import { resetTestIds } from '../common/random'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { newRectangleElement } from '../element/newElement'
import {
  createInitialSnapshot,
  deleteSelectedElements,
  updateScene,
} from './updateScene'

const baseOpts = {
  strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
  backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
  strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
}

describe('updateScene', () => {
  it('creates a draft element on pointer down for shape tools', () => {
    resetTestIds()

    const snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'rectangle', locked: false },
      },
    })

    const next = updateScene(snapshot, {}, { phase: 'down', x: 100, y: 120 })

    expect(next.appState.newElement).toMatchObject({
      id: 'id0',
      type: 'rectangle',
      x: 100,
      y: 120,
    })
  })

  it('commits an element on pointer up', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'rectangle', locked: false },
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 100, y: 120 })
    snapshot = updateScene(snapshot, {}, { phase: 'move', x: 220, y: 260 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 220, y: 260 })

    expect(snapshot.elements).toHaveLength(1)
    expect(snapshot.elements[0]).toMatchObject({
      id: 'id0',
      type: 'rectangle',
      x: 100,
      y: 120,
      width: 120,
      height: 140,
    })
    expect(snapshot.appState.selectedElementIds[snapshot.elements[0].id]).toBe(true)
  })

  it('drags a selected element', () => {
    resetTestIds()

    const element = newRectangleElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 120,
      height: 80,
    })

    let snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        activeTool: { type: 'selection', locked: false },
        selectedElementIds: { [element.id]: true },
      },
      elements: [element],
    }

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 110, y: 110 })
    snapshot = updateScene(snapshot, {}, { phase: 'move', x: 150, y: 160 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 150, y: 160 })

    expect(snapshot.elements[0]).toMatchObject({
      x: 140,
      y: 150,
      width: 120,
      height: 80,
    })
  })

  it('deletes selected elements', () => {
    resetTestIds()

    const element = newRectangleElement({
      ...baseOpts,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })

    const snapshot = deleteSelectedElements({
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        selectedElementIds: { [element.id]: true },
      },
      elements: [element],
    })

    expect(snapshot.elements).toHaveLength(0)
    expect(snapshot.appState.selectedElementIds).toEqual({})
  })

  it('toggles selection with shift+click', () => {
    resetTestIds()

    const first = newRectangleElement({
      ...baseOpts,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
    const second = newRectangleElement({
      ...baseOpts,
      x: 200,
      y: 200,
      width: 100,
      height: 100,
    })

    let snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        activeTool: { type: 'selection' as const, locked: false },
        selectedElementIds: { [first.id]: true as const },
      },
      elements: [first, second],
    }

    snapshot = updateScene(
      snapshot,
      {},
      { phase: 'down', x: 250, y: 250, shiftKey: true },
    )

    expect(Object.keys(snapshot.appState.selectedElementIds)).toHaveLength(2)
    expect(snapshot.appState.selectedElementIds[first.id]).toBe(true)
    expect(snapshot.appState.selectedElementIds[second.id]).toBe(true)

    snapshot = updateScene(
      snapshot,
      {},
      { phase: 'down', x: 50, y: 50, shiftKey: true },
    )

    expect(snapshot.appState.selectedElementIds[first.id]).toBeUndefined()
    expect(snapshot.appState.selectedElementIds[second.id]).toBe(true)
  })

  it('drags multiple selected elements together', () => {
    resetTestIds()

    const first = newRectangleElement({
      ...baseOpts,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
    const second = newRectangleElement({
      ...baseOpts,
      x: 200,
      y: 200,
      width: 100,
      height: 100,
    })

    let snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        activeTool: { type: 'selection' as const, locked: false },
        selectedElementIds: {
          [first.id]: true as const,
          [second.id]: true as const,
        },
      },
      elements: [first, second],
    }

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 50, y: 50 })
    snapshot = updateScene(snapshot, {}, { phase: 'move', x: 90, y: 90 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 90, y: 90 })

    expect(snapshot.elements[0]).toMatchObject({ x: 40, y: 40 })
    expect(snapshot.elements[1]).toMatchObject({ x: 240, y: 240 })
  })
})