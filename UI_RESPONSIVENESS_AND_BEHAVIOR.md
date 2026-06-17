# UI Responsiveness & Behavior Guide

Complete analysis of how toolbar and font picker UI adapt across devices, screen sizes, input methods, and contexts.

---

## 📱 Device Categories & Form Factors

### Detection Method
```typescript
// App.tsx - determines mobile vs desktop
editorInterface.formFactor === "phone"  // Mobile
editorInterface.formFactor === "tablet" // Tablet (hybrid)
editorInterface.formFactor === "desktop" // Desktop

// Also detects user agent
this.editorInterface.userAgent.isMobileDevice
```

### CSS Class Application
```html
<!-- Desktop -->
<div class="excalidraw">
  <!-- Normal toolbar layout -->
</div>

<!-- Mobile -->
<div class="excalidraw excalidraw--mobile">
  <!-- Compact mobile toolbar -->
</div>
```

---

## 📊 Breakpoints & Responsive Layout

### Breakpoint Strategy

| Device | Width | Form Factor | Toolbar Layout | Input Method |
|--------|-------|------------|---|---|
| **Mobile Phone** | 320px - 480px | phone | Horizontal scrollable | Touch |
| **Mobile Portrait** | 481px - 768px | phone | Horizontal scrollable | Touch |
| **Tablet** | 769px - 1024px | tablet | Mixed (adaptive) | Touch + Pen |
| **Desktop** | 1025px+ | desktop | Full horizontal | Mouse + Keyboard |
| **Large Desktop** | 1500px+ | desktop | Full + sidebars | Mouse + Keyboard |

### CSS Variables

```scss
// Device sizes
--default-button-size: 2rem;        // Base button (desktop)
--mobile-action-button-size: 2rem;  // Button on mobile
--lg-icon-size: 1.5rem;            // Large icon
--default-icon-size: 1rem;         // Standard icon
--sm-icon-size: 0.75rem;           // Small icon

// Spacing
--space-factor: 0.25rem;           // Base spacing unit
--gap-default: 0.5rem;             // Default gap between elements
--gap-mobile: 0.25rem;             // Tighter mobile gaps

// Touch targets
--touch-target-size: 2rem;         // Min touch target (44px recommended)
```

---

## 🎯 Toolbar Layout Adaptation

### DESKTOP VIEW (1025px+)

```
┌──────────────────────────────────────────────────────────┐
│ App-menu App-menu_top                                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ☰ [Shape Actions] | [🖐️][▶️][⭕][◇][→][–][✏️][A][🖼️][E] ║ ⚙️ │
│  Menu  Selected    ║ Tools (all visible)               ║ More   │
│                                                          │
└──────────────────────────────────────────────────────────┘

Properties:
- All tools visible in single row
- Toolbar is full width
- Dropdowns open downward (space below)
- Menu opens to the right
- Font picker shows full list
- Uses Mouse hover for previews
```

**CSS:**
```scss
.excalidraw {
  .App-menu_top {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    justify-content: space-between;
    width: 100%;
  }

  .App-toolbar {
    display: flex;
    flex-direction: row;
    gap: 0.25rem;
    overflow: visible;
  }

  .Island {
    padding: 0.75rem;
    display: flex;
  }
}
```

**Behaviors:**
- ✅ All tools always visible
- ✅ Hover previews on fonts
- ✅ Dropdowns open to right/down
- ✅ Full keyboard navigation
- ✅ No scrolling needed

---

### TABLET VIEW (769px - 1024px)

```
┌────────────────────────────────┐
│ ☰ [🖐️][▶️][⭕][◇][→][–][✏️]... │ ⚙️
│ Menu Tools (scrollable)         │ More
│                                 │
│ [A] [Code] [Monospace]         │ (Font quick select)
└────────────────────────────────┘

Properties:
- Tools fit but might be tight
- Horizontal scroll for overflow
- Touch-friendly sizes
- Larger touch targets
- Dropdowns adjust direction
```

**CSS:**
```scss
@include isMobile() {
  .App-toolbar {
    max-width: calc(
      2rem + 4 * var(--default-button-size)
    );
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  .Island {
    padding: 0.5rem;
  }
}
```

**Behaviors:**
- ⚠️ Horizontal scrolling for tools
- ⚠️ Larger touch targets (48px+)
- ⚠️ No hover previews (touch-first)
- ⚠️ Dropdowns adapt position
- ⚠️ Long-press for context menu

---

### MOBILE PHONE VIEW (320px - 768px)

