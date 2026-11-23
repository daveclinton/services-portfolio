"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * Pins its children to the visible part of the screen.
 *
 * Android Chrome shrinks the page when the keyboard opens (we opt in with
 * `interactive-widget=resizes-content` in the root viewport), but iOS Safari
 * does not: the keyboard draws over the page, and Safari may scroll the page
 * up to reveal the focused field. `visualViewport` reports the area that is
 * really visible, so we size the container to it and follow its offset.
 */
export function VisibleViewport({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    const viewport = window.visualViewport
    if (!element) return

    document.documentElement.classList.add("has-visible-viewport")

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // When the reader pinch-zooms, let the browser handle it normally
        // rather than shrinking the layout to the zoomed-in area.
        if (!viewport) return
        if (viewport.scale > 1.01) {
          element.style.removeProperty("--visible-height")
          element.style.removeProperty("--visible-top")
          return
        }
        element.style.setProperty("--visible-height", `${viewport.height}px`)
        element.style.setProperty("--visible-top", `${viewport.offsetTop}px`)

        const active = document.activeElement
        if (active instanceof HTMLElement && element.contains(active) && active.matches("input, textarea")) {
          active.scrollIntoView({ block: "nearest" })
        }
      })
    }

    update()
    viewport?.addEventListener("resize", update)
    viewport?.addEventListener("scroll", update)
    return () => {
      cancelAnimationFrame(frame)
      viewport?.removeEventListener("resize", update)
      viewport?.removeEventListener("scroll", update)
      document.documentElement.classList.remove("has-visible-viewport")
    }
  }, [])

  return (
    <div ref={ref} className="visible-viewport">
      {children}
    </div>
  )
}
