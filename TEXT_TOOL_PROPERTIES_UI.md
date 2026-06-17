# Text Tool (Tool #8) - Complete Properties Panel Analysis

Comprehensive breakdown of the text tool dialog/properties panel, all UI elements, interactions, and user stories.

---

## 📖 User Story: Complete Text Editing Workflow

### SCENARIO: User Creates & Formats Text

```
User selects text tool (Tool #8 in toolbar)
  ↓
Cursor changes to text cursor (I-beam)
  ↓
User clicks on canvas to create text box
  ↓
Text editor opens (in-place WYSIWYG editor)
  ↓
Text properties panel appears (right side or bottom)
  ↓
User types text...
  ↓
Text properties panel shows sections:
  ├─ Stroke (color & style)
  ├─ Font Family (with search)
  ├─ Font Size (S M L XL buttons)
  ├─ Text Alignment (Left Center Right)
  ├─ Vertical Alignment (Top Middle Bottom)
  ├─ Opacity Slider
  └─ Layers (undo/redo stacks)
  ↓
User adjusts formatting...
  ↓
Text updates in real-time as changes apply
  ↓
User clicks outside → Text committed to canvas
```

---

## 🎨 Text Properties Panel Structure

### Complete Panel Layout

```
┌────────────────────────────────────────┐
│    TEXT PROPERTIES PANEL               │
├────────────────────────────────────────┤
│                                        │
│  ▼ Stroke                              │
│  ├─ [████ Color Picker] ─→ (opens)    │
│  ├─ Stroke Style: (dashed options)     │
│  └─ Stroke Width: [•] [••] [•••]       │
│                                        │
│  ▼ Font Family                         │
│  ├─ [Nunito ▼]                         │
│  │   ├─ [🖐️] Hand-drawn button         │
│  │   ├─ [A] Normal button              │
│  │   └─ [</>] Code button              │
│  └─ (opens font list popover)          │
│     ├─ [🔍 Search fonts...]            │
│     ├─ ✓ Nunito (current)              │
│     ├─ Excalifont                      │
│     └─ More fonts...                   │
│                                        │
│  ▼ Font Size                           │
│  └─ [S] [M] [L] [XL]                   │
│      Small Medium Large VeryLarge      │
│                                        │
│  ▼ Text Align (Horizontal)             │
│  └─ [◄] [≡] [►]                        │
│      Left Center Right                 │
│                                        │
│  ▼ Text Align (Vertical)               │
│  └─ [⬆] [≡] [⬇]                        │
│      Top Middle Bottom                 │
│                                        │
│  ▼ Opacity                             │
│  ├─ ◄───●────────► 100%                │
│  └─ Slider (0-100%)                    │
│                                        │
│  ▼ Layers / History                    │
│  └─ (undo/redo stack)                  │
│                                        │
└────────────────────────────────────────┘
```

---

## 🏗️ UI Elements in Detail

### 1. STROKE SECTION
**Purpose:** Customize text stroke (outline)

**Components:**
```html
<section class="text-properties-stroke">
  <h3>Stroke</h3>
  
  <!-- Stroke Color Picker -->
  <div class="stroke-color">
    <div class="color-picker-trigger">
      <span class="color-swatch" style="background: #333;"></span>
      <span>Stroke Color</span>
    </div>
    <!-- Clicking opens ColorPicker popover -->
  </div>

  <!-- Stroke Style Radio Selection -->
  <fieldset>
    <legend>Stroke Style</legend>
    <RadioSelection group="strokeStyle">
      <label>
        <input type="radio" name="strokeStyle" value="solid">
        <span>━━━</span> Solid
      </label>
      <label>
        <input type="radio" name="strokeStyle" value="dashed">
        <span>─ ─ ─</span> Dashed
      </label>
      <label>
        <input type="radio" name="strokeStyle" value="dotted">
        <span>· · ·</span> Dotted
      </label>
    </RadioSelection>
  </fieldset>

  <!-- Stroke Width Radio Selection -->
  <fieldset>
    <legend>Stroke Width</legend>
    <RadioSelection group="strokeWidth">
      <label>
        <input type="radio" name="strokeWidth" value="thin">
        <span>┃</span> Thin
      </label>
      <label>
        <input type="radio" name="strokeWidth" value="regular">
        <span>┃┃</span> Regular
      </label>
      <label>
        <input type="radio" name="strokeWidth" value="bold">
        <span>┃┃┃</span> Bold
      </label>
    </RadioSelection>
  </fieldset>
</section>
```

