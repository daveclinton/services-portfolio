"use client"

import { forwardRef, useDeferredValue } from "react"
import { Signals } from "@/components/portfolio/signals"
import { PostMarkdown, splitSections } from "@/components/portfolio/published-post-content"
import { formatPostDate } from "@/lib/blog-format"

type Props = { subject: string; markdown: string; description?: string; date?: string }
const wordsPerMinute = 230

// The article as the blog presents it: title, date, summary, then numbered
// sections that start closed and open one at a time, using the blog's own
// Signals component. Colours stay the desk's, so writing is calm to look at.
export const LiveArticle = forwardRef<HTMLElement, Props>(function LiveArticle({ subject, markdown, description, date }, ref) {
  const liveSubject = useDeferredValue(subject)
  const liveMarkdown = useDeferredValue(markdown)
  const liveDescription = useDeferredValue(description ?? "")
  const sections = liveMarkdown.trim() ? splitSections(liveMarkdown) : []
  const minutes = Math.max(1, Math.round(liveMarkdown.split(/\s+/).filter(Boolean).length / wordsPerMinute))
  const day = date ?? new Date().toISOString().slice(0, 10)
  return <section ref={ref} className="admin-live-preview" aria-label="Live view" tabIndex={0}>
    <div className="page live-page">
      <article className="blog-post">
        <header className="signals">
          <h1 className="font-bold">{liveSubject.trim() || "Untitled post"}</h1>
          <p className="signal-meta mt-4"><time dateTime={day}>{formatPostDate(day)}</time> · {minutes} min read</p>
          {liveDescription.trim() ? <p className="signal-meta mt-4">{liveDescription}</p> : null}
        </header>
        {sections.length ? <Signals id="live-article" addressMode="none" changeTone={false} showNext={false} listPath="" basePath="" footer={null}
          items={sections.map((section) => ({ slug: section.id, title: section.title, body: <div className="blog-prose"><PostMarkdown markdown={section.markdown} /></div> }))} />
          : <p className="signal-meta mt-8">Start writing to see the article here.</p>}
      </article>
    </div>
  </section>
})
