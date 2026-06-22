# Asset Generator — Excalidraw Borrow Instructions

Use this doc when continuing the asset generator. The goal is **not** to replay every Excalidraw PR — it is to borrow proven interaction patterns from Excalidraw (`/Users/daveclintonn/Desktop/excalidraw`) while keeping the scope focused on a 1024×1024 app-icon editor.

---

## Project context

```
app/asset-generator/
├── components/     # React UI (AssetGenerator, StaticCanvas, TextEditor, …)
├── lib/
│   ├── common/     # constants, defaults, export presets, safe area
│   ├── element/    # types, newElement, selection, transform, zOrder, text
│   ├── scene/      # renderElement, staticScene, export, preview, imageCache
│   ├── editor/     # appState, updateScene, useEditor, history
│   ├── data/       # json save/load, image import
│   └── utils/      # PNG export
```

**Data flow:** `elements[]` + `files{}` + `appState` → `updateScene()` → `renderStaticScene()` → export uses the same renderer.

**Commands:**

```bash
cd /Users/daveclintonn/Desktop/services-portfolio
pnpm dev                    # → /asset-generator
pnpm test:run app/asset-generator
pnpm build
```

---

## Completed (borrowed from Excalidraw)

### Foundations
- Element model, nanoid IDs, immutable `newElementWith`
- Scene renderer + PNG export sharing one code path
- Undo/redo, z-order, JSON save/load (v2 with embedded images)

### Image import + multi-select
- Import image → centered on canvas, stored in `files{}`
- Shift+click toggle selection, group drag, resize handles only when 1 selected

### Text tool (reviewed + aligned)
Borrowed from `packages/excalidraw/components/App.tsx`, `wysiwyg/textWysiwyg.tsx`, `packages/element/src/dragElements.ts`, `cursor.ts`:

| Pattern | Status |
|---------|--------|
| Click-to-place, editor opens on pointer up | Done |
| Switch to selection tool after placing | Done |
| Text tool + click existing label → edit immediately | Done |
| Second click on selected text (no drag) → edit | Done |
| Double-click edit (selection tool only) | Done |
| Enter on selected text → edit | Done |
| Cursor: crosshair / text / move / pointer | Done |
| Hide canvas text while editing | Done |
| Transparent WYSIWYG overlay | Done |
| Escape / Cmd+Enter commit + re-select | Done |
| Empty whitespace commit → delete element | Done |
| Horizontal drag > 36px sets fixed width | Done |

**Key files:** `lib/editor/updateScene.ts`, `lib/element/text.ts`, `components/TextEditor.tsx`, `components/canvases/StaticCanvas.tsx`

---

## Recommended next steps (borrow from Excalidraw)

Work through these **in order**. For each tool, read the Excalidraw source first, then implement the minimal subset needed for app icons.

### Phase A — Selection tool review

**Excalidraw refs:** `App.tsx` (`handleSelectionOnPointerDown`, `handleSelectionOnPointerUp`), `cursor.ts`, `packages/element/src/selection.ts`

| # | Borrow | Why |
|---|--------|-----|
| A1 | **Drag threshold** — only start drag after ~4px movement; sub-threshold = click | Prevents accidental drags when selecting |
| A2 | **Cursor while dragging** — `grabbing` during active drag | Clear affordance |
| A3 | **Marquee / box selection** (optional) — drag on empty canvas draws selection rect | Standard multi-select UX; skip if scope is tight |
| A4 | **Click outside canvas** — deselect (already partial; verify all UI paths) | Matches Excalidraw deselect behavior |
| A5 | **Suppress handles during multi-select** | Already done; add test coverage |
| A6 | **Hit-test priority** — top-most element, consistent with z-order | Verify matches Excalidraw `getElementAtPosition` semantics |

**Touch files:** `lib/editor/updateScene.ts`, `lib/element/selection.ts`, `lib/element/text.ts` (`getCanvasCursor`), `components/canvases/StaticCanvas.tsx`

**Tests to add:** drag-threshold click vs drag, cursor states, deselect on empty click

---

### Phase B — Shape tools (rectangle, ellipse, diamond)

**Excalidraw refs:** `App.tsx` (`createGenericElementOnPointerDown`), `packages/element/src/newElement.ts`, `packages/element/src/dragElements.ts`, `transformHandles.ts`

| # | Borrow | Why |
|---|--------|-----|
| B1 | **Minimum size on commit** — discard or snap tiny shapes (already `MIN_ELEMENT_SIZE`; verify UX) | Avoid invisible 1×1 elements |
| B2 | **Alt/Option key** — draw from center (Excalidraw `altKey` in `normalizeRect`) | Common shape-tool shortcut |
| B3 | **Shift key while drawing** — lock aspect ratio | Standard for squares/circles |
| B4 | **Switch to selection after shape commit** | Same as text tool — Excalidraw returns to selection |
| B5 | **Cursor during draw** — `crosshair` (already default for shape tools) | Verify per-tool consistency |
| B6 | **Resize handle cursors** — `nwse-resize`, `nesw-resize`, `ns-resize`, `ew-resize` per handle | Excalidraw sets per-handle cursor on hover |
| B7 | **Maintain proportions with Shift during resize** | Excalidraw `resizeElements` shift behavior |

**Touch files:** `lib/editor/updateScene.ts`, `lib/element/transform.ts`, `lib/element/transformHandles.ts`, `lib/scene/interactiveScene.ts`

