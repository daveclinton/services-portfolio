# Toolbar Component Structure & CSS Reference

Complete breakdown of the Excalidraw toolbar component with all CSS classes, properties, and DOM hierarchy.

---

## 🏗️ Component Hierarchy & Layout

```
App-menu (Top Menu Container)
│
├─ App-menu_top (Top Section)
│  │
│  ├─ Stack Stack_vertical App-menu_top__left (Left Menu)
│  │  │
│  │  ├─ dropdown-menu-event-wrapper
│  │  │  └─ dropdown-menu-button main-menu-trigger (Hamburger Menu)
│  │  │
│  │  └─ selected-shape-actions-container (Selected Shape Actions)
│  │
│  ├─ shapes-section (Shapes Toolbar)
│  │  │
│  │  └─ Stack Stack_vertical (Container)
│  │     │
│  │     └─ Stack Stack_horizontal App-toolbar-container
│  │        │
│  │        └─ Island App-toolbar App-toolbar--compact (Toolbar)
│  │           │
│  │           ├─ HintViewer (Help Text)
│  │           ├─ h2.visually-hidden (Accessible Title)
│  │           └─ Stack Stack_horizontal (Tools Container)
│  │              │
│  │              ├─ ToolIcon ToolIcon__lock (Lock Toggle)
│  │              ├─ App-toolbar__divider
│  │              ├─ ToolIcon Shape (Hand Tool)
│  │              ├─ ToolIcon Shape.active (Selection Tool - Active)
│  │              ├─ ToolIcon Shape.fillable (Rectangle)
│  │              ├─ ToolIcon Shape.fillable (Diamond)
│  │              ├─ ToolIcon Shape.fillable (Ellipse)
│  │              ├─ ToolIcon Shape.fillable (Arrow)
│  │              ├─ ToolIcon Shape.fillable (Line)
│  │              ├─ ToolIcon Shape (Draw)
│  │              ├─ ToolIcon Shape (Text)
│  │              ├─ ToolIcon Shape (Image)
│  │              ├─ ToolIcon Shape (Eraser)
│  │              ├─ App-toolbar__divider
│  │              └─ dropdown-menu-button (More Tools)
│  │
│  └─ layer-ui__wrapper__top-right (Right UI Container)
│     │
│     ├─ excalidraw-ui-top-right (Right UI Wrapper)
│     │  └─ excalidraw-button collab-button (Collaboration Button)
│     │
│     └─ sidebar-trigger__label-element (Library Trigger)
│        └─ sidebar-trigger default-sidebar-trigger (Library Button)
│
└─ ... (Other sections below)
```

---

## 📦 CSS Classes & Properties

### 1. `.App-menu`
**Purpose:** Top-level menu container

```css
.App-menu {
  /* Layout container for menu bar */
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  /* Properties vary based on zen-mode-transition class */
  transition: all 0.3s ease;
}

.App-menu_top {
  /* Top menu section */
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1rem; /* Adjusted based on --gap variable */
  padding: 0.5rem;
  background-color: transparent;
}
```

---

### 2. `.Stack` (Layout Utility)
**Purpose:** Flexible container with gap spacing

```css
.Stack {
  display: flex;
  gap: var(--gap, 1rem);
}

.Stack_vertical {
  flex-direction: column;
  align-items: flex-start;
}

.Stack_horizontal {
  flex-direction: row;
  align-items: center;
}

/* CSS Variable: --gap */
/* Usage: style="--gap: 4;" translates to gap calculation */
/* Likely: gap = var(--gap) * 0.25rem or similar unit conversion */
```

**Properties:**
- `display: flex`
- `flex-direction: column | row`
- `gap: var(--gap)`
- `align-items: flex-start | center`
- `justify-items: start | center` (when specified)

---

### 3. `.App-menu_top__left`
**Purpose:** Left section of top menu

```css
.App-menu_top__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4 * 0.25rem; /* From inline style="--gap: 4" */
  
  /* Zen mode transition */
  transition: opacity 0.3s ease, transform 0.3s ease;
}
```

---

### 4. `.dropdown-menu-event-wrapper`
**Purpose:** Wrapper for dropdown functionality

```css
.dropdown-menu-event-wrapper {
  display: contents; /* Content appears outside wrapper */
  /* Allows children to be direct children in grid/flex */
}

.dropdown-menu-event-wrapper[style*="display: contents"] {
  /* Browser renders children as if wrapper doesn't exist */
  /* No box model, no layout contribution */
}
```

---

### 5. `.dropdown-menu-button` & `.main-menu-trigger`
**Purpose:** Hamburger menu button

