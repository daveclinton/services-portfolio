'use client'

import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import type { TocHeading } from 'app/blog/heading-utils'

export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '')

  useEffect(() => {
    if (!headings.length) {
      return
    }

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter(Boolean) as HTMLElement[]

    if (!elements.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0.1, 0.35, 0.6],
      }
    )

    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [headings])

  function handleHeadingClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault()
    const target = document.getElementById(id)
    if (!target) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })

    setActiveId(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  if (!headings.length) {
    return null
  }

  return (
    <section className="toc-wrap" aria-label="Table of contents">
      <button
        type="button"
        className="toc-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="toc-scroll-indicator" aria-hidden="true">
          scroll
        </span>
        <span>{open ? 'Hide table of contents' : 'Show table of contents'}</span>
        <span className={`toc-chevron ${open ? 'open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      <div className={`toc-panel ${open ? 'open' : 'closed'}`}>
        <div className="toc-inner">
          <ul className="toc-list">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className={`toc-item level-${heading.level} ${
                  activeId === heading.id ? 'active' : ''
                }`}
              >
                <a
                  href={`#${heading.id}`}
                  onClick={(event) => handleHeadingClick(event, heading.id)}
                >
                  {heading.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
