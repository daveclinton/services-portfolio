// Native scrolling, with the visible (keyboard-safe) viewport as its bounds.
// References: React Aria's mobile viewport work, MDN focus/scrollIntoView, and
// W3C Focus Not Obscured. No scrolling engine or timing-based keyboard guesses.
export type RevealOptions = { block?: "start" | "nearest"; animate?: boolean }

export function isTextEntry(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.matches('textarea, [contenteditable="true"], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="file"]):not([type="range"]):not([type="color"])')
}

export function updateViewportMetrics(element?: HTMLElement) {
  const root = document.documentElement
  const viewport = window.visualViewport
  // Pinch zoom belongs to the reader. Do not pan or resize around their zoom.
  if (viewport && viewport.scale > 1.01) {
    root.style.removeProperty("--visible-height")
    root.style.removeProperty("--visible-top")
    root.style.removeProperty("scroll-padding-top")
    root.style.removeProperty("scroll-padding-bottom")
    return null
  }
  const top = viewport?.offsetTop ?? 0
  const height = viewport?.height ?? window.innerHeight
  root.style.setProperty("--visible-height", `${height}px`)
  root.style.setProperty("--visible-top", `${top}px`)
  let start = top
  let end = top + height
  const modal = element?.closest("dialog[open]")
  if (!modal) {
    const header = document.querySelector<HTMLElement>(".site-nav")
    if (header) {
      const rect = header.getBoundingClientRect()
      const style = getComputedStyle(header)
      // A sticky header can be partly outside its containing block before we
      // scroll. Reserve its full pinned height, not just today's visible slice.
      const pinned = style.position === "sticky" ? top + Math.max(0, Number.parseFloat(style.top) || 0) + rect.height : rect.bottom
      if (rect.top <= start + rect.height && (rect.bottom > start || style.position === "sticky")) start = Math.max(start, rect.bottom, pinned)
    }
    const footer = document.querySelector<HTMLElement>(".signals-bar")
    if (footer && getComputedStyle(footer).visibility !== "hidden") {
      const rect = footer.getBoundingClientRect()
      if (rect.top < end && rect.bottom >= end) end = Math.min(end, rect.top)
    }
  }
  root.style.scrollPaddingTop = `${start}px`
  root.style.scrollPaddingBottom = `${Math.max(0, window.innerHeight - end)}px`
  return { top: start, bottom: end }
}

export function revealElement(element: HTMLElement | null, { block = "nearest", animate = true }: RevealOptions = {}) {
  if (!element?.isConnected || !element.getClientRects().length) return
  const bounds = updateViewportMetrics(element)
  if (!bounds) return
  // Native scrollIntoView handles nested scrollers. Visibility includes their
  // clipping rectangles, so an input inside a dialog cannot look "visible"
  // merely because its document coordinates happen to be on screen.
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) {
      const rect = parent.getBoundingClientRect()
      bounds.top = Math.max(bounds.top, rect.top + parent.clientTop)
      bounds.bottom = Math.min(bounds.bottom, rect.top + parent.clientTop + parent.clientHeight)
    }
  }
  let target = element
  const region = element.closest<HTMLElement>("[data-focus-region]")
  if (region && region.getBoundingClientRect().height <= bounds.bottom - bounds.top) target = region
  const rect = target.getBoundingClientRect()
  const style = getComputedStyle(target)
  const before = Number.parseFloat(style.scrollMarginTop) || 0
  const after = Number.parseFloat(style.scrollMarginBottom) || 0
  if (block === "nearest" && rect.top - before >= bounds.top && rect.bottom + after <= bounds.bottom) return
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  // For a title taller than the available space, its beginning has priority.
  const alignment = rect.height + before + after > bounds.bottom - bounds.top ? "start" : block
  target.scrollIntoView({ block: alignment, inline: "nearest", behavior: animate && !reduced ? "smooth" : "instant" })
}

let pendingFrame = 0
// Focus events and explicit focus requests share one frame, so they cannot
// start two competing scroll animations. The latest user intent wins.
export function scheduleReveal(element: HTMLElement | null, options?: RevealOptions) {
  cancelAnimationFrame(pendingFrame)
  const frame = requestAnimationFrame(() => {
    if (pendingFrame !== frame) return
    pendingFrame = 0
    revealElement(element, options)
  })
  pendingFrame = frame
  return () => { if (pendingFrame === frame) { cancelAnimationFrame(frame); pendingFrame = 0 } }
}

export function focusElement(element: HTMLElement | null) {
  if (!element) return
  // Keep this synchronous when called from a tap: iOS needs that gesture to
  // open the keyboard. Scrolling is a separate, coordinated operation.
  element.focus({ preventScroll: true })
  scheduleReveal(element)
}

// Wait for disclosure height transitions, rather than guessing their duration.
// Only layout transitions are awaited; decorative/infinite animations never
// block reading. A new pointer, wheel or keyboard action cancels the request.
export function revealAfterLayout(element: HTMLElement, scope: HTMLElement, valid: () => boolean) {
  let cancelled = false
  let frame = 0
  let cancelScroll: (() => void) | undefined
  const events = ["pointerdown", "wheel", "touchmove", "keydown"] as const
  const cancel = () => {
    cancelled = true
    cancelAnimationFrame(frame)
    cancelScroll?.()
    events.forEach((event) => document.removeEventListener(event, cancel, true))
    document.removeEventListener("scrollend", settled, true)
  }
  const settled = (event: Event) => {
    // Nested scrollend events only apply when that scroller contains the title.
    if (event.target !== document && !(event.target instanceof HTMLElement && event.target.contains(element))) return
    cancel()
    // Check the final geometry after native smooth scrolling and sticky layout
    // have settled. Correct clipping without starting another animation.
    if (element.isConnected && valid()) revealElement(element, { animate: false })
  }
  events.forEach((event) => document.addEventListener(event, cancel, { capture: true, passive: true }))
  frame = requestAnimationFrame(() => {
    const transitions = (scope.getAnimations?.({ subtree: true }) ?? []).filter((animation) => "transitionProperty" in animation && ["height", "block-size"].includes(String(animation.transitionProperty)))
    void Promise.allSettled(transitions.map((animation) => animation.finished)).then(() => {
      if (cancelled || !element.isConnected || !valid()) { cancel(); return }
      document.addEventListener("scrollend", settled, true)
      focusElement(element)
      cancelScroll = scheduleReveal(element, { block: "start" })
    })
  })
  return cancel
}