```
┌──────────────────────────────┐
│ ☰  [🖐️][▶️]  ➕ | [A] [⚙️]    │
│ Menu (compact)  More  Toolbar │
│                               │
│ [🖐️] [▶️] [⭕] [◇] [→] [–]... │
│   (scrollable)                │
│                               │
│ Font picker (if open):        │
│ ┌─────────────────────────────┤
│ │ 🔍 Search                   │
│ │ ✓ Hand-drawn                │
│ │   Normal                    │
│ │   Code                      │
│ └─────────────────────────────┤
└──────────────────────────────┘

Properties:
- Minimal header (hamburger menu)
- Compact toolbar
- Stacked vertical (not horizontal)
- Large touch targets
- Full-height modals for pickers
```

**CSS:**
```scss
@include isMobile() {
  .excalidraw--mobile {
    --mobile-action-button-size: 2rem;
  }

  .App-menu {
    flex-direction: column;
    gap: 0.25rem;
  }

  .mobile-toolbar {
    display: flex;
    flex: 1;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    
    .ToolIcon {
      min-width: 2rem;
      min-height: 2rem;
      flex-shrink: 0;
      
      svg {
        width: 1rem;
        height: 1rem;
      }
    }
  }

  .FontPicker__container--compact {
    display: block;
    max-width: auto;
  }

  .properties-content {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100vw;
    max-height: 60vh;
    border-radius: 12px 12px 0 0;
  }
}
```

**Behaviors:**
- 📱 Hamburger menu collapses toolbar
- 📱 Tools scroll horizontally
- 📱 Large touch targets (48px minimum)
- 📱 Popovers become bottom sheets
- 📱 No hover states (touch-only)
- 📱 Long-press for context menus

---

## 🖱️ Input Method Adaptation

### MOUSE + KEYBOARD (Desktop)

**Toolbar Behavior:**
```
Hover over tool → Tooltip appears
  ↓
Click tool → Select immediately
  ↓
Hold shift+click → Multi-select

Keyboard shortcuts:
  R → Rectangle
  O → Ellipse
  A → Arrow
  L → Line
  P → Pen
  T → Text
  E → Eraser
```

**Font Picker:**
```
Hover over font → Preview shows
  ↓
Click → Select immediately
  ↓
Type to search → Filters live
  ↓
Arrow keys → Navigate
  ↓
Enter → Select
```

**CSS:**
```scss
.excalidraw:not(.excalidraw--mobile) {
  .ToolIcon__icon {
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }

  .dropdown-menu-item:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .tooltip {
    display: block;
  }
}
```

---

### TOUCH (Mobile/Tablet)

**Toolbar Behavior:**
```
Tap tool → Select immediately (no hover preview)
  ↓
Long-press → Context menu appears
  ↓
Two-finger tap → Undo/alternate action
  ↓
Swipe → Pan canvas
```

**Font Picker:**
```
Tap search input → Keyboard appears
  ↓
Type → Filters live
  ↓
Tap font → Select (no hover preview)
  ↓
Long-press → More options (if any)
```

**CSS:**
```scss
@include isMobile() {
  .ToolIcon__icon {
    &:hover {
      background-color: transparent !important;
    }
    
    &:active {
      background-color: rgba(0, 0, 0, 0.08);
    }
  }

  .dropdown-menu-item:hover {
    background-color: transparent !important;
  }

  .dropdown-menu-item:active {
    background-color: rgba(0, 0, 0, 0.08);
  }

  button {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }
}
```

---

### PEN/STYLUS (Tablet with Apple Pencil, etc.)

**Behavior:**
```
Light tap → Select
  ↓
Harder press → Context menu
  ↓
Barrel button + tap → Undo
  ↓
Two-finger tap → Pan
```

**Note:** Handled by device OS (not custom code)

---

## 📍 Dropdowns & Popovers

### Desktop Behavior

```
┌─────────────────────┐
│ Trigger Button      │
└──────┬──────────────┘
       │
       ├─→ Opens down-right
       │
       ▼
    ┌──────────────────┐
    │ Option 1         │
    │ Option 2         │
    │ Option 3         │
    └──────────────────┘
```