**CSS:**
```scss
.text-properties-stroke {
  .color-picker-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }

  .color-swatch {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    border: 1px solid #d0d0d0;
  }

  fieldset {
    border: none;
    padding: 0.5rem 0;
    
    legend {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
  }

  .buttonList {
    display: flex;
    gap: 0.5rem;
  }
}
```

**Interactions:**
- Click color swatch → Opens ColorPicker popover
- Radio selection → Applies stroke immediately
- Updates text stroke in real-time

---

### 2. FONT FAMILY SECTION
**Purpose:** Select or search for font

**Components:**
```html
<section class="text-properties-font-family">
  <fieldset>
    <legend>Font Family</legend>
    
    <!-- Quick Select Buttons (3 default fonts) -->
    <div class="font-quick-select buttonList">
      <button class="font-btn" data-font="excalifont" title="Hand-drawn">
        <span class="font-icon">🖐️</span>
        Hand-drawn
      </button>
      <button class="font-btn active" data-font="nunito" title="Normal">
        <span class="font-icon">A</span>
        Normal
      </button>
      <button class="font-btn" data-font="comic" title="Code">
        <span class="font-icon">&lt;/&gt;</span>
        Code
      </button>
    </div>

    <!-- Font Family Dropdown (opens popover) -->
    <Popover.Root open={isOpened} onOpenChange={onPopupChange}>
      <Popover.Trigger asChild>
        <div class="font-family-trigger">
          <button class="properties-trigger">
            <span class="current-font">Nunito</span>
            <span class="dropdown-arrow">▼</span>
          </button>
        </div>
      </Popover.Trigger>

      <!-- Popover Content: Font List -->
      {isOpened && (
        <PropertiesPopover>
          <!-- Quick Search Input -->
          <QuickSearch
            placeholder="Search fonts..."
            onChange={debounce(setSearchTerm, 20)}
          />

          <!-- Grouped Font List -->
          <ScrollableList>
            <!-- Scene Fonts Group -->
            <DropdownMenuGroup title="Scene Fonts (Used)">
              <button class="dropdown-menu-item selected">
                <span class="font-icon">A</span>
                <span class="font-name">Nunito</span>
                <span class="checkmark">✓</span>
              </button>
              <!-- More scene fonts -->
            </DropdownMenuGroup>

            <!-- Available Fonts Group -->
            <DropdownMenuGroup title="Available Fonts">
              <button class="dropdown-menu-item">
                <span class="font-icon">🖐️</span>
                <span class="font-name">Excalifont</span>
              </button>
              <button class="dropdown-menu-item">
                <span class="font-icon">&lt;/&gt;</span>
                <span class="font-name">Cascadia</span>
                <span class="badge">deprecated</span>
              </button>
              <!-- More fonts -->
            </DropdownMenuGroup>
          </ScrollableList>
        </PropertiesPopover>
      )}
    </Popover.Root>
  </fieldset>
</section>
```

**CSS:**
```scss
.text-properties-font-family {
  .font-quick-select {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;

    .font-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;

      padding: 0.5rem;
      border: 1px solid #d0d0d0;
      border-radius: 0.25rem;
      background-color: white;
      cursor: pointer;

      font-size: 0.75rem;
      transition: all 0.2s ease;

      &:hover {
        background-color: #f5f5f5;
      }

      &.active {
        background-color: rgba(0, 0, 0, 0.08);
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .font-icon {
        font-size: 1rem;
      }
    }
  }

  .font-family-trigger {
    display: flex;
    align-items: center;

    button.properties-trigger {
      width: 100%;
      padding: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;

      border: 1px solid #d0d0d0;
      border-radius: 0.25rem;
      background-color: white;

      cursor: pointer;
      transition: all 0.2s ease;

      .current-font {
        font-weight: 500;
      }

      .dropdown-arrow {
        font-size: 0.75rem;
        color: #666;
      }

      &:hover {
        background-color: #f5f5f5;
      }

      &.active {
        border-color: var(--primary-color);
        background-color: rgba(0, 102, 255, 0.05);
      }
    }
  }

  /* Popover styling */
  .properties-content {
    width: 15rem;
    max-height: 60vh;
  }

  .quick-search-input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;

    border: 1px solid #d0d0d0;
    border-radius: 0.25rem;
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.1);
    }
  }

  .dropdown-menu-group {
    margin-bottom: 0.5rem;

    .group-title {
      padding: 0.5rem;
      font-weight: 600;
      font-size: 0.75rem;
      color: #999;
      text-transform: uppercase;
    }

    .dropdown-menu-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      width: 100%;
      padding: 0.5rem;

      border: none;
      border-radius: 0.25rem;
      background-color: transparent;

      cursor: pointer;
      font-family: var(--font-family);

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      &.selected {
        background-color: rgba(0, 0, 0, 0.08);
        color: var(--primary-color);

        .checkmark {
          display: inline-block;
        }
      }

      .font-icon {
        width: 1rem;
        height: 1rem;
        font-size: 0.75rem;
      }

      .font-name {
        flex: 1;
        text-align: left;
      }

      .badge {
        display: inline-block;
        padding: 0.125rem 0.375rem;
        background-color: #ff3333;
        color: white;
        font-size: 0.6rem;
        border-radius: 0.25rem;
        font-weight: 600;
      }

      .checkmark {
        display: none;
        color: var(--primary-color);
        font-weight: 600;
      }
    }
  }
}
```

