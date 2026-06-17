# Font Selection UI - Complete Analysis

Comprehensive breakdown of Excalidraw's font picker component: UI approach, elements, interaction patterns, and user story.

---

## 📖 User Story

### PRIMARY FLOW: Selecting a Font

**As a** user creating or editing text in Excalidraw  
**I want to** quickly change the font of my text  
**So that** I can style my drawings with different typography

#### Scenario 1: Using Default Fonts (Fast Path)
```
User selects text element
  ↓
Toolbar appears (or Font section expands)
  ↓
User sees 3 large icon buttons (Hand-drawn, Normal, Code)
  ↓
User clicks one → Font immediately changes
  ↓
Text re-renders in new font
```

#### Scenario 2: Browsing All Fonts (Extended Path)
```
User selects text element
  ↓
Toolbar appears
  ↓
User clicks "Font" (text icon) button
  ↓
Dropdown popover opens with list of fonts
  ↓
User searches or scrolls through fonts
  ↓
User hovers over font to preview
  ↓
User clicks to select → Popover closes, text updates
```

#### Scenario 3: During Text Editing
```
User is typing in text element
  ↓
User opens font picker (text is still being edited)
  ↓
User can search/select font
  ↓
Font changes for current/future text
  ↓
Caret position preserved in editor
  ↓
User continues typing
```

---

## 🏗️ UI Component Architecture

### Component Hierarchy

```
FontPicker (Main Container)
│
├─ Default Fonts Quick Selection (when not compact)
│  │
│  └─ RadioSelection (3 large icon buttons)
│     ├─ Hand-drawn (Excalifont)
│     ├─ Normal (Nunito)
│     └─ Code (Comic Shanns)
│
├─ ButtonSeparator (visual divider)
│
├─ Popover.Root (Radix UI Popover)
│  │
│  ├─ FontPickerTrigger (Text icon button)
│  │  └─ Opens/closes popover
│  │
│  └─ FontPickerList (Popover content)
│     │
│     ├─ QuickSearch (search input)
│     │
│     └─ ScrollableList (font items)
│        │
│        ├─ DropdownMenuGroup "Scene Fonts"
│        │  └─ Fonts already used in drawing
│        │
│        └─ DropdownMenuGroup "Available Fonts"
│           └─ All other fonts
```

---

## 🎨 UI Elements Breakdown

### 1. DEFAULT FONTS QUICK SELECTION
**Component:** `RadioSelection` buttons  
**Purpose:** Fast access to 3 most common fonts

**Elements:**
```
┌─────────────────────────────────────┐
│  [🖐️] [A] [</>]                     │
│ Hand-drawn Normal Code               │
└─────────────────────────────────────┘

- Hand-drawn icon (FreedrawIcon)
- Normal font icon (FontFamilyNormalIcon)
- Code font icon (FontFamilyCodeIcon)
```

**CSS Classes:**
```css
.buttonList {
  display: flex;
  gap: 0.5rem;
}

button.properties-trigger {
  width: 3rem; /* icon button size */
  height: 2rem;
  border-radius: 0.25rem;
  background-color: transparent;
  border: 1px solid #d0d0d0;
  cursor: pointer;
  
  /* Active state (selected) */
  &.active {
    background-color: rgba(0, 0, 0, 0.1);
    color: var(--primary-color);
  }
  
  /* Hover */
  &:hover {
    background-color: #f5f5f5;
  }
}
```

**Interaction:**
- Click to instantly change font
- One button active at a time (radio behavior)
- No dropdown needed - immediate action
- Accessible via keyboard (Tab + Space/Enter)

---

### 2. FONT PICKER TRIGGER BUTTON
**Component:** `FontPickerTrigger`  
**Purpose:** Opens font list popover

**Element:**
```
┌─────────────────────┐
│ [A] (Text Icon)     │ → Click to open popover
└─────────────────────┘

- Icon: TextIcon (SVG)
- State: closed or open
- Styling: highlighted when popover is open
```

**HTML Structure:**
```html
<Popover.Trigger asChild>
  <div data-openpopup="fontFamily" class="properties-trigger">
    <ButtonIcon
      standalone
      icon={TextIcon}
      title="Show Fonts"
      testId="font-family-show-fonts"
      active={isOpened}
      onClick={() => togglePopover()}
      style={{
        border: 'none',
        width: '2rem',
        height: '2rem'
      }}
    />
  </div>
</Popover.Trigger>
```

