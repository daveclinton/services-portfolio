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

### Current status snapshot (2026-06-23)
- **Phase A — Selection tool:** complete.
- **Phase B — Shape tools:** complete for app-icon scope.
- **Phase C — Text polish:** complete for app-icon scope.
- **Phase D — Image tool polish:** core complete; crop / fit modes remain optional.
- **Phase E — Editor chrome & keyboard:** complete for app-icon scope.
- **Context menu / chrome work:** started early and functional.
- **Next recommended chunk:** optional crop / fit modes or a broader polish pass.

**Latest verification:**

```bash
pnpm test:run app/asset-generator  # 12 files, 66 tests passing
pnpm build                         # passing
```

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
| Live textarea input updates canvas element before commit | Done |
| Text elements auto-resize to content while typing | Done |
| Multiline canvas render | Done |
| Font size app state + sidebar control for new text | Done |
| Click-outside / blur commit does not re-select text | Done |
| Touch double-tap text edit proximity threshold | Done |

**Key files:** `lib/editor/updateScene.ts`, `lib/element/text.ts`, `components/TextEditor.tsx`, `components/canvases/StaticCanvas.tsx`

### Selection tool (Phase A complete)
Borrowed from `App.tsx` (`handleSelectionOnPointerDown`, `handleSelectionOnPointerUp`), `cursor.ts`, `packages/element/src/selection.ts`, `packages/element/src/resizeTest.ts`:

| Pattern | Status |
|---------|--------|
| 4px drag threshold before element movement | Done |
| `grabbing` cursor during active drag | Done |
| Marquee / box selection from empty canvas drag | Done |
| Shift+marquee adds to existing selection | Done |
| Empty canvas click deselects | Done |
| Multi-select suppresses resize handles | Done |
| Top-most hit-test priority follows z-order | Done |
| Cursor constants mirror Excalidraw shape (`TEXT`, `CROSSHAIR`, `MOVE`, `GRABBING`, `AUTO`) | Done |
| Resize handle cursors (`nwse-resize`, `nesw-resize`, `ns-resize`, `ew-resize`) | Done |

**Key files:** `lib/editor/updateScene.ts`, `lib/element/selection.ts`, `lib/element/text.ts`, `lib/element/transformHandles.ts`, `components/canvases/StaticCanvas.tsx`

### Shape tools (Phase B complete)
Borrowed from `App.tsx` (`createGenericElementOnPointerDown`), `packages/element/src/dragElements.ts`, `packages/element/src/resizeElements.ts`, `transformHandles.ts`:

| Pattern | Status |
|---------|--------|
| Minimum size on commit via `MIN_ELEMENT_SIZE` | Done |
| Alt/Option while drawing creates from center | Done |
| Shift while drawing locks aspect ratio | Done |
| Shift+Alt/Option combines centered + aspect-locked drawing | Done |
| Shape commit switches back to selection tool | Done |
| Crosshair cursor for shape drawing | Done |
| Shift while resizing maintains proportions | Done |

**Key files:** `lib/editor/updateScene.ts`, `lib/element/transform.ts`, `lib/element/transformHandles.ts`, `components/canvases/StaticCanvas.tsx`

### Context menu / editor chrome (started)
Borrowed from `App.tsx` (`handleCanvasContextMenu`, `getContextMenuItems`) and `components/ContextMenu.tsx`:

| Pattern | Status |
|---------|--------|
| Right-click opens Radix context menu | Done |
| Top-left hamburger opens Radix dropdown app menu | Done |
| Right-click hit element is selected before element actions show | Done |
| Right-click empty canvas preserves existing selection | Done |
| Canvas menu: import image, save/load JSON, export platform, export all, select all | Done |
| Element menu: duplicate, layer submenu, delete | Done |
| Cmd+D duplicate | Done |
| Cmd+A select all | Done |
| Sidebar reduced to controls only instead of file/export/layer/status actions | Done |
| Sidebar restyled as Excalidraw-like floating properties popup with swatches | Done |
| Sidebar property controls edit the selected element, falling back to new-item defaults | Done |
| Color controls mirror Excalidraw top-picks, palette, shades, and most-used custom color logic | Done |
| Font family uses Excalidraw-like inline picks plus side Popover font list | Done |
| Font size uses Excalidraw-like quick picks tuned for app-icon readability | Done |
| Project name moved to top-left chrome; duplicate top Background control removed | Done |
| Tool/selection/elements shown in a minimalist bottom status bar | Done |
| Safe-area warning moved to export-time confirmation | Done |
| Context-menu surface visually distinct from white canvas | Done |
| Tool shortcuts (`V`, `T`, `R`, `D`, `E`/`O`, numeric keys) | Done |
| Arrow-key nudge: 1px, Shift+arrow 10px | Done |
| Locked tools via double-click toolbar button | Done |
| Selected-element properties include fill/stroke/opacity/stroke width | Done |

**Key files:** `components/AssetCanvasContextMenu.tsx`, `components/AssetGenerator.tsx`, `components/canvases/StaticCanvas.tsx`, `components/ui/context-menu.tsx`, `lib/editor/useEditor.ts`, `lib/editor/updateScene.ts`, `app/global.css`

### Image tool polish (Phase D core complete)
Borrowed from `App.tsx` image import, `packages/element/src/image.ts`, file storage patterns:

| Pattern | Status |
|---------|--------|
| Drag-drop image onto canvas | Done |
| Paste image from clipboard | Done |
| Shift while resizing image maintains proportions | Done |
| Image cache load triggers canvas + preview repaint | Done |
| Drop-point image placement centers imported image under pointer | Done |
| Crop / fit modes | Optional / not implemented |

**Key files:** `lib/data/image.ts`, `lib/scene/imageCache.ts`, `components/canvases/StaticCanvas.tsx`, `components/DevicePreview.tsx`, `lib/element/transform.test.ts`

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

**Status:** Done. Keep this section as historical reference.

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

**Status:** Done. Keep this section as historical reference.

**Touch files:** `lib/editor/updateScene.ts`, `lib/element/transform.ts`, `lib/element/transformHandles.ts`, `lib/scene/interactiveScene.ts`

**Tests to add:** shift-aspect lock, alt-from-center, min-size discard, post-commit tool switch

---

### Phase C — Text tool polish

**Status:** Done for app-icon scope. C1-C7 are implemented.

**Excalidraw refs:** `textWysiwyg.tsx`, `packages/element/src/textElement.ts`, `refreshTextDimensions`

| # | Borrow | Why |
|---|--------|-----|
| C1 | **Auto-resize box to content** — `oninput` remeasures text, updates element width/height | WYSIWYG parity; textarea and canvas stay aligned |
| C2 | **Multiline canvas render** — wrap or draw multiple lines (not just single `fillText`) | Textarea already allows newlines |
| C3 | **Font size in app state** — `currentItemFontSize` affects new placements | Excalidraw toolbar drives next text |
| C4 | **Live preview while typing** — element updates before commit (optional) | Excalidraw updates scene on every keystroke |
| C5 | **Click-outside commit without re-select** — blur commit keeps selection loose | Excalidraw: keyboard commit re-selects, pointer-outside does not |
| C6 | **Touch double-tap** — ~35px proximity threshold before entering edit | Prevents accidental edit during drag on mobile |
| C7 | **Font controls** — family, style, and app-icon-sized presets apply to selected text or next text | Keeps typography contextual like Excalidraw |

All rows above are implemented. Keep this section as historical reference.

**Touch files:** `components/TextEditor.tsx`, `lib/scene/renderElement.ts`, `lib/editor/appState.ts`, `components/AssetGenerator.tsx` (font size control)

---

### Phase D — Image tool polish

**Status:** Core complete. D1-D4 are implemented; D5 remains optional.

**Excalidraw refs:** `App.tsx` image import, `packages/element/src/image.ts`, file storage patterns

| # | Borrow | Why |
|---|--------|-----|
| D1 | **Drag-drop onto canvas** — not just file picker button | Excalidraw supports drop + paste |
| D2 | **Paste image from clipboard** | Common workflow |
| D3 | **Image resize** — aspect-ratio lock with Shift | Same as shapes |
| D4 | **Re-render when image finishes loading** — `imageCache` onload → trigger scene repaint | Avoid placeholder flash |
| D5 | **Crop / fit modes** (optional) — cover vs contain within box | Icon-specific; lower priority |

D1-D4 are implemented. Keep D5 as a future optional icon-specific enhancement.

**Touch files:** `lib/data/image.ts`, `lib/scene/imageCache.ts`, `components/canvases/StaticCanvas.tsx`, `components/ImportImageButton.tsx`

---

### Phase E — Editor chrome & keyboard

**Status:** Done for app-icon scope.

**Excalidraw refs:** `App.tsx` keyboard shortcuts, `actionProperties.tsx`, `LayerUI.tsx`

| # | Borrow | Why |
|---|--------|-----|
| E1 | **Tool shortcuts** — `V` select, `T` text, `R` rectangle, etc. | Excalidraw tool hotkeys |
| E2 | **Duplicate** — Cmd+D on selection | Frequent workflow |
| E3 | **Select all** — Cmd+A | Standard |
| E4 | **Arrow-key nudge** — 1px move, Shift+arrow 10px | Precision positioning for icons |
| E5 | **Properties panel** — show stroke/fill/opacity for selected element | Excalidraw sidebar reflects selection, not just global defaults |
| E6 | **Locked tools** — double-click tool to lock (Excalidraw `activeTool.locked`) | Optional; already have `locked` in type |

All rows above are implemented. Tool shortcuts include `V` selection, `T` text, `R` rectangle, `D` diamond, `E`/`O` ellipse, plus numeric shortcuts. Arrow-key nudge is 1px, or 10px with Shift. Double-clicking a toolbar tool locks it, keeping shape/text tools active after commit until another tool is chosen.

**Touch files:** `lib/editor/useEditor.ts`, `lib/editor/updateScene.ts`, `components/AssetGenerator.tsx`, `components/AssetPropertiesPanel.tsx`

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
PR 1 — Selection tool: drag threshold, cursors, tests ✅ done
PR 2 — Shape tools: shift-aspect, alt-center, handle cursors, tool switch on commit ✅ done
PR 3 — Text polish: auto-resize, multiline render, font size control
PR 4 — Image: drag-drop, paste, onload repaint ✅ core done
PR 5 — Keyboard shortcuts + properties panel for selection ✅ done
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