**Interactions:**
- Click quick select button → Instant font change
- Click dropdown → Opens font list popover
- Type in search → Filters fonts live
- Arrow keys → Navigate list
- Enter or click → Select font
- Hover → Shows preview (desktop only)

---

### 3. FONT SIZE SECTION
**Purpose:** Select text size

**Components:**
```html
<section class="text-properties-font-size">
  <fieldset>
    <legend>Font Size</legend>
    
    <RadioSelection group="font-size">
      <label>
        <input type="radio" name="fontSize" value="small">
        <span class="size-icon">S</span>
        <span>Small</span>
      </label>
      <label>
        <input type="radio" name="fontSize" value="medium" checked>
        <span class="size-icon">M</span>
        <span>Medium</span>
      </label>
      <label>
        <input type="radio" name="fontSize" value="large">
        <span class="size-icon">L</span>
        <span>Large</span>
      </label>
      <label>
        <input type="radio" name="fontSize" value="xlarge">
        <span class="size-icon">XL</span>
        <span>Very Large</span>
      </label>
    </RadioSelection>
  </fieldset>
</section>
```

**Size Values:**
```typescript
const FONT_SIZES = {
  sm: 12,      // Small
  md: 16,      // Medium (default)
  lg: 20,      // Large
  xl: 28       // Very Large (XL)
}
```

**CSS:**
```scss
.text-properties-font-size {
  fieldset {
    border: none;
  }

  .buttonList {
    display: flex;
    gap: 0.5rem;

    label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;

      padding: 0.5rem;
      border: 1px solid #d0d0d0;
      border-radius: 0.25rem;
      background-color: white;

      cursor: pointer;
      flex: 1;

      &:hover {
        background-color: #f5f5f5;
      }

      input:checked + .size-icon {
        color: var(--primary-color);
        font-weight: 600;
      }

      input:checked + .size-icon ~ span {
        color: var(--primary-color);
      }
    }

    .size-icon {
      font-weight: 600;
      font-size: 0.875rem;
    }
  }
}
```

**Keyboard Shortcuts:**
- `Ctrl+Shift+<` (or `.` on Mac) → Decrease font size
- `Ctrl+Shift+>` (or `,` on Mac) → Increase font size

**Interactions:**
- Click button → Instantly changes text size
- Affects selected text or default for new text
- Relative keyboard shortcuts for incremental changes

---

### 4. TEXT ALIGNMENT (HORIZONTAL)
**Purpose:** Align text left/center/right

**Components:**
```html
<section class="text-properties-align-horizontal">
  <fieldset>
    <legend>Text Alignment</legend>
    
    <RadioSelection group="text-align">
      <label class="align-btn left">
        <input type="radio" name="textAlign" value="left" checked>
        <span class="align-icon">◄</span>
        <span>Left</span>
      </label>
      <label class="align-btn center">
        <input type="radio" name="textAlign" value="center">
        <span class="align-icon">≡</span>
        <span>Center</span>
      </label>
      <label class="align-btn right">
        <input type="radio" name="textAlign" value="right">
        <span class="align-icon">►</span>
        <span>Right</span>
      </label>
    </RadioSelection>
  </fieldset>
</section>
```