**CSS Properties:**
```css
.properties-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  
  padding: 0.5rem;
  border-radius: 0.25rem;
  background-color: transparent;
  border: none;
  
  cursor: pointer;
  transition: all 0.2s ease;
}

.properties-trigger:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.properties-trigger.active {
  background-color: rgba(0, 0, 0, 0.1);
}
```

---

### 3. FONT PICKER LIST POPOVER
**Component:** `FontPickerList` + `PropertiesPopover`  
**Purpose:** Display all available fonts with search and preview

**Layout:**
```
┌─────────────────────────────────────────┐
│ Quick Search input                      │
├─────────────────────────────────────────┤
│                                         │
│ ✓ Scene Fonts (used in drawing)         │
│   ├─ Excalifont 🖐️ (hand-drawn)        │
│   ├─ Nunito A (normal)                  │
│   └─ Comic Shanns </> (code)            │
│                                         │
│ Available Fonts (all others)            │
│   ├─ Cascadia </> (code) [deprecated]   │
│   ├─ Helvetica A (normal)               │
│   ├─ Lilita One Aa (heading)            │
│   └─ Virgil 🖐️ (hand-drawn)             │
│                                         │
└─────────────────────────────────────────┘
```

**Structure:**
```html
<PropertiesPopover
  className="properties-content"
  style={{ width: "15rem" }}
  onClose={handleClose}
  onPointerLeave={handleLeave}
  onKeyDown={handleKeyDown}
>
  <QuickSearch
    placeholder="Search fonts..."
    onChange={debounce(setSearchTerm, 20)}
  />
  
  <ScrollableList className="dropdown-menu fonts manual-hover">
    <!-- Group 1: Scene Fonts -->
    <DropdownMenuGroup title="Scene Fonts">
      {sceneFilteredFonts.map(font => (
        <FontPickerListItem
          font={font}
          isSelected={font.value === selectedFontFamily}
          isHovered={font.value === hoveredFontFamily}
          onSelect={handleSelect}
          onHover={handleHover}
        />
      ))}
    </DropdownMenuGroup>
    
    <!-- Group 2: Available Fonts -->
    <DropdownMenuGroup title="Available Fonts">
      {availableFilteredFonts.map(font => (
        <FontPickerListItem {...} />
      ))}
    </DropdownMenuGroup>
  </ScrollableList>
</PropertiesPopover>
```

---

### 4. FONT LIST ITEM
**Component:** `FontPickerListItem` (button in list)  
**Purpose:** Selectable individual font option

**Visual States:**
```
Normal:
  [ Excalifont ]  (font preview)

Hovered:
  [ Excalifont ]← cursor here (highlighted bg)

Selected:
  [✓ Excalifont ] (checkmark, active state)

Deprecated:
  [ Cascadia [OLD] ] (red badge)
```

**HTML:**
```html
<button
  type="button"
  value={font.value}
  className={getDropdownMenuItemClassName(isSelected, isHovered)}
  title={font.text}
  tabIndex={isSelected ? 0 : -1}
  onClick={(e) => onSelect(Number(e.currentTarget.value))}
  onMouseMove={() => onHover(font.value)}
>
  <MenuItemContent
    icon={font.icon}
    badge={
      font.badge && (
        <DropDownMenuItemBadge type={font.badge.type}>
          {font.badge.placeholder}
        </DropDownMenuItemBadge>
      )
    }
    textStyle={{
      fontFamily: getFontFamilyString({ fontFamily: font.value })
    }}
  >
    {font.text}
  </MenuItemContent>
</button>
```

**CSS:**
```css
.dropdown-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  width: 100%;
  padding: 0.5rem;
  
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  
  cursor: pointer;
  font-size: 0.875rem;
  
  transition: all 0.15s ease;
}

.dropdown-menu-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-color: #d0d0d0;
}

.dropdown-menu-item.selected {
  background-color: rgba(0, 0, 0, 0.08);
  color: var(--primary-color);
  font-weight: 600;
}

.dropdown-menu-item.selected::before {
  content: '✓';
  display: inline-block;
  width: 1rem;
  color: var(--primary-color);
}
```

**Font Preview:**
```css
.dropdown-menu-item-content {
  font-family: var(--font-family);  /* Font shown in its own typeface */
  font-size: 0.875rem;
  line-height: 1.5;
}
```