**Tests to add:** shift-aspect lock, alt-from-center, min-size discard, post-commit tool switch

---

### Phase C — Text tool polish (remaining gaps)

**Excalidraw refs:** `textWysiwyg.tsx`, `packages/element/src/textElement.ts`, `refreshTextDimensions`

| # | Borrow | Why |
|---|--------|-----|
| C1 | **Auto-resize box to content** — `oninput` remeasures text, updates element width/height | WYSIWYG parity; textarea and canvas stay aligned |
| C2 | **Multiline canvas render** — wrap or draw multiple lines (not just single `fillText`) | Textarea already allows newlines |
| C3 | **Font size in app state** — `currentItemFontSize` affects new placements | Excalidraw toolbar drives next text |
| C4 | **Live preview while typing** — element updates before commit (optional) | Excalidraw updates scene on every keystroke |
| C5 | **Click-outside commit without re-select** — blur commit keeps selection loose | Excalidraw: keyboard commit re-selects, pointer-outside does not |
| C6 | **Touch double-tap** — ~35px proximity threshold before entering edit | Prevents accidental edit during drag on mobile |

**Touch files:** `components/TextEditor.tsx`, `lib/scene/renderElement.ts`, `lib/editor/appState.ts`, `components/AssetGenerator.tsx` (font size control)

---

### Phase D — Image tool polish

**Excalidraw refs:** `App.tsx` image import, `packages/element/src/image.ts`, file storage patterns

| # | Borrow | Why |
|---|--------|-----|
| D1 | **Drag-drop onto canvas** — not just file picker button | Excalidraw supports drop + paste |
| D2 | **Paste image from clipboard** | Common workflow |
| D3 | **Image resize** — aspect-ratio lock with Shift | Same as shapes |
| D4 | **Re-render when image finishes loading** — `imageCache` onload → trigger scene repaint | Avoid placeholder flash |
| D5 | **Crop / fit modes** (optional) — cover vs contain within box | Icon-specific; lower priority |

**Touch files:** `lib/data/image.ts`, `lib/scene/imageCache.ts`, `components/canvases/StaticCanvas.tsx`, `components/ImportImageButton.tsx`

---

### Phase E — Editor chrome & keyboard

**Excalidraw refs:** `App.tsx` keyboard shortcuts, `actionProperties.tsx`, `LayerUI.tsx`

| # | Borrow | Why |
|---|--------|-----|
| E1 | **Tool shortcuts** — `V` select, `T` text, `R` rectangle, etc. | Excalidraw tool hotkeys |
| E2 | **Duplicate** — Cmd+D on selection | Frequent workflow |
| E3 | **Select all** — Cmd+A | Standard |
| E4 | **Arrow-key nudge** — 1px move, Shift+arrow 10px | Precision positioning for icons |
| E5 | **Properties panel** — show stroke/fill/opacity for selected element | Excalidraw sidebar reflects selection, not just global defaults |
| E6 | **Locked tools** — double-click tool to lock (Excalidraw `activeTool.locked`) | Optional; already have `locked` in type |

**Touch files:** `lib/editor/useEditor.ts`, `components/AssetGenerator.tsx`, new `PropertiesPanel.tsx`

---

## How to borrow safely (workflow)

For each item above:

1. **Read Excalidraw first** — find the handler in `App.tsx` or the relevant `packages/element` module.
2. **Extract the rule, not the implementation** — e.g. “defer blur binding one tick” not “copy 800 lines of WYSIWYG”.
3. **Implement in `updateScene.ts`** — keep pointer logic centralized (same as Excalidraw routes through App, we route through `updateScene`).
4. **Add a test** in `lib/editor/updateScene.test.ts` or tool-specific `*.test.ts`.
5. **Run** `pnpm test:run app/asset-generator && pnpm build` before moving on.

---

## Excalidraw quick reference map

| Concern | Excalidraw path |
|---------|-----------------|
| Pointer routing | `packages/excalidraw/components/App.tsx` |
| Text WYSIWYG | `packages/excalidraw/wysiwyg/textWysiwyg.tsx` |
| Cursors | `packages/excalidraw/cursor.ts` |
| New elements | `packages/element/src/newElement.ts` |
| Drag while creating | `packages/element/src/dragElements.ts` |
| Selection / hit test | `packages/element/src/selection.ts` |
| Transform / resize | `packages/element/src/resizeElements.ts`, `transformHandles.ts` |
| Scene render | `packages/excalidraw/scene/Renderer.ts` |
| Hide text while editing | `Renderer.ts` (skip `editingTextElement` id) |
| History | `packages/excalidraw/history.ts` |
| Constants | `packages/common/src/constants.ts` |

---

## Suggested PR-sized chunks

```
PR 1 — Selection tool: drag threshold, cursors, tests
PR 2 — Shape tools: shift-aspect, alt-center, handle cursors, tool switch on commit
PR 3 — Text polish: auto-resize, multiline render, font size control
PR 4 — Image: drag-drop, paste, onload repaint
PR 5 — Keyboard shortcuts + properties panel for selection
```

---

## Out of scope (do not borrow yet)

- Collaboration / multiplayer
- Arrow bindings, container-bound text
- Full font family picker / Excalifont loading
- Grid snap, rotation, freedraw
- Library / templates panel
- Excalidraw's full action system (`register.ts`, `actions/`)

Keep the editor focused on **single 1024×1024 app icon assets** with platform export packs.