**CSS:**
```scss
.text-properties-align-horizontal {
  .align-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;

    padding: 0.5rem;
    border: 1px solid #d0d0d0;
    border-radius: 0.25rem;
    background-color: white;

    cursor: pointer;
    flex: 1;

    transition: all 0.2s ease;

    &:hover {
      background-color: #f5f5f5;
    }

    input:checked ~ .align-icon {
      color: var(--primary-color);
    }

    .align-icon {
      font-size: 0.875rem;
      font-weight: 600;
    }
  }
}
```

**Values:**
```typescript
type TextAlign = "left" | "center" | "right"
```

**Interactions:**
- Click button → Applies alignment to text immediately
- Preview updates in real-time
- Only available when text element selected

---

### 5. TEXT ALIGNMENT (VERTICAL)
**Purpose:** Align text top/middle/bottom

**Components:**
```html
<section class="text-properties-align-vertical">
  <fieldset>
    <legend>Vertical Alignment</legend>
    
    <RadioSelection group="text-align-vertical">
      <label class="align-btn top">
        <input type="radio" name="verticalAlign" value="top" checked>
        <span class="align-icon">⬆</span>
        <span>Top</span>
      </label>
      <label class="align-btn middle">
        <input type="radio" name="verticalAlign" value="middle">
        <span class="align-icon">≡</span>
        <span>Middle</span>
      </label>
      <label class="align-btn bottom">
        <input type="radio" name="verticalAlign" value="bottom">
        <span class="align-icon">⬇</span>
        <span>Bottom</span>
      </label>
    </RadioSelection>
  </fieldset>
</section>
```

**Values:**
```typescript
type TextVerticalAlign = "top" | "middle" | "bottom"
```

---

### 6. OPACITY SLIDER
**Purpose:** Control text transparency

**Components:**
```html
<section class="text-properties-opacity">
  <label>
    <span class="opacity-label">Opacity</span>
    <div class="opacity-slider-container">
      <input
        type="range"
        min="0"
        max="100"
        value="100"
        class="opacity-slider"
        aria-label="Opacity"
      />
      <span class="opacity-value">100%</span>
    </div>
  </label>
</section>
```

**CSS:**
```scss
.text-properties-opacity {
  .opacity-label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .opacity-slider-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .opacity-slider {
    flex: 1;
    height: 4px;

    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0.1),
      rgba(0, 0, 0, 1)
    );

    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;

    border: none;
    border-radius: 2px;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;

      width: 1rem;
      height: 1rem;
      border-radius: 50%;

      background-color: white;
      border: 2px solid var(--primary-color);

      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;

      background-color: white;
      border: 2px solid var(--primary-color);

      cursor: pointer;
    }
  }

  .opacity-value {
    min-width: 2.5rem;
    text-align: right;
    font-size: 0.875rem;
    font-weight: 500;
  }
}
```

**Interactions:**
- Drag slider → Opacity changes 0-100%
- Shows percentage value
- Updates text in real-time

---

### 7. LAYERS / HISTORY
**Purpose:** Undo/redo stack visualization

**Components:**
```html
<section class="text-properties-layers">
  <fieldset>
    <legend>Layers / History</legend>
    
    <div class="layers-container">
      <!-- Layer stack visualization -->
      <div class="layer-item">
        <span class="layer-title">Text Element</span>
        <span class="layer-meta">Created</span>
      </div>
      
      <!-- Undo/Redo buttons -->
      <div class="history-controls">
        <button class="undo-btn" title="Undo (Ctrl+Z)">
          <span class="icon">↶</span>
        </button>
        <button class="redo-btn" title="Redo (Ctrl+Shift+Z)">
          <span class="icon">↷</span>
        </button>
      </div>
    </div>
  </fieldset>
</section>
```

**CSS:**
```scss
.text-properties-layers {
  .layers-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .layer-item {
    display: flex;
    justify-content: space-between;
    align-items: center;

    padding: 0.5rem;
    border-radius: 0.25rem;
    background-color: rgba(0, 0, 0, 0.03);

    font-size: 0.875rem;

    .layer-title {
      font-weight: 500;
    }

    .layer-meta {
      color: #999;
      font-size: 0.75rem;
    }
  }

  .history-controls {
    display: flex;
    gap: 0.5rem;

    button {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #d0d0d0;
      border-radius: 0.25rem;
      background-color: white;

      cursor: pointer;

      &:hover:not(:disabled) {
        background-color: #f5f5f5;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .icon {
        font-size: 0.875rem;
      }
    }
  }
}
```

