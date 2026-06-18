import { describe, expect, it } from 'vitest'
import { createInitialTextToolState, textToolReducer } from '../../lib/text-tool'
import { createTextPoint, runTextToolActions } from '../../testing/text-tool-helpers'

describe('Text Tool – 8. Performance & Scalability', () => {
  it('8.1 creating 100 text objects stays under 100ms per object on average', () => {
    const start = performance.now()
    let state = createInitialTextToolState()

    for (let index = 0; index < 100; index += 1) {
      state = textToolReducer(state, { type: 'KEY_T' })
      state = textToolReducer(state, {
        type: 'CANVAS_POINTER_DOWN',
        point: { x: index * 48, y: index * 32 },
      })
      state = textToolReducer(state, { type: 'KEY_ESCAPE' })
    }

    const elapsed = performance.now() - start
    const perObject = elapsed / 100

    expect(state.textObjects).toHaveLength(100)
    expect(perObject).toBeLessThan(100)
  })

  it('8.2 typing 500 characters remains responsive', () => {
    const start = performance.now()
    let state = createTextPoint(createInitialTextToolState(), { x: 0, y: 0 })

    for (let index = 0; index < 500; index += 1) {
      state = textToolReducer(state, { type: 'INSERT_TEXT', value: 'a' })
    }

    const elapsed = performance.now() - start

    expect(state.textObjects[0].text).toHaveLength(500)
    expect(elapsed).toBeLessThan(250)
  })

  it('8.3 batch formatting many selected text objects is fast', () => {
    let state = createInitialTextToolState()
    const ids: string[] = []

    for (let index = 0; index < 50; index += 1) {
      state = textToolReducer(state, { type: 'KEY_T' })
      state = textToolReducer(state, {
        type: 'CANVAS_POINTER_DOWN',
        point: { x: index * 48, y: index * 32 },
      })
      ids.push(state.textObjects[state.textObjects.length - 1].id)
      state = textToolReducer(state, { type: 'KEY_ESCAPE' })
    }

    expect(state.textObjects).toHaveLength(50)

    const start = performance.now()
    const updated = textToolReducer(state, {
      type: 'BATCH_UPDATE_STYLE',
      ids,
      patch: { fontSize: 18, color: '#123456' },
    })
    const elapsed = performance.now() - start

    expect(updated.textObjects.every((object) => object.fontSize === 18)).toBe(true)
    expect(elapsed).toBeLessThan(50)
  })

  it('8.4 moving many text objects stays under budget', () => {
    let state = createInitialTextToolState()

    for (let index = 0; index < 100; index += 1) {
      state = textToolReducer(state, { type: 'KEY_T' })
      state = textToolReducer(state, {
        type: 'CANVAS_POINTER_DOWN',
        point: { x: index * 48, y: index * 32 },
      })
      state = textToolReducer(state, { type: 'KEY_ESCAPE' })
    }

    const start = performance.now()
    state = {
      ...state,
      textObjects: state.textObjects.map((object, index) => ({
        ...object,
        x: object.x + 10,
        y: object.y + 10,
      })),
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(20)
  })

  it('8.5 style updates only mark affected text for re-render', () => {
    const state = runTextToolActions(createTextPoint(createInitialTextToolState(), { x: 0, y: 0 }), [
      { type: 'INSERT_TEXT', value: 'one' },
      { type: 'KEY_ESCAPE' },
      { type: 'UPDATE_STYLE', patch: { color: '#00ff00' } },
    ])

    expect(state.lastRenderTargets).toEqual([state.textObjects[0].id])
  })

  it('8.6 repeated select/edit interactions remain responsive', () => {
    let state = createTextPoint(createInitialTextToolState(), { x: 0, y: 0 })
    const id = state.textObjects[0].id
    const start = performance.now()

    for (let index = 0; index < 200; index += 1) {
      state = textToolReducer(state, { type: 'DOUBLE_CLICK_TEXT', id })
      state = textToolReducer(state, { type: 'INSERT_TEXT', value: 'x' })
      state = textToolReducer(state, { type: 'KEY_ESCAPE' })
      state = textToolReducer(state, { type: 'SELECT_TEXT', id })
    }

    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(300)
  })

  it('8.7 mixed canvas with 200 objects keeps text editing usable', () => {
    let state = createInitialTextToolState()

    for (let index = 0; index < 200; index += 1) {
      state = textToolReducer(state, { type: 'KEY_T' })
      state = textToolReducer(state, {
        type: 'CANVAS_POINTER_DOWN',
        point: { x: (index % 20) * 60, y: Math.floor(index / 20) * 50 },
      })
      state = textToolReducer(state, { type: 'KEY_ESCAPE' })
    }

    expect(state.textObjects).toHaveLength(200)

    const start = performance.now()
    const target = state.textObjects[150].id
    const edited = runTextToolActions(state, [
      { type: 'DOUBLE_CLICK_TEXT', id: target },
      { type: 'INSERT_TEXT', value: 'still fast' },
    ])
    const elapsed = performance.now() - start

    expect(edited.isEditing).toBe(true)
    expect(edited.textObjects[150].text).toContain('still fast')
    expect(elapsed).toBeLessThan(50)
  })
})