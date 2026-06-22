import type { AssetElement } from './types'

// Step 5 (PR #283): immutable updates only — never mutate elements in place.
export function newElementWith<T extends AssetElement>(
  element: T,
  updates: Partial<T>,
): T {
  return {
    ...element,
    ...updates,
    version: element.version + 1,
  }
}