---

### 5. BADGE (Deprecated Fonts)
**Component:** `DropDownMenuItemBadge`  
**Purpose:** Mark deprecated fonts with warning

**Styles:**
```css
.dropdown-menu-item-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 0.25rem 0.5rem;
  margin-left: auto;
  
  background-color: #ff3333;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  
  border-radius: 0.25rem;
  
  text-transform: uppercase;
}

.dropdown-menu-item-badge.red {
  background-color: #ff3333;
}

.dropdown-menu-item-badge.yellow {
  background-color: #ffaa00;
}

.dropdown-menu-item-badge.green {
  background-color: #00aa00;
}
```

---

### 6. QUICK SEARCH INPUT
**Component:** `QuickSearch`  
**Purpose:** Filter fonts by name/text

**Element:**
```
┌─────────────────────────────────────┐
│ 🔍 Search fonts...                  │
└─────────────────────────────────────┘
```

**HTML:**
```html
<input
  ref={inputRef}
  type="text"
  placeholder="Search fonts..."
  onChange={debounce(setSearchTerm, 20)}
  aria-label="Search fonts"
/>
```

**CSS:**
```css
.quick-search-input {
  width: 100%;
  padding: 0.5rem;
  
  border: 1px solid #d0d0d0;
  border-radius: 0.25rem;
  
  font-size: 0.875rem;
  font-family: system-ui;
  
  transition: border-color 0.2s ease;
}

.quick-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.1);
}

.quick-search-input::placeholder {
  color: #999999;
}
```

**Behavior:**
- Debounced input (20ms delay)
- Filters fonts in real-time
- Search term: case-insensitive
- Matches against font name
- Empty state shows "No fonts found"

---

## ⌨️ Keyboard Navigation & Shortcuts

### Keyboard Handlers

| Key | Action |
|-----|--------|
| **Tab** | Focus between trigger button and search input |
| **Shift+F** | Focus search input (when popover open) |
| **Escape** | Close popover |
| **Enter** | Select hovered font |
| **Arrow Down** | Move highlight to next font |
| **Arrow Up** | Move highlight to previous font |

**Code Reference:**
```typescript
if (event.key === KEYS.ESCAPE) {
  onClose()
}

if (event.key === KEYS.ENTER) {
  if (hoveredFont?.value) {
    onSelect(hoveredFont.value)
  }
}

if (event.key === KEYS.ARROW_DOWN) {
  if (hoveredFont?.next) {
    onHover(hoveredFont.next.value)
  } else if (filteredFonts[0]?.value) {
    onHover(filteredFonts[0].value)
  }
}

if (event.key === KEYS.ARROW_UP) {
  if (hoveredFont?.prev) {
    onHover(hoveredFont.prev.value)
  } else if (filteredFonts[filteredFonts.length - 1]?.value) {
    onHover(filteredFonts[filteredFonts.length - 1].value)
  }
}
```

---

## 🎯 Font Data Structure

### Font Descriptor
```typescript
interface FontDescriptor {
  value: number                    // Font ID
  icon: JSX.Element               // Icon: Hand/Normal/Code/Heading
  text: string                    // Font name
  deprecated?: true               // Marks old fonts
  badge?: {
    type: 'red' | 'yellow' | 'green'
    placeholder: string           // "OLD", "NEW", etc.
  }
}
```

### Font Registry
```typescript
// All registered fonts
Fonts.registered.entries()  // Map<fontId, metadata>

// Each font has:
{
  metadata: {
    private: boolean        // Hidden from picker
    fallback: boolean       // Fallback font
    deprecated: boolean     // Mark as deprecated
  },
  fontFaces: ExcalidrawFontFace[]
}
```

### Font Grouping Logic
```
1. Scene Fonts
   ├─ All fonts already used in drawing
   └─ Always shown at top (even if deprecated)

2. Available Fonts
   ├─ All other fonts
   └─ Exclude deprecated (unless enabled)
```

---

## 🔄 State Management

### Component State
```typescript
const [searchTerm, setSearchTerm] = useState("")
const [hoveredFontFamily, setHoveredFontFamily] = useState(null)
const [selectedFontFamily, setSelectedFontFamily] = useState(null)
const [isOpened, setIsOpened] = useState(false)
```

### State Flows

**Opening Popover:**
```
isOpened: false
  ↓
User clicks trigger button
  ↓
isOpened: true
  ↓
FontPickerList mounts
  ↓
Search input focused (if not editing text)
```

