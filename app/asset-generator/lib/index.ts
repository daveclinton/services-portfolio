/**
 * Asset generator foundations — built in the same order Excalidraw was.
 *
 * Step 1 (2020-01-01): elements[] + canvas pointer handlers
 * Step 2 (PR #1):       selection tool
 * Step 3 (PR #207):     extract element/ module (newElement, types, bounds)
 * Step 4 (PR #236):     element IDs via nanoid
 * Step 5 (PR #283):     immutable element updates (newElementWith only)
 * Step 6:               scene renderer (renderStaticScene)
 * Step 7 (PR #31):      PNG export
 * Step 8 (Phase 2):     drag, resize handles, inline text edit, delete
 * Step 9 (Phase 3):     live preview, safe-area warnings, export presets
 * Step 10 (Phase 4):    undo/redo, z-order, save/load JSON
 */
export * as common from './common'
export * as element from './element'
export * as scene from './scene'
export * as editor from './editor'
export * as utils from './utils'