```css
.dropdown-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Button reset */
  border: none;
  background: transparent;
  padding: 0.5rem;
  cursor: pointer;
  
  /* SVG icon size */
  width: 1.5rem;
  height: 1.5rem;
  
  /* Accessibility */
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
  
  /* Hover state */
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  /* Active/Open state */
  &[data-state="open"] {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.main-menu-trigger {
  /* Additional styles for main menu */
  position: relative;
  z-index: 1000;
}

.zen-mode-transition {
  /* Transition applied in zen mode */
  transition: opacity 0.3s ease, transform 0.3s ease;
}
```

**Attributes:**
- `type="button"`
- `id="radix-:r2:"` (Radix UI generated ID)
- `aria-haspopup="menu"`
- `aria-expanded="false|true"`
- `data-state="closed|open"`
- `data-testid="main-menu-trigger"`

---

### 6. `.selected-shape-actions-container`
**Purpose:** Container for selected shape actions

```css
.selected-shape-actions-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  
  /* Compact variant */
  &--compact {
    min-width: 0;
    overflow: hidden;
  }
}
```

---

### 7. `.shapes-section`
**Purpose:** Semantic section for shapes toolbar

```css
.shapes-section {
  /* Semantic HTML5 element */
  display: flex;
  flex-direction: column;
  
  /* Accessibility */
  aria-labelledby: "[id from h2]";
}

.shapes-section > div {
  position: relative;
  /* Positioning context for dropdown menus */
}
```

---

### 8. `.Island`
**Purpose:** Card/container with visual separation

```css
.Island {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  /* Visual styling */
  background-color: var(--bg-color, #ffffff);
  border-radius: 0.375rem; /* 6px */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  
  /* Spacing */
  padding: var(--padding, 0.75rem);
  
  /* Transitions */
  transition: box-shadow 0.2s ease, background-color 0.2s ease;
}

.Island:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
```

---

### 9. `.App-toolbar`
**Purpose:** Main toolbar container

```css
.App-toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  
  /* Inherit Island styles */
  
  /* Compact variant */
  &--compact {
    gap: 0.25rem;
    padding: 0.5rem;
    max-width: 100vw;
    overflow-x: auto;
    
    /* Scrollbar styling for horizontal scroll */
    &::-webkit-scrollbar {
      height: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
    }
  }
}

.App-toolbar-container {
  position: relative;
}
```

**Attributes:**
- `style="--padding: 1;"` - CSS variable for padding calculation

---

### 10. `.HintViewer`
**Purpose:** Help/hint text display

```css
.HintViewer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  font-size: 0.75rem;
  color: var(--text-secondary, #666666);
  
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  padding: 0 0.5rem;
  
  /* Accessible hint styling */
  & kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    
    padding: 0.125rem 0.375rem;
    background-color: #f0f0f0;
    border: 1px solid #d0d0d0;
    border-radius: 0.25rem;
    
    font-family: monospace;
    font-size: 0.7rem;
    font-weight: 500;
  }
}
```

---

### 11. `.ToolIcon`
**Purpose:** Individual tool button/label wrapper

```css
.ToolIcon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  position: relative;
  
  /* Button reset */
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  
  /* Size variants */
  &_size_medium {
    width: 1.5rem;
    height: 1.5rem;
  }
  
  &_size_small {
    width: 1.25rem;
    height: 1.25rem;
  }
  
  &_size_large {
    width: 2rem;
    height: 2rem;
  }
  
  /* Type variants */
  &_type_checkbox {
    /* Hidden checkbox input */
    display: none;
    
    /* Visible when checked */
    &:checked + .ToolIcon__icon {
      color: var(--primary-color);
    }
  }
  
  &_type_radio {
    /* Hidden radio input */
    display: none;
    
    /* Visible when checked */
    &:checked + .ToolIcon__icon {
      color: var(--primary-color);
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
  
  /* State variants */
  &.active {
    & .ToolIcon__icon {
      color: var(--primary-color);
      background-color: rgba(0, 0, 0, 0.08);
    }
  }
  
  &.fillable {
    /* Tools that support fill */
  }
  
  &__lock {
    /* Lock toggle button */
  }
  
  /* Hover state */
  &:hover:not(:disabled) .ToolIcon__icon {
    background-color: rgba(0, 0, 0, 0.03);
    transition: background-color 0.2s ease;
  }
}

.ToolIcon__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 100%;
  height: 100%;
  
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  
  /* SVG styling */
  & svg {
    width: 100%;
    height: 100%;
    stroke: currentColor;
    fill: none;
  }
}

.ToolIcon__keybinding {
  display: flex;
  align-items: center;
  justify-content: center;
  
  position: absolute;
  bottom: -0.25rem;
  right: -0.25rem;
  
  width: 1rem;
  height: 1rem;
  
  background-color: var(--primary-color);
  color: white;
  
  font-size: 0.6rem;
  font-weight: 600;
  
  border-radius: 0.125rem;
}
```

