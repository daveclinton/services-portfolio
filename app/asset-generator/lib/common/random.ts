import { nanoid } from 'nanoid'
import { isTestEnv } from './env'

let testIdBase = 0

// Excalidraw commit 4b7eb2f0 — generate IDs using nanoid, stable IDs in tests.
export function randomId() {
  return isTestEnv() ? `id${testIdBase++}` : nanoid()
}

// Excalidraw src/random.ts — seed shapes so renders stay stable.
export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31)
}

export function resetTestIds() {
  testIdBase = 0
}