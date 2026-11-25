"use client"

import { useEffect, type ReactNode } from "react"
import { isTextEntry, scheduleReveal, updateViewportMetrics } from "@/lib/scroll"

/** One keyboard/focus coordinator for every page, form, and dialog. */
export function ViewportFocus() {
  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    let frame = 0
    let cancelReveal: (() => void) | undefined
    const inputState = () => root.toggleAttribute("data-input-active", isTextEntry(document.activeElement))
    const update = (reveal = false) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        inputState()
        const active = document.activeElement
        const bounds = updateViewportMetrics(active instanceof HTMLElement ? active : undefined)
        if (reveal && bounds && isTextEntry(active)) cancelReveal = scheduleReveal(active, { animate: false })
      })
    }
    const focus = (event: FocusEvent) => {
      inputState()
      if (event.target instanceof HTMLElement) cancelReveal = scheduleReveal(event.target)
    }
    const resize = () => update(true)
    const scroll = () => update()
    document.addEventListener("focusin", focus)
    document.addEventListener("focusout", scroll)
    window.addEventListener("resize", resize)
    viewport?.addEventListener("resize", resize)
    // Update offsets when Safari pans the visual viewport, but do not pull the
    // reader back to the input when they intentionally scroll through content.
    viewport?.addEventListener("scroll", scroll)
    update()
    return () => {
      cancelAnimationFrame(frame)
      cancelReveal?.()
      document.removeEventListener("focusin", focus)
      document.removeEventListener("focusout", scroll)
      window.removeEventListener("resize", resize)
      viewport?.removeEventListener("resize", resize)
      viewport?.removeEventListener("scroll", scroll)
      root.removeAttribute("data-input-active")
      root.style.removeProperty("--visible-height")
      root.style.removeProperty("--visible-top")
      root.style.removeProperty("scroll-padding-top")
      root.style.removeProperty("scroll-padding-bottom")
    }
  }, [])
  return null
}

/** Keep the chat and its composer in the visible viewport, above the keyboard. */
export function VisibleViewport({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("has-visible-viewport")
    return () => document.documentElement.classList.remove("has-visible-viewport")
  }, [])
  return <div className="visible-viewport">{children}</div>
}