**HTML Structure:**
```html
<label class="ToolIcon Shape fillable">
  <input type="radio" class="ToolIcon_type_radio" name="editor-current-shape">
  <div class="ToolIcon__icon">
    <svg>...</svg>
    <span class="ToolIcon__keybinding">2</span>
  </div>
</label>
```

---

### 12. `.App-toolbar__divider`
**Purpose:** Visual separator between tool groups

```css
.App-toolbar__divider {
  width: 1px;
  height: 1.5rem;
  background-color: rgba(0, 0, 0, 0.1);
  margin: 0 0.25rem;
  
  /* Vertical line separator */
}
```

---

### 13. `.layer-ui__wrapper__top-right`
**Purpose:** Right-side UI container

```css
.layer-ui__wrapper__top-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  
  position: fixed;
  top: 0.5rem;
  right: 0.5rem;
  
  z-index: 900;
  
  /* Zen mode transition */
  &.zen-mode-transition {
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  
  /* Compact variant */
  &--compact {
    gap: 0.25rem;
    top: 0.25rem;
    right: 0.25rem;
  }
}
```

---

### 14. `.excalidraw-ui-top-right`
**Purpose:** Right UI content container

```css
.excalidraw-ui-top-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
```

---

### 15. `.excalidraw-button` & `.collab-button`
**Purpose:** General button styling + collaboration button

```css
.excalidraw-button {
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Button reset */
  border: 1px solid #d0d0d0;
  background-color: #ffffff;
  padding: 0.5rem;
  border-radius: 0.375rem;
  
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* Icon sizing */
  & svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke: currentColor;
  }
  
  /* Hover state */
  &:hover {
    background-color: #f5f5f5;
    border-color: #999999;
  }
  
  /* Active/Focus state */
  &:focus,
  &:active {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
}

.collab-button {
  position: relative;
  
  /* Notification indicator */
  &::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 0.5rem;
    height: 0.5rem;
    background-color: #ff0000;
    border-radius: 50%;
    display: none;
    
    /* Shows when there's a notification */
    &[data-has-notification="true"]::after {
      display: block;
    }
  }
}
```

**Attributes:**
- `type="button"`
- `title="Live collaboration..."`
- `style="position: relative;"`

---

### 16. `.sidebar-trigger__label-element` & `.sidebar-trigger`
**Purpose:** Library sidebar trigger button

```css
.sidebar-trigger__label-element {
  display: flex;
  align-items: center;
  justify-content: center;
  
  cursor: pointer;
  
  /* Hidden checkbox */
  & input {
    display: none;
  }
  
  /* Toggle behavior on checkbox change */
  & input:checked + .sidebar-trigger {
    /* Active state */
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.sidebar-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  
  padding: 0.5rem;
  border-radius: 0.375rem;
  
  transition: background-color 0.2s ease;
  cursor: pointer;
  
  & svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: currentColor;
    stroke-width: 1.75;
  }
}

.default-sidebar-trigger {
  /* Default theme for sidebar trigger */
  background-color: transparent;
  border: 1px solid #d0d0d0;
  
  &:hover {
    background-color: #f5f5f5;
  }
}
```

**Attributes:**
- `title="Library"`
- `aria-label="Library"`
- `aria-keyshortcuts="0"`

---

## 🎨 CSS Variables & Theme

```css
/* Gap calculations */
--gap: 4; /* Inline style - translates to 1rem or based on formula */
--gap: 1; /* CSS value: 0.25rem */
--gap: 0.5; /* CSS value: 0.125rem */

/* Padding calculations */
--padding: 1; /* Translates to 0.75rem or 0.5rem */

/* Colors (Theme-dependent) */
--primary-color: #0066ff;
--text-primary: #000000;
--text-secondary: #666666;
--bg-color: #ffffff;
--border-color: #d0d0d0;

/* Transitions */
--transition-duration: 0.2s;
--transition-timing: ease;
```

---

## 🔧 Interactive States

### Button States
```css
/* Default */
button {
  background-color: #ffffff;
  border-color: #d0d0d0;
}

/* Hover */
button:hover {
  background-color: #f5f5f5;
}

/* Active/Selected (for radio/checkbox inputs) */
input:checked + .ToolIcon__icon {
  background-color: rgba(0, 0, 0, 0.08);
  color: var(--primary-color);
}

/* Focus (Accessibility) */
button:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Disabled */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Open/Expanded (for dropdowns) */
[data-state="open"] {
  background-color: rgba(0, 0, 0, 0.1);
}
```

