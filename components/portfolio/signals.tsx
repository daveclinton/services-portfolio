"use client"

import Image, { type StaticImageData } from "next/image"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { TONE_STORAGE_KEY, toneOf } from "@/lib/tone"
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
export function Signals({ id, items, listPath, basePath, initial, footer }: {
  id: string
  items: SignalItem[]
  /** The list's own page. */
  listPath: string
  /** What comes before an item's slug. Home's is empty, and its first item is the page itself. */
  basePath: string
  /** The item this page was opened on. */
  initial?: number
  footer: ReactNode
}) {
  const [open, setOpen] = useState(initial ?? 0)
  const list = useRef<HTMLOListElement>(null)
  // The item that is open by default must not change a color chosen elsewhere.
  const chosen = useRef(false)
  const storageKey = `last-item:${id}`

  function show(index: number, choose = true) {
    const details = list.current?.querySelectorAll("details")[index]
    if (!details) return
    if (choose) chosen.current = true
    details.open = true
    requestAnimationFrame(() => details.scrollIntoView({ block: "center" }))
  }

  function remember(index: number) {
    document.documentElement.setAttribute("data-tone", toneOf(index))
    try {
      localStorage.setItem(TONE_STORAGE_KEY, String(index))
      localStorage.setItem(storageKey, String(index))
    } catch {}
  }

  // Put the open item in the address bar, ready to share. Some phones share the
  // canonical link instead, so it has to match.
  function address(index: number) {
    const path = index === 0 && !basePath ? listPath : `${basePath}/${items[index].slug}`
    window.history.replaceState(null, "", path)
    const canonical = document.querySelector<HTMLLinkElement>("link[rel=canonical]")
    if (canonical) canonical.href = new URL(path, canonical.href).href
  }

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1)
      // Two digits are the older links, from before items had names.
      const index = /^\d{2}$/.test(hash) ? Number(hash) : items.findIndex((item) => item.slug === hash)
      if (index >= 0) show(index)
    }
    if (window.location.hash) fromHash()
    else if (initial !== undefined) {
      remember(initial)
      show(initial, false)
    }
    else {
      // Return to the item last opened on this list.
      try {
        const saved = Number(localStorage.getItem(storageKey))
        if (saved > 0) show(saved, false)
      } catch {}
    }
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  // Runs once for each page. The lists do not change while they are on screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, initial])

  const next = items[(open + 1) % items.length]

  return (
    <div className="signals">
      <ol ref={list}>
        {items.map((item, index) => (
          <li key={item.slug} id={item.slug}>
            <details
              name={id}
              open={index === (initial ?? 0)}
              onToggle={(event) => {
                const details = event.currentTarget
                if (!details.open) return
                setOpen(index)
                if (!chosen.current) return
                remember(index)
                address(index)
                // Once it has finished opening, keep it clear of the bottom bar.
                setTimeout(() => {
                  if (details.open) details.scrollIntoView({ block: "nearest" })
                }, 280)
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
      <footer className="signals-bar">
        {footer}
        <button type="button" className="signals-dot" onClick={() => show((open + 1) % items.length)}>
          <span className="sr-only">Next: {next.title}</span>
        </button>
      </footer>
    </div>
  )
}