**Keyboard Shortcuts:**
- `Ctrl+Z` → Undo
- `Ctrl+Shift+Z` → Redo

---

## 🔄 Smart Features & Interactions

### 1. CARET POSITION PRESERVATION
When user changes font/size while editing:
```typescript
// Before change
const caretStart = textEditor.selectionStart  // Save cursor position
const caretEnd = textEditor.selectionEnd

// User changes font
updateFont()

// After change
setTimeout(() => {
  textEditor.focus()
  textEditor.selectionStart = caretStart  // Restore position
  textEditor.selectionEnd = caretEnd
})
```

**Why:** User doesn't lose typing position

---

### 2. REAL-TIME PREVIEW
Changes apply instantly to canvas:
```typescript
// On any property change
onPropertyChange = (property, value) => {
  updateElement({
    ...element,
    [property]: value
  })
  // Triggers re-render immediately
}
```

**Why:** Visual feedback as you adjust

---

### 3. AUTOMATIC PANEL REPOSITIONING
Mobile vs Desktop:
```typescript
if (isMobile) {
  // Bottom sheet on mobile portrait
  popover.position = "bottom"
} else if (isTablet) {
  // Center sheet on tablet
  popover.position = "center"
} else {
  // Right sidebar on desktop
  popover.position = "right"
}
```

---

### 4. SEARCH FILTERING (Font List)
Live filter as user types:
```typescript
const filteredFonts = allFonts.filter(font =>
  font.name.toLowerCase().includes(searchTerm.toLowerCase())
)

// Auto-hover first result
if (searchTerm) {
  hoveredFont = filteredFonts[0]
}
```

**Why:** Quick font finding without scrolling

---

### 5. FOCUS MANAGEMENT
When opening/closing popover:
```typescript
onPopoverOpen = () => {
  // Focus search input (if available)
  searchInput?.focus()
}

onPopoverClose = () => {
  // Return focus to text editor if editing
  if (isEditingText) {
    textEditor?.focus()
  } else {
    canvasContainer?.focus()
  }
}
```

**Why:** Smooth keyboard navigation

---

## 📱 Responsive Behavior

### Desktop
```
┌─────────────────────────────────────┐
│ Canvas (80%)     Properties (20%)    │
│                  ┌──────────────────┤
│                  │ Stroke           │
│                  │ Font Family      │
│                  │ Font Size        │
│                  │ Text Align       │
│                  │ Opacity          │
│                  │ Layers           │
│                  └──────────────────┤
└─────────────────────────────────────┘
```

- All sections visible
- Popover opens to the right
- Side-by-side layout

---

### Mobile
```
┌────────────────────────────┐
│ Canvas (100%)              │
│                            │
│ [Text editor floating]     │
│                            │
├────────────────────────────┤
│ Properties Sheet (60vh)     │
│ ┌────────────────────────┤
│ │ Stroke                 │
│ │ Font Family            │
│ │ Font Size              │
│ │ Text Align             │
│ │ Opacity                │
│ │ Layers                 │
│ └────────────────────────┤
└────────────────────────────┘
```

- Bottom sheet popover
- Full-width on mobile
- Scrollable if needed

---

## 👆 Input Method Handling

### Mouse (Desktop)
- Hover previews on font list
- Click to select
- Smooth transitions

### Touch (Mobile)
- Tap to select (no hover)
- No preview before selection
- Large touch targets (48px+)

### Keyboard
- Tab between sections
- Arrow keys in font list
- Enter to confirm selection
- Shortcuts: Ctrl+Z, Ctrl+Shift+Z

---

## 🎯 Complete User Story Flows

### FLOW 1: Basic Text Formatting

```
1. Select text tool [#8]
2. Click canvas → Text editor opens
3. Type text
4. Click "Font Family" dropdown
5. See list: Hand-drawn, Normal, Code
6. Click "Code" font
7. Font changes live
8. Adjust size: Click [XL]
9. Change alignment: Click [≡] (center)
10. Set opacity: Drag slider to 80%
11. Click outside → Text committed
✅ Formatted text on canvas
```

---

### FLOW 2: Advanced Formatting

```
1. Select text tool
2. Type text
3. Open Font Family → Search "helvetica"
4. Filtered list shows: Helvetica
5. Click to select
6. Change size [L]
7. Set stroke: Color + dashed style
8. Adjust vertical align: [≡] (middle)
9. Layers shows: "Text Element - Created"
10. Undo with Ctrl+Z → Size reverts
11. Redo with Ctrl+Shift+Z → Size reapplied
✅ Advanced formatting applied
```