---

## 📐 Sizing & Spacing System

```
Unit Scale:
- 0.125rem (2px)
- 0.25rem (4px)
- 0.375rem (6px)
- 0.5rem (8px)
- 0.75rem (12px)
- 1rem (16px)
- 1.25rem (20px)
- 1.5rem (24px)
- 2rem (32px)

Gap/Margin System (via --gap variable):
- --gap: 0.5 = 0.125rem
- --gap: 1 = 0.25rem
- --gap: 2 = 0.5rem
- --gap: 4 = 1rem
```

---

## ♿ Accessibility Features

```html
<!-- ARIA Labels -->
<button aria-label="Hand (panning tool)"></button>
<button aria-haspopup="menu" aria-expanded="false"></button>

<!-- Keyboard Shortcuts -->
<button aria-keyshortcuts="H or null"></button>

<!-- Hidden Labels -->
<h2 class="visually-hidden" id="YsdhgVBhJkHzgu5l0OWj2-shapes-title">Shapes</h2>
<section aria-labelledby="YsdhgVBhJkHzgu5l0OWj2-shapes-title"></section>

<!-- Keyboard Binding Display -->
<span class="ToolIcon__keybinding">2</span> <!-- Shows "2" key -->
```

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 🎬 Animations & Transitions

```css
/* Zen Mode Transition */
.zen-mode-transition {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

/* General transitions */
transition: background-color 0.2s ease;
transition: all 0.2s ease;
transition: opacity 0.3s ease, transform 0.3s ease;

/* Keyframe example (if used) */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

---

## 📱 Responsive Behavior

```css
/* Compact mode (for smaller screens) */
.App-toolbar--compact {
  gap: 0.25rem;
  padding: 0.5rem;
  overflow-x: auto;
}

.layer-ui__wrapper__top-right--compact {
  gap: 0.25rem;
  top: 0.25rem;
  right: 0.25rem;
}

/* Media queries (if needed) */
@media (max-width: 768px) {
  .App-menu_top {
    flex-direction: column;
  }
  
  .layer-ui__wrapper__top-right {
    position: static;
    top: auto;
    right: auto;
  }
}
```

---

## 🔌 Integration Points

### Radix UI
- `id="radix-:r2:"` - Radix-generated IDs for dropdowns
- `aria-haspopup="menu"` - ARIA dropdown attribute
- `data-state="open|closed"` - Dropdown state tracking
- `display: contents` - Used for wrapper styling

### React
- `className` binding for dynamic classes
- Event handlers on buttons
- State management for tool selection
- Props passed to styled components

### TypeScript
```typescript
interface ToolbarProps {
  activeTool: string
  onToolChange: (tool: string) => void
  isCompact?: boolean
}

type ToolType = 'selection' | 'rectangle' | 'diamond' | 'ellipse' | 'arrow' | 'line' | 'draw' | 'text' | 'image' | 'eraser'
```

---

## 📋 Component Props & Attributes

| Class | Element | Role | Key Attributes |
|-------|---------|------|---|
| `.dropdown-menu-button` | `button` | Menu trigger | `aria-haspopup`, `aria-expanded`, `data-state` |
| `.ToolIcon` | `label` | Tool selector | - |
| `.ToolIcon_type_radio` | `input[type=radio]` | Exclusive selection | `name="editor-current-shape"`, `checked` |
| `.ToolIcon_type_checkbox` | `input[type=checkbox]` | Toggle | `aria-label`, `data-testid` |
| `.Island` | `div` | Card container | `style` (CSS variables) |
| `.shapes-section` | `section` | Semantic section | `aria-labelledby` |
| `.excalidraw-button` | `button` | Action button | `type="button"`, `title` |
| `.sidebar-trigger__label-element` | `label` | Toggle wrapper | - |
| `.Stack` | `div` | Layout utility | `style` (--gap variable) |

---

## 🎯 Key Design Patterns

1. **Display Contents:** `.dropdown-menu-event-wrapper` uses `display: contents` to avoid extra DOM layers
2. **CSS Variables:** `--gap` and `--padding` for responsive spacing
3. **State Classes:** `.active`, `.fillable` for visual states
4. **Accessibility First:** ARIA labels, semantic HTML, keyboard shortcuts
5. **Transitions:** Smooth animations for state changes
6. **Component Composition:** Reusable `.ToolIcon`, `.Island`, `.Stack` components
7. **Responsive Classes:** `--compact` variants for smaller viewports

---

**Generated:** June 17, 2026
**Source:** Excalidraw Toolbar Component
**Reference:** Complete CSS structure with all classes and properties documented
