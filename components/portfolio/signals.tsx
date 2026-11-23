"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import portrait from "@/public/david.webp"

const TONES = 6
const number = (index: number) => String(index).padStart(2, "0")

// 37signals.com's approach: a numbered list on one flat color, each idea opens
// in place, and the dot moves to the next one. <details name> keeps one open and
// works without JavaScript.
export function Signals({ items, footer }: { items: { title: string; body: ReactNode }[]; footer: ReactNode }) {
  const [open, setOpen] = useState(0)
  const list = useRef<HTMLOListElement>(null)

  function show(index: number) {
    const details = list.current?.querySelectorAll("details")[index]
    if (!details) return
    details.open = true
    requestAnimationFrame(() => details.scrollIntoView({ block: "center" }))
  }

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1)
      if (/^\d{2}$/.test(id)) show(Number(id))
    }
    fromHash()
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  }, [])

  return (
    <div className="signals" data-tone={open % TONES}>
      <ol ref={list}>
        {items.map((item, index) => (
          <li key={item.title} id={number(index)}>
            <details
              name="signal"
              open={index === 0}
              onToggle={(event) => {
                const details = event.currentTarget
                if (!details.open) return
                setOpen(index)
                // Once it has finished opening, keep it clear of the bottom bar.
                setTimeout(() => {
                  if (details.open) details.scrollIntoView({ block: "nearest" })
                }, 280)
              }}
            >
              <summary>
                <span className="signal-number">{number(index)}.</span> <h2>{item.title}</h2>
              </summary>
              <div className="signal-body">
                {/* The speaker, beside every answer. Decorative: the page already names him. */}
                <Image src={portrait} alt="" width={40} height={40} className="signal-avatar" />
                {item.body}
              </div>
            </details>
          </li>
        ))}
      </ol>
      <footer className="signals-bar">
        {footer}
        <button type="button" className="signals-dot" onClick={() => show((open + 1) % items.length)}>
          <span className="sr-only">Next: {items[(open + 1) % items.length].title}</span>
        </button>
      </footer>
    </div>
  )
}
