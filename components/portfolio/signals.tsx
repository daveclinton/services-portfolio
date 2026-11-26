"use client"

import Image, { type StaticImageData } from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { TONE_STORAGE_KEY, toneOf } from "@/lib/tone"
import { revealAfterLayout } from "@/lib/scroll"
import portrait from "@/public/david.webp"

export type SignalItem = {
  /** Also the element id, so /#slug works as well as the item's own address. */
  slug: string
  title: string
  body: ReactNode
  /** Shown beside the open text. Defaults to the portrait. */
  image?: string | StaticImageData
}

const number = (index: number) => String(index).padStart(2, "0")

// 37signals.com's approach: a numbered list on one flat color, each item opens
// in place, and the dot moves to the next one. <details name> keeps one open and
// works without JavaScript. Home, Writing and Experience all use it.
//
// Every item has its own address (37signals.com/05 does the same), because the
// part of a URL after "#" never reaches the sites that draw link previews.
export function Signals({ id, items, listPath, basePath, initial, addressMode = "path", changeTone = true, showNext = true, footer }: {
  id: string
  items: SignalItem[]
  /** The list's own page. */
  listPath: string
  /** What comes before an item's slug. Home's is empty. */
  basePath: string
  /** The item this page was opened on. */
  initial?: number
  /** Articles keep their canonical page and link to individual sections by hash. */
  /** "none": a preview inside another page; opening a section leaves the address alone. */
  addressMode?: "path" | "hash" | "none"
  /** Articles keep the same page color as readers move between sections. */
  changeTone?: boolean
  /** Embedded previews can omit the next-section control. */
  showNext?: boolean
  footer: ReactNode
}) {
  const [open, setOpen] = useState(initial ?? -1)
  const pathname = usePathname()
  const list = useRef<HTMLOListElement>(null)
  // URL-driven selection does not rewrite the address as an interaction would.
  const chosen = useRef(false)
  const cancelReveal = useRef<(() => void) | null>(null)

  useEffect(() => () => cancelReveal.current?.(), [])

  // Next can retain this component when navigation returns to a list URL.
  // Closing on that transition also covers state kept in the router cache.
  useEffect(() => {
    if (addressMode !== "path" || pathname !== listPath || window.location.hash) return
    chosen.current = false
    list.current?.querySelectorAll<HTMLDetailsElement>(":scope > li > details").forEach((entry) => { entry.open = false })
  }, [pathname, listPath, addressMode])

  function show(index: number, choose = true) {
    const entries = list.current?.querySelectorAll<HTMLDetailsElement>(":scope > li > details")
    const details = entries?.[index]
    if (!details) return
    if (choose) chosen.current = true
    entries?.forEach((entry) => { if (entry !== details) entry.open = false })
    details.open = true
  }

  function remember(index: number) {
    if (!changeTone) return
    document.documentElement.setAttribute("data-tone", toneOf(index))
    try {
      localStorage.setItem(TONE_STORAGE_KEY, String(index))
    } catch {}
  }

  // Put the open item in the address bar, ready to share. Some phones share the
  // canonical link instead, so it has to match.
  function address(index: number | null) {
    if (addressMode === "none") return
    if (addressMode === "hash") {
      const url = new URL(window.location.href)
      url.hash = index === null ? "" : items[index].slug
      window.history.replaceState(null, "", url.pathname + url.search + url.hash)
      return
    }
    const path = index === null ? listPath : `${basePath}/${items[index].slug}`
    window.history.replaceState(null, "", path + window.location.search)
    const canonical = document.querySelector<HTMLLinkElement>("link[rel=canonical]")
    if (canonical) canonical.href = new URL(path, canonical.href).href
  }

  useEffect(() => {
    const fromHash = () => {
      chosen.current = false
      let hash = window.location.hash.slice(1)
      try { hash = decodeURIComponent(hash) } catch {}
      // Two digits are the older links, from before items had names.
      const index = /^\d{2}$/.test(hash) ? Number(hash) : items.findIndex((item) => item.slug === hash)
      if (index >= 0 && index < items.length) {
        remember(index)
        show(index, false)
      } else {
        list.current?.querySelectorAll<HTMLDetailsElement>(":scope > li > details").forEach((entry) => { entry.open = false })
      }
    }
    if (addressMode === "none") return
    if (window.location.hash) fromHash()
    else if (initial !== undefined) {
      remember(initial)
      show(initial, false)
    }
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  // Runs once for each page. The lists do not change while they are on screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, initial])

  const next = items[(open + 1) % items.length]

  return (
    <div className="signals">
      <ol ref={list}>
        {items.map((item, index) => (
          <li key={item.slug} id={item.slug}>
            <details
              name={id}
              open={index === open}
              onToggle={(event) => {
                if (event.target !== event.currentTarget) return
                const details = event.currentTarget
                if (!details.open) {
                  if (!list.current?.querySelector(":scope > li > details[open]")) {
                    setOpen(-1)
                    if (chosen.current) address(null)
                  }
                  return
                }
                setOpen(index)
                const summary = details.querySelector("summary")
                cancelReveal.current?.()
                if (summary && list.current) cancelReveal.current = revealAfterLayout(summary, list.current, () => details.open)
                if (!chosen.current) return
                remember(index)
                address(index)
              }}
            >
              <summary onClick={() => { chosen.current = true }}>
                <span className="signal-number">{number(index)}.</span> <h2>{item.title}</h2>
              </summary>
              <div className="signal-body">
                {/* Decorative: the page already names the person or company. */}
                <Image src={item.image ?? portrait} alt="" width={40} height={40} className="signal-avatar" />
                {item.body}
              </div>
            </details>
          </li>
        ))}
      </ol>
      {showNext || footer ? <footer className="signals-bar">
        {footer}
        {showNext ? <button type="button" className="signals-dot" onClick={() => show((open + 1) % items.length)}>
          <span className="sr-only">Next: {next.title}</span>
        </button> : null}
      </footer> : null}
    </div>
  )
}