**Searching:**
```
searchTerm: ""
  ↓
User types "nunito"
  ↓
searchTerm: "nunito"
  ↓
Filtered fonts updated
  ↓
hoveredFont: auto-set to first result
```

**Selecting Font:**
```
User hovers over font
  ↓
hoveredFontFamily: FONT_ID
  ↓
User presses Enter or clicks
  ↓
onSelect(hoveredFontFamily)
  ↓
selectedFontFamily: FONT_ID
  ↓
Font applied to text
  ↓
Popover closes
  ↓
Focus returns to text editor
```

---

## 🧠 Smart Features

### 1. Caret Position Preservation
When changing font during text editing, cursor position is preserved:
```typescript
// Before selection
const savedSelection = {
  start: textEditor.selectionStart,
  end: textEditor.selectionEnd
}

// After selection
textEditor.selectionStart = savedSelection.start
textEditor.selectionEnd = savedSelection.end
textEditor.focus()
```

**Why?** User doesn't lose typing position

---

### 2. Auto-Hover on Search
When user searches, first result is auto-hovered:
```typescript
if (!font && searchTerm) {
  if (filteredFonts[0]?.value) {
    onHover(filteredFonts[0].value)  // auto-select first
  } else {
    onLeave()  // no results
  }
}
```

**Why?** User can instantly press Enter to select

---

### 3. Smart Scroll-into-View
Keyboard navigation scrolls hovered font into view:
```typescript
if (isHovered) {
  if (order === 0) {
    ref.current?.scrollIntoView?.({ block: "end" })  // group title visible
  } else {
    ref.current?.scrollIntoView?.({ block: "nearest" })  // smooth scroll
  }
}
```

**Why?** Hovered item always visible in list

---

### 4. Scene Fonts Priority
Fonts already used in drawing appear first:
```typescript
const sceneFonts = allFonts.filter(
  font => sceneFamilies.has(font.value)  // used in drawing
)

// Display order:
// 1. Scene Fonts (at top)
// 2. Available Fonts (below)
```

**Why?** Frequently used fonts are easily accessible

---

### 5. Deprecated Font Handling
Old fonts marked but still accessible:
```typescript
const availableFonts = useMemo(
  () =>
    allFonts.filter(font =>
      !sceneFamilies.has(font.value) &&
      (showDeprecatedFonts || !font.deprecated)  // can toggle visibility
    ),
  [allFonts, showDeprecatedFonts]
)
```

**Why?** Legacy drawings can still use old fonts

---

## 📱 Responsive Behavior

### Compact Mode
```typescript
// Mobile/small screens
<FontPicker compactMode={true} />

// Changes:
// - No quick selection buttons (space saving)
// - Only trigger button visible
// - Popover sized for touch
// - Smaller padding and gaps
```

**CSS:**
```css
.FontPicker__container--compact {
  display: block;
  max-width: auto;  /* single column */
}

.properties-trigger.compact {
  width: 2rem;
  height: 2rem;
  padding: 0.25rem;
}
```

---

## ♿ Accessibility Features

### ARIA Labels
```html
<button
  aria-label="Hand-drawn font (Excalifont)"
  aria-keyshortcuts="Shift+F"
  title="Show Fonts"
  data-testid="font-family-show-fonts"
/>
```

### Semantic HTML
```html
<section aria-labelledby="fonts-title">
  <h2 id="fonts-title" class="visually-hidden">Fonts</h2>
  <!-- List content -->
</section>
```

### Keyboard Support
- Full keyboard navigation (Tab, Arrow keys, Enter)
- Focus indicators visible
- Skip links for search
- Tab order managed

### Screen Reader Support
- Group titles announced ("Scene Fonts", "Available Fonts")
- Font names read in their typeface
- Badge status announced ("deprecated")
- State changes announced ("Selected", "Hovered")

---

## 🎨 CSS Classes Reference

