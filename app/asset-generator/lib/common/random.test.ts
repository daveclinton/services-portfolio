import { afterEach, describe, expect, it } from 'vitest'
import { randomId, resetTestIds } from './random'

afterEach(() => {
  resetTestIds()
})

describe('randomId', () => {
  it('returns stable ids in test environments', () => {
    expect(randomId()).toBe('id0')
    expect(randomId()).toBe('id1')
  })
})