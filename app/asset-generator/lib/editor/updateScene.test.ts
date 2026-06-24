import { describe, expect, it } from 'vitest'
import { resetTestIds } from '../common/random'
import { DEFAULT_ELEMENT_PROPS } from '../common/defaults'
import { MIN_TEXT_HEIGHT, MIN_TEXT_WIDTH } from '../common/constants'
import { newRectangleElement, newTextElement } from '../element/newElement'
import {
  createInitialSnapshot,
  deleteSelectedElements,
  duplicateSelectedElements,
  nudgeSelectedElements,
  selectElementForContextMenu,
  updateElementInScene,
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
    expect(snapshot.appState.activeTool.type).toBe('selection')
  })

  it('keeps a locked shape tool active after commit', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'rectangle', locked: true },
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 100, y: 120 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 220, y: 260 })

    expect(snapshot.elements).toHaveLength(1)
    expect(snapshot.appState.activeTool).toEqual({ type: 'rectangle', locked: true })
  })

  it('locks shape aspect ratio while drawing with shift', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'ellipse', locked: false },
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 100, y: 120 })
    snapshot = updateScene(snapshot, {}, { phase: 'move', x: 180, y: 260, shiftKey: true })

    expect(snapshot.appState.newElement).toMatchObject({
      type: 'ellipse',
      x: 100,
      y: 120,
      width: 140,
      height: 140,
    })

    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 180, y: 260, shiftKey: true })

    expect(snapshot.elements[0]).toMatchObject({
      type: 'ellipse',
      x: 100,
      y: 120,
      width: 140,
      height: 140,
    })
  })

  it('draws shapes from center while holding alt', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'diamond', locked: false },
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 300, y: 300 })
    snapshot = updateScene(snapshot, {}, { phase: 'move', x: 360, y: 340, altKey: true })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 360, y: 340, altKey: true })

    expect(snapshot.elements[0]).toMatchObject({
      type: 'diamond',
      x: 240,
      y: 260,
      width: 120,
      height: 80,
    })
  })

  it('combines shift and alt while drawing centered shapes', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'rectangle', locked: false },
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 300, y: 300 })
    snapshot = updateScene(
      snapshot,
      {},
      { phase: 'up', x: 360, y: 340, shiftKey: true, altKey: true },
    )

    expect(snapshot.elements[0]).toMatchObject({
      x: 240,
      y: 240,
      width: 120,
      height: 120,
    })
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

  it('keeps a selected element still until the drag threshold is crossed', () => {
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
    snapshot = updateScene(snapshot, {}, { phase: 'move', x: 113, y: 112 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 113, y: 112 })

    expect(snapshot.elements[0]).toMatchObject({
      x: 100,
      y: 100,
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

  it('duplicates selected elements with new ids and offset positions', () => {
    resetTestIds()

    const element = newRectangleElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 120,
      height: 80,
    })

    const snapshot = duplicateSelectedElements({
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        selectedElementIds: { [element.id]: true },
      },
      elements: [element],
    })

    expect(snapshot.elements).toHaveLength(2)
    expect(snapshot.elements[1]).toMatchObject({
      id: 'id1',
      x: 124,
      y: 124,
      width: 120,
      height: 80,
    })
    expect(snapshot.appState.selectedElementIds).toEqual({ id1: true })
  })

  it('nudges selected elements by a precise delta', () => {
    resetTestIds()

    const selected = newRectangleElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 120,
      height: 80,
    })
    const other = newRectangleElement({
      ...baseOpts,
      x: 300,
      y: 300,
      width: 120,
      height: 80,
    })

    const snapshot = nudgeSelectedElements(
      {
        ...createInitialSnapshot(),
        appState: {
          ...createInitialSnapshot().appState,
          selectedElementIds: { [selected.id]: true },
        },
        elements: [selected, other],
      },
      10,
      -1,
    )

    expect(snapshot.elements[0]).toMatchObject({ x: 110, y: 99 })
    expect(snapshot.elements[1]).toMatchObject({ x: 300, y: 300 })
    expect(snapshot.appState.selectedElementIds).toEqual({ [selected.id]: true })
  })

  it('selects the right-clicked element before opening an element context menu', () => {
    resetTestIds()

    const first = newRectangleElement({
      ...baseOpts,
      x: 20,
      y: 20,
      width: 100,
      height: 100,
    })
    const second = newRectangleElement({
      ...baseOpts,
      x: 220,
      y: 220,
      width: 100,
      height: 100,
    })

    const snapshot = selectElementForContextMenu(
      {
        ...createInitialSnapshot(),
        appState: {
          ...createInitialSnapshot().appState,
          selectedElementIds: { [first.id]: true },
        },
        elements: [first, second],
      },
      240,
      240,
    )

    expect(snapshot.appState.selectedElementIds).toEqual({ [second.id]: true })
  })

  it('preserves selection when opening the canvas context menu', () => {
    resetTestIds()

    const element = newRectangleElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 120,
      height: 80,
    })

    const snapshot = selectElementForContextMenu(
      {
        ...createInitialSnapshot(),
        appState: {
          ...createInitialSnapshot().appState,
          selectedElementIds: { [element.id]: true },
        },
        elements: [element],
      },
      10,
      10,
    )

    expect(snapshot.appState.selectedElementIds).toEqual({ [element.id]: true })
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

  it('deselects selected elements on empty canvas click', () => {
    resetTestIds()

    const element = newRectangleElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 120,
      height: 80,
    })

    const snapshot = updateScene(
      {
        ...createInitialSnapshot(),
        appState: {
          ...createInitialSnapshot().appState,
          activeTool: { type: 'selection' as const, locked: false },
          selectedElementIds: { [element.id]: true as const },
        },
        elements: [element],
      },
      {},
      { phase: 'down', x: 10, y: 10 },
    )

    expect(snapshot.appState.selectedElementIds).toEqual({})
  })

  it('selects elements inside an empty-canvas marquee', () => {
    resetTestIds()

    const first = newRectangleElement({
      ...baseOpts,
      x: 40,
      y: 40,
      width: 100,
      height: 100,
    })
    const second = newRectangleElement({
      ...baseOpts,
      x: 220,
      y: 220,
      width: 100,
      height: 100,
    })
    const outside = newRectangleElement({
      ...baseOpts,
      x: 500,
      y: 500,
      width: 100,
      height: 100,
    })

    let snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        activeTool: { type: 'selection' as const, locked: false },
      },
      elements: [first, second, outside],
    }

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 10, y: 10 })
    snapshot = updateScene(snapshot, {}, { phase: 'move', x: 360, y: 360 })

    expect(snapshot.appState.selectionBox).toEqual({
      x: 10,
      y: 10,
      width: 350,
      height: 350,
    })
    expect(snapshot.appState.selectedElementIds).toEqual({
      [first.id]: true,
      [second.id]: true,
    })

    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 360, y: 360 })

    expect(snapshot.appState.selectionBox).toBeNull()
    expect(snapshot.appState.selectedElementIds[outside.id]).toBeUndefined()
    expect(Object.keys(snapshot.appState.selectedElementIds)).toHaveLength(2)
  })

  it('adds to the current selection with shift+marquee', () => {
    resetTestIds()

    const existing = newRectangleElement({
      ...baseOpts,
      x: 40,
      y: 40,
      width: 100,
      height: 100,
    })
    const next = newRectangleElement({
      ...baseOpts,
      x: 220,
      y: 220,
      width: 100,
      height: 100,
    })

    let snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        activeTool: { type: 'selection' as const, locked: false },
        selectedElementIds: { [existing.id]: true as const },
      },
      elements: [existing, next],
    }

    snapshot = updateScene(
      snapshot,
      {},
      { phase: 'down', x: 200, y: 200, shiftKey: true },
    )
    snapshot = updateScene(
      snapshot,
      {},
      { phase: 'move', x: 360, y: 360, shiftKey: true },
    )
    snapshot = updateScene(
      snapshot,
      {},
      { phase: 'up', x: 360, y: 360, shiftKey: true },
    )

    expect(snapshot.appState.selectedElementIds).toEqual({
      [existing.id]: true,
      [next.id]: true,
    })
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

  it('creates text on pointer up and opens the editor', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'text', locked: false },
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 400, y: 500 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 400, y: 500 })

    expect(snapshot.elements).toHaveLength(1)
    expect(snapshot.elements[0]).toMatchObject({
      type: 'text',
      text: '',
      width: MIN_TEXT_WIDTH,
      height: 106,
    })
    expect(snapshot.appState.activeTool.type).toBe('selection')
    expect(snapshot.appState.editingElementId).toBe(snapshot.elements[0].id)
  })

  it('uses the current font size for new text placements', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'text', locked: false },
        currentItemFontSize: 96,
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 400, y: 500 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 400, y: 500 })

    expect(snapshot.elements[0]).toMatchObject({
      type: 'text',
      fontSize: 96,
      height: 106,
    })
  })

  it('uses the current font family for new text placements', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'text', locked: false },
        currentItemFontFamily: 'code',
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 400, y: 500 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 400, y: 500 })

    expect(snapshot.elements[0]).toMatchObject({
      type: 'text',
      fontFamily: 'code',
    })
  })

  it('uses the current font style for new text placements', () => {
    resetTestIds()

    let snapshot = updateScene(createInitialSnapshot(), {
      appState: {
        activeTool: { type: 'text', locked: false },
        currentItemFontStyle: 'bold-italic',
      },
    })

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 400, y: 500 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 400, y: 500 })

    expect(snapshot.elements[0]).toMatchObject({
      type: 'text',
      fontStyle: 'bold-italic',
    })
  })

  it('remeasures text elements when the draft text changes', () => {
    resetTestIds()

    const text = newTextElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: MIN_TEXT_WIDTH,
      height: MIN_TEXT_HEIGHT,
      fontSize: 64,
      text: '',
    })

    const snapshot = updateElementInScene(
      {
        ...createInitialSnapshot(),
        elements: [text],
      },
      text.id,
      { text: 'ABCDEFGHIJ\nB' },
    )

    expect(snapshot.elements[0]).toMatchObject({
      text: 'ABCDEFGHIJ\nB',
      width: 397,
      height: 141,
    })
  })

  it('keeps an already-selected text label selected on mouse click', () => {
    resetTestIds()

    const text = newTextElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 240,
      height: 96,
      text: 'Logo',
    })

    let snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        activeTool: { type: 'selection' as const, locked: false },
        selectedElementIds: { [text.id]: true as const },
      },
      elements: [text],
    }

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 120, y: 120 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 120, y: 120 })

    expect(snapshot.appState.editingElementId).toBeNull()
    expect(snapshot.appState.selectedElementIds).toEqual({ [text.id]: true })
  })

  it('requires touch double-tap before editing selected text', () => {
    resetTestIds()

    const text = newTextElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 240,
      height: 96,
      text: 'Logo',
    })

    let snapshot = {
      ...createInitialSnapshot(),
      appState: {
        ...createInitialSnapshot().appState,
        activeTool: { type: 'selection' as const, locked: false },
        selectedElementIds: { [text.id]: true as const },
      },
      elements: [text],
    }

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 120, y: 120 })
    snapshot = updateScene(snapshot, {}, { phase: 'up', x: 120, y: 120, pointerType: 'touch' })

    expect(snapshot.appState.editingElementId).toBeNull()

    snapshot = updateScene(snapshot, {}, { phase: 'down', x: 120, y: 120 })
    snapshot = updateScene(snapshot, {}, {
      phase: 'up',
      x: 120,
      y: 120,
      pointerType: 'touch',
      isTouchDoubleTap: true,
    })

    expect(snapshot.appState.editingElementId).toBe(text.id)
  })

  it('edits existing text immediately when the text tool hits a label', () => {
    resetTestIds()

    const text = newTextElement({
      ...baseOpts,
      x: 100,
      y: 100,
      width: 240,
      height: 96,
      text: 'Logo',
    })

    const snapshot = updateScene(
      {
        ...createInitialSnapshot(),
        appState: {
          ...createInitialSnapshot().appState,
          activeTool: { type: 'text' as const, locked: false },
        },
        elements: [text],
      },
      {},
      { phase: 'down', x: 120, y: 120 },
    )

    expect(snapshot.appState.activeTool.type).toBe('selection')
    expect(snapshot.appState.editingElementId).toBe(text.id)
  })
})
