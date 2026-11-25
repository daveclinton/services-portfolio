"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { focusElement } from "@/lib/scroll"
import { NewsletterEditor } from "@/components/portfolio/newsletter-editor"
import { Markdown } from "@/components/prompt-kit/markdown"
import {
  studioSession, studioDrafts, studioCreate, studioSave, studioPreview, studioMeta, studioAction, studioLogout,
  studioLoginURL, nairobiSchedule, newsletterStateLabel, STUDIO_SUBJECT_LIMIT, STUDIO_BODY_LIMIT,
  type NewsletterDraft, type StudioSession, type StudioMeta,
} from "@/lib/newsletter-studio"

type Stage = "loading" | "signin" | "list" | "write" | "preview" | "delivery" | "confirm" | "outcome"
const inputClass = "chat-input min-h-8 w-full min-w-0 bg-transparent px-0.5 text-base leading-7 text-foreground outline-none"
const surfaceClass = "glass-surface rounded-2xl border border-input p-2.5 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20"

// Ghost's writing -> email preview/test -> delivery -> confirmation flow.
// The portfolio's form controls and theme are reused throughout.
export function NewsletterStudio() {
  const [stage, setStage] = useState<Stage>("loading")
  const [session, setSession] = useState<StudioSession | null>(null)
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([])
  const [current, setCurrent] = useState<NewsletterDraft | null>(null)
  const [subject, setSubject] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [saved, setSaved] = useState<"saved" | "saving" | "unsaved" | "error">("saved")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [html, setHTML] = useState("")
  const [meta, setMeta] = useState<StudioMeta | null>(null)
  const [filter, setFilter] = useState("all")
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [previewMode, setPreviewMode] = useState<"post" | "email">("post")
  const [later, setLater] = useState(false)
  const [schedule, setSchedule] = useState("")
  const currentRef = useRef<NewsletterDraft | null>(null)
  const text = useRef({ subject: "", markdown: "" })
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const heading = useRef<HTMLHeadingElement>(null)
  const subjectInput = useRef<HTMLTextAreaElement>(null)
  const mounted = useRef(false)
  const actionPending = useRef(false)

  const accept = useCallback((d: NewsletterDraft) => { currentRef.current = d; setCurrent(d) }, [])
  const fail = useCallback((failure: unknown) => { setError(failure instanceof Error ? failure.message : "Something went wrong. Please try again.") }, [])

  useEffect(() => {
    mounted.current = true
    studioSession().then(async (owner) => {
      if (!mounted.current) return
      setSession(owner)
      if (!owner.authenticated) {
        if (new URLSearchParams(window.location.search).get("login") === "failed") setError("Sign-in wasn’t completed. Try your owner account.")
        setStage("signin"); return
      }
      try {
        const list = await studioDrafts()
        if (mounted.current) { setDrafts(list); setStage("list") }
      } catch (failure) { if (mounted.current) { fail(failure); setStage("list") } }
    }).catch((failure) => { if (mounted.current) { fail(failure); setStage("signin") } })
    return () => { mounted.current = false }
  }, [fail])

  useEffect(() => {
    if (stage === "write" && !busy) { focusElement(subjectInput.current); if (subjectInput.current?.value === "Untitled post") subjectInput.current.select() }
    else if (stage !== "loading") focusElement(heading.current)
  }, [stage, busy])

  const save = useCallback((): Promise<NewsletterDraft> => {
    const queued = saveQueue.current.catch(() => undefined).then(async () => {
      const draft = currentRef.current
      if (!draft || !session?.csrf) throw new Error("Reopen your draft before continuing.")
      const snapshot = { ...text.current, subject: text.current.subject.trim() }
      if (snapshot.subject === draft.subject && snapshot.markdown === draft.markdown) return draft
      setSaved("saving")
      try {
        const result = await studioSave(session.csrf, draft, snapshot.subject, snapshot.markdown)
        if (!mounted.current || currentRef.current?.id !== draft.id) throw new Error("Reopen this draft before continuing.")
        accept(result)
        setSaved(text.current.subject.trim() === result.subject && text.current.markdown === result.markdown ? "saved" : "unsaved")
        return result
      } catch (failure) { if (mounted.current) setSaved("error"); throw failure }
    })
    saveQueue.current = queued
    return queued
  }, [session, accept])

  useEffect(() => {
    if (stage !== "write" || !current || !["draft", "error"].includes(current.state) || (subject.trim() === current.subject && markdown === current.markdown)) return
    const timer = setTimeout(() => { void save().catch(fail) }, 750)
    return () => clearTimeout(timer)
  }, [stage, subject, markdown, current, save, fail])

  const dirty = current !== null && (subject.trim() !== current.subject || markdown !== current.markdown)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  async function work(action: () => Promise<void>) {
    if (actionPending.current) return
    actionPending.current = true
    setBusy(true); setError(""); setNotice("")
    try { await action() } catch (failure) { fail(failure) } finally { actionPending.current = false; if (mounted.current) setBusy(false) }
  }
  async function backToList() {
    if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
    setDrafts(await studioDrafts()); setStage("list")
  }
  function open(d: NewsletterDraft) {
    accept(d); text.current = { subject: d.subject, markdown: d.markdown }; setSubject(d.subject); setMarkdown(d.markdown)
    setSaved("saved"); setError(""); setNotice(""); setStage(["draft", "error"].includes(d.state) ? "write" : "outcome")
  }
  async function newPost() {
    if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
    open(await studioCreate(session!.csrf, "Untitled post"))
  }
  async function preview() {
    await save()
    setHTML(""); setMeta(null); setPreviewMode("post"); setStage("preview")
  }
  async function previewEmail() {
    const d = currentRef.current
    if (!d) return
    const [email, audience] = await Promise.all([studioPreview(session!.csrf, d), studioMeta()])
    setHTML(email); setMeta(audience); setPreviewMode("email")
  }
  async function action(kind: "test" | "send" | "schedule" | "cancel" | "refresh") {
    if (!currentRef.current || !session?.csrf) return
    const result = await studioAction(session.csrf, currentRef.current, kind, kind === "schedule" ? nairobiSchedule(schedule) : undefined)
    accept(result)
    text.current = { subject: result.subject, markdown: result.markdown }; setSubject(result.subject); setMarkdown(result.markdown)
    if (kind === "test" && result.state === "draft" && result.tested_revision === result.revision) setNotice(`Test sent to ${meta?.test_email}.`)
    else { setStage("outcome"); if (result.last_error) setError(result.last_error) }
  }
  const title = { loading: "Writing desk", signin: "Writing desk", list: "Your posts", write: subject || "Untitled post", preview: "Preview your post", delivery: "Email delivery", confirm: "Review email delivery", outcome: current ? newsletterStateLabel(current.state) : "Post" }[stage]
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(value)) + " EAT"

  return (
    <article className="studio-layout min-h-0 flex-1 pb-16" aria-busy={busy}>
      <aside className="studio-index">
        <p className="text-title font-bold">Writing desk</p>
        <p className="mt-2 hidden text-caption text-muted-foreground lg:block">A place for your next post.</p>
        {session?.authenticated ? <>
          <nav aria-label="Writing desk" className="mt-6 flex flex-wrap gap-4 lg:flex-col lg:gap-2">
            <button type="button" className="studio-index-link" disabled={busy} aria-current={stage === "list" ? "page" : undefined} onClick={() => void work(backToList)}><span className="signal-number">00.</span> All posts</button>
            <button type="button" className="studio-index-link" disabled={busy} onClick={() => void work(newPost)}><span className="signal-number">01.</span> New post</button>
          </nav>
          {current && stage !== "list" ? <div className="mt-8 hidden border-t border-border pt-4 lg:block">
            <p className="text-caption text-muted-foreground">Working on</p><p className="mt-2 break-words text-body font-semibold">{subject || "Untitled post"}</p>
            <ol aria-label="Post workflow" className="mt-4 flex flex-col gap-2 text-caption">{["Write", "Preview", "Email delivery"].map((label, index) => <li key={label} className={index === (stage === "write" ? 0 : stage === "preview" ? 1 : 2) ? "font-semibold" : "text-muted-foreground"}><span className="signal-number">{String(index + 1).padStart(2, "0")}.</span> {label}</li>)}</ol>
          </div> : null}
          <p className="mt-8 hidden text-caption text-muted-foreground lg:block">Blog publishing comes next. For now, save drafts and send them by email.</p>
          <Button className="mt-4" variant="ghost" disabled={busy} onClick={() => void work(async () => { await studioLogout(session!.csrf); currentRef.current = null; setCurrent(null); setSession({ configured: true, authenticated: false, csrf: "", login: "" }); setStage("signin") })}>Sign out</Button>
        </> : null}
      </aside>
      <div className="studio-document flex min-w-0 flex-col gap-6">
      <header className={stage === "write" ? "sr-only" : "page-header"}>
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
      </header>
      {error ? <p role="alert" className="text-body text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="text-body">{notice}</p> : null}
      {stage === "loading" ? <p role="status" className="text-body">Loading your posts…</p> : null}
      {stage === "signin" ? <div className="flex flex-col gap-4">
        <p className="text-body">{session?.configured === false ? "This writing desk hasn’t been enabled yet." : "Sign in to work on your posts."}</p>
        {session?.configured !== false ? <a href={studioLoginURL} className="text-body">Continue with GitHub</a> : null}
      </div> : null}
      {stage === "list" ? <>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void work(newPost)}>Write a post</Button>
          {error ? <Button variant="ghost" disabled={busy} onClick={() => void work(async () => { setDrafts(await studioDrafts()) })}>Reload posts</Button> : null}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter posts">{["all", "draft", "scheduled", "sent"].map((value) => <Button key={value} size="sm" variant={filter === value ? "secondary" : "ghost"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All" : value === "draft" ? "Drafts" : value === "scheduled" ? "Scheduled email" : "Emailed"}</Button>)}</div>
        {drafts.length === 0 && !error ? <p className="text-body">Your first post starts here.</p> : <ol className="flex flex-col gap-4">{drafts.filter((d) => filter === "all" || (filter === "draft" ? ["draft", "error", "checking"].includes(d.state) : d.state === filter)).map((d, index) => <li key={d.id} className="border-b border-border pb-4"><button type="button" disabled={busy} className="flex w-full items-baseline gap-3 text-left" onClick={() => open(d)}><span className="signal-number text-title font-semibold">{String(index + 1).padStart(2, "0")}.</span><span className="min-w-0"><span className="block break-words text-name font-semibold">{d.subject}</span><span className="mt-2 block text-caption text-muted-foreground">{newsletterStateLabel(d.state)} · Updated {formatDate(d.updated_at)}{d.scheduled_at ? ` · Email scheduled ${formatDate(d.scheduled_at)}` : ""}</span></span></button></li>)}</ol>}
      </> : null}
      {stage === "write" ? <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
          <p className="text-caption text-muted-foreground">Draft post</p>
          <Button disabled={busy || !subject.trim() || !markdown.trim() || new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT} onClick={() => void work(preview)}>Preview</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
          <p>Write</p>
          <div className="flex items-center gap-2"><p role="status">{saved === "saving" ? "Saving…" : saved === "error" ? "Changes not saved" : dirty ? "Unsaved changes" : "Saved"}</p>{saved === "error" ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void work(async () => { await save() })}>Retry save</Button> : null}</div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="post-title" className="sr-only">Post title</label>
          <textarea ref={subjectInput} id="post-title" rows={2} className="studio-title w-full resize-none bg-transparent pl-8 font-bold text-foreground outline-none sm:pl-0" value={subject} required maxLength={STUDIO_SUBJECT_LIMIT} disabled={busy} placeholder="Untitled post" onChange={(event) => { const value = event.target.value.replace(/[\r\n]+/g, " "); text.current.subject = value; setSubject(value); setSaved("unsaved") }} />
        </div>
        <NewsletterEditor key={current?.id} value={markdown} disabled={busy} onChange={(value) => { text.current.markdown = value; setMarkdown(value); setSaved("unsaved") }} />
      </> : null}
      {stage === "preview" ? <>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Preview format">
          <Button size="sm" variant={previewMode === "post" ? "secondary" : "ghost"} aria-pressed={previewMode === "post"} disabled={busy} onClick={() => setPreviewMode("post")}>Post</Button>
          <Button size="sm" variant={previewMode === "email" ? "secondary" : "ghost"} aria-pressed={previewMode === "email"} disabled={busy} onClick={() => { if (html && meta) setPreviewMode("email"); else void work(previewEmail) }}>Email</Button>
        </div>
        {previewMode === "post" ? <>
          <div className="border-y border-border py-6"><h2 className="studio-title font-bold">{subject}</h2><Markdown className="mt-6">{markdown}</Markdown></div>
          <p className="text-caption text-muted-foreground">This is a saved draft preview. Publishing it to the blog will be available in the next release.</p>
        </> : meta ? <>
        <p className="text-caption text-muted-foreground">From {meta.sender.name} · {meta.sender.email}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Email preview device"><Button size="sm" variant={device === "desktop" ? "secondary" : "ghost"} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</Button><Button size="sm" variant={device === "mobile" ? "secondary" : "ghost"} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</Button></div>
        <div className={device === "mobile" ? "mx-auto w-full max-w-sm" : "w-full"}><iframe title="Newsletter email preview" sandbox="" srcDoc={html} className="min-h-96 w-full rounded-2xl border border-input" /></div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { setLater(false); setStage("delivery") }}>Set up email delivery</Button><Button variant="secondary" disabled={busy || !meta.test_email} onClick={() => void work(() => action("test"))}>Send me a test</Button></div>
        {current?.tested_revision === current?.revision ? <p className="text-caption text-muted-foreground">A test was sent for this version.</p> : null}
        {!meta.test_email ? <p className="text-caption text-muted-foreground">Set a test email in the dashboard configuration to send yourself a preview.</p> : null}
        </> : null}
        <Button className="w-fit" variant="ghost" disabled={busy} onClick={() => setStage("write")}>Back to writing</Button>
      </> : null}
      {stage === "delivery" ? <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void work(async () => { if (later) nairobiSchedule(schedule); setMeta(await studioMeta()); setStage("confirm") }) }}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Delivery time"><Button type="button" variant={!later ? "secondary" : "ghost"} aria-pressed={!later} onClick={() => setLater(false)}>Send now</Button><Button type="button" variant={later ? "secondary" : "ghost"} aria-pressed={later} onClick={() => setLater(true)}>Schedule</Button></div>
        {later ? <><label htmlFor="newsletter-schedule" className="text-body">Date and time · Nairobi (EAT)</label><div className={surfaceClass}><input id="newsletter-schedule" className={inputClass} type="datetime-local" required value={schedule} disabled={busy} onChange={(e) => setSchedule(e.target.value)} /></div></> : null}
        <div className="flex flex-wrap gap-2"><Button disabled={busy} type="submit">Review</Button><Button disabled={busy} variant="ghost" type="button" onClick={() => setStage("preview")}>Back</Button></div>
      </form> : null}
      {stage === "confirm" && meta ? <>
        <p className="text-body">{subject}</p><p className="text-body">{later ? `Scheduled for ${formatDate(new Date(`${schedule}:00+03:00`).toISOString())}.` : "Send now."} Audience: {meta.audience} · {meta.subscribers} current subscribers.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || meta.subscribers < 1} onClick={() => void work(() => action(later ? "schedule" : "send"))}>{busy ? "Submitting…" : later ? "Confirm schedule" : "Confirm send"}</Button><Button disabled={busy} variant="ghost" onClick={() => setStage("delivery")}>Back</Button></div>
      </> : null}
      {stage === "outcome" && current ? <>
        <p className="text-body">{current.subject}</p>
        {current.scheduled_at ? <p className="text-body">{formatDate(current.scheduled_at)}</p> : null}
        {current.last_error && current.last_error !== error ? <p className="text-body">{current.last_error}</p> : null}
        <div className="flex flex-wrap gap-2">
          {!["draft", "error"].includes(current.state) ? <Button disabled={busy} onClick={() => void work(() => action("refresh"))}>Check status</Button> : <Button disabled={busy} onClick={() => setStage("write")}>Return to draft</Button>}
          {current.state === "scheduled" ? <Button variant="secondary" disabled={busy} onClick={() => void work(() => action("cancel"))}>Cancel schedule</Button> : null}
          <Button variant="ghost" disabled={busy} onClick={() => void work(backToList)}>Back to posts</Button>
        </div>
      </> : null}
      </div>
    </article>
  )
}