---

### FLOW 3: Mobile Workflow

```
1. Tap text tool icon [#8]
2. Tap canvas → Text editor opens
3. Phone keyboard appears
4. Type message
5. Tap "Font" icon → Bottom sheet slides up
6. Search bar focused automatically
7. Type "comic" → Filters to Comic Shanns
8. Tap font → Selected, sheet slides down
9. Keyboard closes
10. Adjust opacity with slider
11. Tap outside text box → Committed
✅ Mobile text created with formatting
```

---

## 📋 Complete UI Element Checklist

### Stroke Section
- [ ] Color picker trigger
- [ ] Color swatch display
- [ ] Stroke style radio buttons (solid/dashed/dotted)
- [ ] Stroke width buttons (thin/regular/bold)

### Font Family Section
- [ ] Quick select buttons (Hand-drawn/Normal/Code)
- [ ] Font dropdown trigger
- [ ] Search input (in popover)
- [ ] Font list with groups (Scene/Available)
- [ ] Font name display in own typeface
- [ ] Deprecated badge for old fonts
- [ ] Checkmark for selected font

### Font Size Section
- [ ] 4 size buttons (S/M/L/XL)
- [ ] Size values (12/16/20/28px)
- [ ] Active/inactive states

### Text Alignment
- [ ] Left align button (◄)
- [ ] Center align button (≡)
- [ ] Right align button (►)
- [ ] Visual icons representing alignment
- [ ] Vertical alignment (Top/Middle/Bottom)

### Opacity
- [ ] Range slider (0-100)
- [ ] Value display (percentage)
- [ ] Gradient background (visual reference)
- [ ] Thumb with primary color border

### Layers/History
- [ ] Layer item display
- [ ] Undo button (↶)
- [ ] Redo button (↷)
- [ ] Disabled state when no history

---

## 🎬 Animation States

### Popover Opening
```css
animation: slideUpIn 0.3s ease-out;  /* Mobile */
animation: fadeIn 0.15s ease-out;    /* Desktop */
```

### Button Hover
```css
transition: background-color 0.2s ease;
```

### Slider Drag
```css
cursor: grabbing;
transition: none;  /* Immediate, no lag */
```

---

## ♿ Accessibility

### ARIA Labels
```html
<input aria-label="Font size" aria-valuemin="12" aria-valuemax="28">
<button aria-label="Left align text" aria-keyshortcuts="Ctrl+Shift+L">
<fieldset>
  <legend>Text Alignment</legend>
  <!-- Options -->
</fieldset>
```

### Keyboard Navigation
- Full tab order through all controls
- Enter/Space to select buttons
- Arrow keys in font list
- Escape to close popovers
- Focus visible on all interactive elements

### Screen Readers
- Section headings announced
- Font names read in their typeface
- Slider values announced
- State changes announced ("Selected", "Deprecated")

---

## 🔍 Testing Scenarios

### Desktop Testing
- [ ] Open font picker
- [ ] Search for font
- [ ] Hover shows preview
- [ ] Click selects
- [ ] Popover closes
- [ ] Focus returns to text editor
- [ ] Can continue typing

### Mobile Testing
- [ ] Bottom sheet opens
- [ ] Search input auto-focused
- [ ] Keyboard appears
- [ ] Scroll through fonts
- [ ] Tap selects
- [ ] Sheet closes smoothly
- [ ] One-hand operation works

### Keyboard Testing
- [ ] Tab navigates all sections
- [ ] Arrow keys work in lists
- [ ] Enter confirms
- [ ] Ctrl+Z undoes
- [ ] Ctrl+Shift+Z redoes
- [ ] All shortcuts work

---

## 📊 Data Flow

```
User Input (UI Element)
  ↓
Validation & Processing
  ↓
Update Element State
  ↓
Re-render Text on Canvas
  ↓
Update Property Panel
  ↓
Visual Feedback
```

Example: User selects bold stroke width
```
User clicks [Bold] button
  ↓
onClick → updateData("strokeWidth", 2)
  ↓
Element state: { ...element, strokeWidth: 2 }
  ↓
Canvas re-renders with bolder outline
  ↓
Property panel updates [Bold] button state
  ↓
User sees bold outline immediately
```

---

**Generated:** June 17, 2026
**Source:** Excalidraw actionProperties.tsx, Actions.tsx, Components
