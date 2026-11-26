"use client"

import { forwardRef, useDeferredValue } from "react"
import Image from "next/image"
import { PostMarkdown, splitSections } from "@/components/portfolio/published-post-content"
import { formatPostDate } from "@/lib/blog-format"
import portrait from "@/public/david.webp"

type Props = { subject: string; markdown: string; description?: string; date?: string }
const wordsPerMinute = 230
const number = (index: number) => String(index + 1).padStart(2, "0")

// The public article, 37signals-style, beside the editor: the page tone, the
// display type, the 40rem measure and numbered sections with the portrait.
// Mirrors app/blog/[slug]/page.tsx and Signals, with every section open so the
// whole draft can be read while writing.
export const LiveArticle = forwardRef<HTMLElement, Props>(function LiveArticle({ subject, markdown, description, date }, ref) {
  const liveSubject = useDeferredValue(subject)
  const liveMarkdown = useDeferredValue(markdown)
  const sections = liveMarkdown.trim() ? splitSections(liveMarkdown) : []
  const minutes = Math.max(1, Math.round(liveMarkdown.split(/\s+/).filter(Boolean).length / wordsPerMinute))
  const day = date ?? new Date().toISOString().slice(0, 10)
  return <section ref={ref} className="admin-live-preview" aria-label="Live view" tabIndex={0}>
    <div className="page numbered live-tone">
      <article className="blog-post">
        <header className="signals">
          <h1 className="font-bold">{liveSubject.trim() || "Untitled post"}</h1>
          <p className="signal-meta mt-4"><time dateTime={day}>{formatPostDate(day)}</time> · {minutes} min read</p>
          {description ? <p className="signal-meta mt-4">{description}</p> : null}
        </header>
        {sections.length ? <div className="signals">
          <ol>
            {sections.map((section, index) => <li key={section.id}>
              {/* Open and fixed: the reader opens one section at a time; the writer sees them all. */}
              <details open>
                <summary onClick={(event) => event.preventDefault()}>
                  <span className="signal-number">{number(index)}.</span> <h2>{section.title}</h2>
                </summary>
                <div className="signal-body">
                  <Image src={portrait} alt="" width={40} height={40} className="signal-avatar" />
                  <div className="blog-prose"><PostMarkdown markdown={section.markdown} /></div>
                </div>
              </details>
            </li>)}
          </ol>
        </div> : <p className="signal-meta mt-8">Start writing to see the article here.</p>}
      </article>
    </div>
  </section>
})
