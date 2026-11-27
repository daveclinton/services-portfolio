"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SiteNav } from "@/components/portfolio/site-nav"
import { PublishedPostContent } from "@/components/portfolio/published-post-content"
import { NewsletterSignup } from "@/components/portfolio/newsletter-signup"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPostDate } from "@/lib/blog-format"
import { PREVIEW_CHANNEL, studioDraft, studioSignInHref, STUDIO_SIGNIN_PATH, StudioSignedOutError, type NewsletterDraft } from "@/lib/newsletter-studio"

type State = { status: "loading" } | { status: "ready"; draft: NewsletterDraft } | { status: "failed"; message: string; signIn: boolean }
const wordsPerMinute = 230

// The same structure and classes as app/blog/[slug]/page.tsx, filled from the
// saved draft. It reloads whenever the desk saves, so the tab stays current.
export function DraftPreview({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    const load = () => studioDraft(id).then((draft) => { if (live) setState({ status: "ready", draft }) }).catch((failure: Error) => {
      if (live) setState({ status: "failed", message: failure.message, signIn: failure instanceof StudioSignedOutError })
    })
    void load()
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(PREVIEW_CHANNEL)
    if (channel) channel.onmessage = (event: MessageEvent<{ id?: string }>) => { if (event.data?.id === id) void load() }
    const refresh = () => { if (document.visibilityState === "visible") void load() }
    document.addEventListener("visibilitychange", refresh)
    return () => { live = false; channel?.close(); document.removeEventListener("visibilitychange", refresh) }
  }, [id, attempt])

  const draft = state.status === "ready" ? state.draft : null
  useEffect(() => { if (draft) document.title = `Preview: ${draft.subject}` }, [draft])
  const minutes = draft ? Math.max(1, Math.round(draft.markdown.split(/\s+/).filter(Boolean).length / wordsPerMinute)) : 0
  const date = new Date().toISOString().slice(0, 10)

  return <>
    <p role="status" className="preview-banner">Preview · {draft?.published_revision && draft.published_revision === draft.revision ? "Matches the published version" : "Not published yet"}. It updates when the editor saves.</p>
    <div className="page numbered" id="top">
    <SiteNav />
    <main id="content">
      {state.status === "loading" ? <div role="status" aria-label="Loading preview" className="flex flex-col gap-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-40" /><Skeleton className="h-64 w-full" /></div> : null}
      {state.status === "failed" ? <div className="flex flex-col gap-4">
        <p role="alert">{state.signIn ? "Sign in to the writing desk to preview drafts." : state.message}</p>
        {state.signIn ? <Link href={STUDIO_SIGNIN_PATH} onClick={() => studioSignInHref()}>Sign in</Link> : <button type="button" className="w-fit underline" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1) }}>Try again</button>}
      </div> : null}
      {draft ? <article className="blog-post">
        <header className="signals">
          <h1 className="font-bold">{draft.subject || "Untitled post"}</h1>
          <p className="signal-meta mt-4"><time dateTime={date}>{formatPostDate(date)}</time> · {minutes} min read</p>
          {draft.description ? <p className="signal-meta mt-4">{draft.description}</p> : null}
        </header>
        {draft.markdown.trim() ? <PublishedPostContent slug={draft.slug || "preview"} markdown={draft.markdown} /> : <p>Nothing written yet.</p>}
        <footer className="blog-post-footer"><NewsletterSignup /></footer>
      </article> : null}
    </main>
    </div>
  </>
}