| Class | Purpose | Usage |
|-------|---------|-------|
| `.FontPicker__container` | Main wrapper | Layout grid |
| `.FontPicker__container--compact` | Mobile variant | Space-constrained |
| `.buttonList` | Quick select buttons | 3-button row |
| `.properties-trigger` | Trigger button | Font icon button |
| `.properties-content` | Popover wrapper | Styled container |
| `.dropdown-menu` | Font list | Scrollable container |
| `.dropdown-menu.fonts` | Font-specific styling | Custom styling |
| `.dropdown-menu-item` | Individual font | Button style |
| `.dropdown-menu-item.selected` | Active font | Highlight state |
| `.dropdown-menu-item.hovered` | Hover state | Highlight color |
| `.dropdown-menu-item-badge` | Deprecated tag | Red badge |
| `.quick-search-input` | Search field | Input styling |
| `.dropdown-menu-group` | Font group | Group header |
| `.dropdown-menu-group-title` | Group title | "Scene Fonts" text |
| `.excalidraw-wysiwyg` | Text editor | Text input field |

---

## 🔌 Integration Points

### App State
```typescript
// Global state
appState: {
  selectedFontFamily: FontFamilyValues
  openPopup: "fontFamily" | null
  editingTextElement: ElementType | null
}
```

### Props Flow
```
App
  ↓
FontPickerContainer
  ↓
FontPicker
  ├─ selectedFontFamily (from state)
  ├─ hoveredFontFamily (local state)
  ├─ onSelect (updates app state)
  ├─ onHover (local update)
  ├─ onPopupChange (updates app state)
  ├─ compactMode (responsive)
  │
  ├─ FontPickerTrigger
  │  └─ Show/hide popover
  │
  └─ FontPickerList
     ├─ QuickSearch
     ├─ ScrollableList
     └─ FontPickerListItem (per font)
```

---

## 📊 Performance Optimizations

### Memoization
```typescript
// Memoize expensive computations
const allFonts = useMemo(() => {
  // Build font registry
  // Filter and sort fonts
}, [])

const filteredFonts = useMemo(() => {
  // Filter by search term
}, [sceneFonts, availableFonts, searchTerm])

// Memoize component to prevent re-renders
export const FontPicker = React.memo(
  ({...props}) => {...},
  (prev, next) => {
    // Only re-render if these change
    return (
      prev.isOpened === next.isOpened &&
      prev.selectedFontFamily === next.selectedFontFamily &&
      prev.hoveredFontFamily === next.hoveredFontFamily
    )
  }
)
```

### Debouncing
```typescript
<QuickSearch
  onChange={debounce(setSearchTerm, 20)}  // 20ms delay
/>
```

---

## 🧪 Testing

### Test Coverage
```typescript
// FontPicker.test.tsx
describe('FontPicker', () => {
  test('renders default fonts')
  test('opens and closes popover')
  test('filters fonts by search term')
  test('handles keyboard navigation')
  test('selects font on click')
  test('preserves caret in text editor')
  test('shows scene fonts first')
  test('marks deprecated fonts')
})
```

### Testing IDs
```
data-testid="font-family-hand-drawn"
data-testid="font-family-normal"
data-testid="font-family-code"
data-testid="font-family-show-fonts"
data-testid="dropdown-menu-button"
```

---

## 🎬 Animation & Transitions

### Popover Animation
```css
.properties-content {
  animation: slideIn 0.2s ease-out;
  transform-origin: top center;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Hover Transitions
```css
.dropdown-menu-item {
  transition: all 0.15s ease;
  background-color: transparent;
}

.dropdown-menu-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
```

---

## 📋 Summary: User Journey Map

```
START: User has text selected
  │
  ├─→ QUICK PATH (Default Fonts)
  │   ├─ Sees 3 buttons in toolbar
  │   ├─ Clicks one button
  │   └─ Font instantly changes ✓
  │
  ├─→ SEARCH PATH (Specific Font)
  │   ├─ Clicks text icon
  │   ├─ Popover opens
  │   ├─ Types font name
  │   ├─ Results filter live
  │   ├─ Hovers/presses arrow keys
  │   ├─ Presses Enter or clicks
  │   └─ Font changes ✓
  │
  └─→ BROWSE PATH (Exploring Fonts)
      ├─ Clicks text icon
      ├─ Popover opens
      ├─ Scrolls through fonts
      ├─ Hovers to preview
      ├─ Sees scene fonts grouped
      ├─ Sees available fonts grouped
      ├─ Clicks selection
      └─ Font changes ✓

COMPLETION: Text is styled with new font
```

---

**Generated:** June 17, 2026  
**Source:** Excalidraw FontPicker Component  
**Files:** FontPicker.tsx, FontPickerList.tsx, FontPickerTrigger.tsx, keyboardNavHandlers.ts
