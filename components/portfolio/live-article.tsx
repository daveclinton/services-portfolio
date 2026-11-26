"use client"

import { forwardRef, useDeferredValue } from "react"
import { PostMarkdown, splitSections } from "@/components/portfolio/published-post-content"

type Props = { subject: string; markdown: string; description?: string }
const wordsPerMinute = 230

// The article as readers will see it, beside the editor: the public renderer,
// every section open, and typing kept smooth by rendering just behind it.
export const LiveArticle = forwardRef<HTMLElement, Props>(function LiveArticle({ subject, markdown, description }, ref) {
  const liveSubject = useDeferredValue(subject)
  const liveMarkdown = useDeferredValue(markdown)
  const sections = liveMarkdown.trim() ? splitSections(liveMarkdown) : []
  const minutes = Math.max(1, Math.round(liveMarkdown.split(/\s+/).filter(Boolean).length / wordsPerMinute))
  return <section ref={ref} className="admin-live-preview" aria-label="Live view" tabIndex={0}>
    <article className="live-article">
      <header className="live-article-header">
        <p className="text-caption text-muted-foreground">Live view · {minutes} min read</p>
        <h2 className="studio-title font-bold">{liveSubject.trim() || "Untitled post"}</h2>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </header>
      {sections.length ? sections.map((section) => <section key={section.id} className="blog-prose">
        {/* The public reader shows these as numbered titles; here every section stays open. */}
        {section.lead ? null : <h2>{section.title}</h2>}
        <PostMarkdown markdown={section.markdown} />
      </section>) : <p className="mt-6 text-body text-muted-foreground">Start writing to see the article here.</p>}
    </article>
  </section>
})