**CSS:**
```scss
.properties-content {
  position: absolute;
  top: auto;
  left: auto;
  right: var(--popover-offset);
  bottom: var(--popover-offset);
  
  max-height: 60vh;
  overflow-y: auto;
  
  background-color: white;
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

---

### Mobile Behavior

```
Device Screen
┌─────────────────────┐
│ Trigger Button      │
│ [Font Picker]       │
├─────────────────────┤
│                     │
│ 🔍 Search...        │ ← Sheet slides up from bottom
│ ✓ Font 1            │
│   Font 2            │
│   Font 3            │
│   ... (scrollable)  │
│                     │
└─────────────────────┘
```

**CSS:**
```scss
@include isMobile() {
  .PropertiesPopover {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    
    width: 100vw;
    max-width: 100%;
    max-height: 60vh;
    
    border-radius: 12px 12px 0 0;
    
    animation: slideUpIn 0.3s ease-out;
  }

  @keyframes slideUpIn {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
}
```

---

## 🎬 Animation Differences

### Desktop

```css
.properties-content {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Properties:**
- Quick fade-in (150ms)
- Smooth transitions (200ms)
- Hover effects on elements

---

### Mobile

```css
@include isMobile() {
  .properties-content {
    animation: slideUpIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  button {
    &:active {
      transform: scale(0.95);
      animation: none;
    }
  }
}
```

**Properties:**
- Slide-up from bottom (300ms)
- Tap feedback (scale down)
- No hover animations
- Haptic feedback (device-level)

---

## 👆 Touch Target Sizing

### Minimum Touch Target

```
Desktop:   16px (optional)
Tablet:    44px (recommended)
Mobile:    48px (Apple) / 56px (Android Material)
```

**Excalidraw Implementation:**

```scss
// Default button size: 32px (on desktop)
--default-button-size: 2rem;

// Mobile button size: 32px (can be enlarged with context)
--mobile-action-button-size: 2rem;

// Icon size: 16px (on 32px button = 8px padding)
--default-icon-size: 1rem;

// Formula: (Button - Icon) / 2 = Padding
// (32px - 16px) / 2 = 8px padding
```

**Best Practices:**
- ✅ Minimum 44x44px touch targets
- ✅ 8-16px padding around icons
- ✅ Spacing between targets ≥8px
- ✅ Hold duration: 500ms for long-press

---

## 🔄 Orientation Changes

### Portrait → Landscape

```
Portrait (Mobile):
┌──────────────────┐
│ ☰ [Tools..]      │
│                  │
│ [Canvas 80%]     │
│                  │
│ Font picker...   │
└──────────────────┘
  (320px wide)

    ↓ (Rotate)

Landscape (Mobile):
┌────────────────────────────────┐
│ ☰ [Tools.........] | Font      │
│        [Canvas 70%]            │
└────────────────────────────────┘
  (640px wide)
```

**CSS:**
```scss
@media (orientation: portrait) {
  .Canvas {
    max-width: 100%;
    max-height: 100%;
  }

  .toolbar-container {
    width: 100%;
  }
}

@media (orientation: landscape) {
  .Layer-UI {
    flex-direction: row;
  }

  .toolbar-container {
    width: auto;
  }
}
```

**Behaviors:**
- Content reflows automatically
- Popovers reposition
- Focus maintained (if possible)
- No data loss

---

## 🪟 Viewport Management

### Safe Area (Notched Devices)

```
┌──────────────────────┐
│ [Notch]              │ Safe area: ignore top 44px
├──────────────────────┤
│ ☰ [Tools]            │
│                      │
│ [Canvas]             │
│                      │
├──────────────────────┤
│ [Home indicator] │   │ Safe area: ignore bottom 34px
└──────────────────────┘
```

**CSS:**
```scss
@supports (padding: max(0px)) {
  .App-menu {
    padding-top: max(0.5rem, env(safe-area-inset-top));
  }

  .layer-ui {
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
}
```

---

## 🎛️ Popover Positioning Logic

### Intelligent Placement

```javascript
function getPopoverPosition(triggerRect, viewportWidth, popoverWidth) {
  // Desktop: right-aligned by default
  if (viewportWidth > 1024) {
    return {
      right: 16,
      top: triggerRect.bottom + 8
    }
  }

  // Tablet: center if enough space
  if (viewportWidth > 768) {
    const centerLeft = (viewportWidth - popoverWidth) / 2
    return {
      left: centerLeft,
      top: triggerRect.bottom + 8
    }
  }

  // Mobile: full-width bottom sheet
  return {
    left: 0,
    right: 0,
    bottom: 0,
    top: 'auto'
  }
}
```

---

## ♿ Accessibility Across Devices

### Desktop
- ✅ Full keyboard support
- ✅ Focus indicators visible
- ✅ ARIA labels
- ✅ Screen reader support
- ✅ Tooltips on hover

### Mobile
- ✅ Touch-friendly labels
- ✅ Large hit targets
- ✅ Screen reader support
- ✅ VoiceOver / TalkBack
- ⚠️ No hover states
- ⚠️ No tooltips (unless tap-triggered)

**CSS:**
```scss
/* Focus styles visible on all devices */
button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Mobile: no focus on tap, only on keyboard */
@include isMobile() {
  button:focus:not(:focus-visible) {
    outline: none;
  }
}
```

---

## 📊 Performance Optimizations

### Desktop
```
- Full DOM elements rendered
- Hover states with transitions
- Complex popovers
- No lazy loading needed
```

### Mobile
```
- Simplified DOM (hidden elements via CSS)
- Reduced animations
- Bottom sheet (GPU accelerated)
- Lazy-load font lists (if very long)
```

**CSS:**
```scss
@include isMobile() {
  /* Reduce paint/layout thrashing */
  .properties-content {
    will-change: transform;
    transform: translateZ(0);  /* GPU acceleration */
  }

  /* Hide desktop-only elements */
  .desktop-only-ui {
    display: none;
  }
}
```

---

## 🧠 User Story: Cross-Device Font Selection

### Story 1: Desktop User (Mouse + Keyboard)

```
User on 27" monitor with mouse
  ↓
Opens font picker → See all fonts at once
  ↓
Type "nunito" → Filter happens live
  ↓
Hover shows preview → Font rendered instantly
  ↓
Click → Font selected
  ↓
Popover closes → Focus returns to text area
✅ Fast, efficient, preview-driven
```

---

### Story 2: Tablet User (Touch + Stylus)

```
User on iPad with Apple Pencil
  ↓
Tap font trigger → Opens bottom sheet
  ↓
Tap search → Keyboard appears
  ↓
Type "code" → Filter happens
  ↓
Scroll list → Smooth scrolling
  ↓
Tap font → Select (no preview)
  ↓
Sheet slides down → Back to canvas
✅ Touch-first, full-screen, efficient
```

---

### Story 3: Mobile User (Phone, Touch Only)

```
User on iPhone, landscape mode
  ↓
Tap font button → Bottom sheet slides up
  ↓
Sheet takes 60% of screen
  ↓
Tap search → Phone keyboard appears
  ↓
Type font name → Filters
  ↓
Scroll results → One hand operation
  ↓
Tap font → Select
  ↓
Keyboard dismissed → Sheet closes
✅ One-handed, efficient, no wasted space
```

---

## 📋 Responsive Checklist

### Desktop (1025px+)
- [ ] All tools visible
- [ ] Hover previews work
- [ ] Dropdowns open correctly
- [ ] Full keyboard nav
- [ ] Tooltips show
- [ ] Multiple windows work

### Tablet (769px - 1024px)
- [ ] Tools scroll horizontally
- [ ] Touch targets ≥44px
- [ ] Popovers reposition
- [ ] No hover needed
- [ ] Pinch-zoom works
- [ ] Rotation handled

### Mobile (≤768px)
- [ ] Hamburger menu works
- [ ] Tools scrollable
- [ ] Touch targets ≥48px
- [ ] Bottom sheets work
- [ ] Full height modals
- [ ] Safe areas respected
- [ ] Notch/home indicator ignored

---

## 🎯 CSS Mixin Reference

```scss
// Desktop-specific styles
.excalidraw {
  // Desktop: normal layout
}

// Mobile-specific styles (applies `.excalidraw--mobile`)
@include isMobile() {
  // Mobile: compact layout
}

// Usage in component
.properties-content {
  /* Desktop defaults */
  position: absolute;
  max-height: 60vh;

  @include isMobile() {
    /* Mobile overrides */
    position: fixed;
    bottom: 0;
    max-height: 60vh;
  }
}
```

---

## 🔍 Debugging Responsive Issues

### Chrome DevTools
1. Toggle device toolbar (Ctrl+Shift+M)
2. Test different device presets
3. Test orientation change
4. Test touch simulation
5. Check SafeArea with notch
6. Check scrollbar behavior

### Testing Checklist
```
□ Touch targets clickable
□ No content overflow
□ Text readable (no zoom needed)
□ Buttons accessible
□ Dropdowns visible
□ Keyboard doesn't hide content
□ Orientation changes work
□ No horizontal scroll (except intentional)
□ Performance smooth (60fps)
□ Haptic feedback works (mobile)
```

---

## 📱 Form Factor Detection

```typescript
// From App.tsx
const isMobile = editorInterface.formFactor === "phone"
const isTablet = editorInterface.formFactor === "tablet"
const isDesktop = editorInterface.formFactor === "desktop"

// Apply class
<div className={clsx({
  'excalidraw--mobile': isMobile || isTablet
})}>
  {/* Content */}
</div>
```

---

**Summary:** The UI elegantly adapts across all devices using CSS mixins, form factor detection, and intelligent popover positioning. Desktop users get full-featured UI with previews, while mobile users get touch-optimized bottom sheets and scrollable toolbars. All breakpoints maintain accessibility and usability.

Generated: June 17, 2026
