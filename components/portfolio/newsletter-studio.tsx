"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { focusElement } from "@/lib/scroll"
import { NewsletterEditor } from "@/components/portfolio/newsletter-editor"
import {
  studioSession, studioDrafts, studioCreate, studioSave, studioPreview, studioMeta, studioAction, studioLogout,
  studioLoginURL, nairobiSchedule, newsletterStateLabel, STUDIO_SUBJECT_LIMIT, STUDIO_BODY_LIMIT,
  type NewsletterDraft, type StudioSession, type StudioMeta,
} from "@/lib/newsletter-studio"

type Stage = "loading" | "signin" | "list" | "subject" | "write" | "preview" | "delivery" | "confirm" | "outcome"
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
  const [later, setLater] = useState(false)
  const [schedule, setSchedule] = useState("")
  const currentRef = useRef<NewsletterDraft | null>(null)
  const text = useRef({ subject: "", markdown: "" })
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const heading = useRef<HTMLHeadingElement>(null)
  const subjectInput = useRef<HTMLInputElement>(null)
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
    if (stage === "subject") focusElement(subjectInput.current)
    else if (stage === "write") focusElement(subjectInput.current)
    else if (stage !== "loading") focusElement(heading.current)
  }, [stage])

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
  async function preview() {
    const d = await save()
    const [email, audience] = await Promise.all([studioPreview(session!.csrf, d), studioMeta()])
    setHTML(email); setMeta(audience); setStage("preview")
  }
  async function action(kind: "test" | "send" | "schedule" | "cancel" | "refresh") {
    if (!currentRef.current || !session?.csrf) return
    const result = await studioAction(session.csrf, currentRef.current, kind, kind === "schedule" ? nairobiSchedule(schedule) : undefined)
    accept(result)
    text.current = { subject: result.subject, markdown: result.markdown }; setSubject(result.subject); setMarkdown(result.markdown)
    if (kind === "test" && result.state === "draft" && result.tested_revision === result.revision) setNotice(`Test sent to ${meta?.test_email}.`)
    else { setStage("outcome"); if (result.last_error) setError(result.last_error) }
  }
  const title = { loading: "Newsletter desk", signin: "Newsletter desk", list: "Your newsletters", subject: "What’s the subject?", write: subject || "Write your newsletter", preview: "How it will look", delivery: "When should it go out?", confirm: "Ready to send?", outcome: current ? newsletterStateLabel(current.state) : "Newsletter" }[stage]
  const step = ({ subject: "1 of 5 · Subject", write: "2 of 5 · Write", preview: "3 of 5 · Preview", delivery: "4 of 5 · Delivery", confirm: "5 of 5 · Confirm" } as Partial<Record<Stage, string>>)[stage]
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(value)) + " EAT"

  return (
    <article className="flex min-h-0 flex-1 flex-col gap-6 pb-16" aria-busy={busy}>
      <header className={stage === "write" ? "sr-only" : "page-header"}>
        {step ? <p className="text-caption text-muted-foreground">{step}</p> : null}
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
      </header>
      {error ? <p role="alert" className="text-body text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="text-body">{notice}</p> : null}
      {stage === "loading" ? <p role="status" className="text-body">Loading your newsletters…</p> : null}
      {stage === "signin" ? <div className="flex flex-col gap-4">
        <p className="text-body">{session?.configured === false ? "This dashboard hasn’t been enabled yet." : "Sign in to write and send your newsletter."}</p>
        {session?.configured !== false ? <a href={studioLoginURL} className="text-body">Continue with GitHub</a> : null}
      </div> : null}
      {stage === "list" ? <>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => { currentRef.current = null; setCurrent(null); text.current = { subject: "", markdown: "" }; setSubject(""); setMarkdown(""); setError(""); setStage("subject") }}>New newsletter</Button>
          <Button variant="ghost" disabled={busy} onClick={() => void work(async () => { await studioLogout(session!.csrf); currentRef.current = null; setCurrent(null); setSession({ configured: true, authenticated: false, csrf: "", login: "" }); setStage("signin") })}>Sign out</Button>
          {error ? <Button variant="ghost" disabled={busy} onClick={() => void work(async () => { setDrafts(await studioDrafts()) })}>Reload newsletters</Button> : null}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter newsletters">{["all", "draft", "scheduled", "sent"].map((value) => <Button key={value} size="sm" variant={filter === value ? "secondary" : "ghost"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All" : value === "draft" ? "Drafts" : value === "scheduled" ? "Scheduled" : "Sent"}</Button>)}</div>
        {drafts.length === 0 && !error ? <p className="text-body">Your first note starts here.</p> : <ul className="flex flex-col gap-4">{drafts.filter((d) => filter === "all" || (filter === "draft" ? ["draft", "error", "checking"].includes(d.state) : d.state === filter)).map((d) => <li key={d.id} className="border-b border-border pb-4"><button type="button" disabled={busy} className="flex w-full flex-col gap-2 text-left" onClick={() => open(d)}><span className="text-title">{d.subject}</span><span className="text-caption text-muted-foreground">{newsletterStateLabel(d.state)}{d.scheduled_at ? ` · ${formatDate(d.scheduled_at)}` : ""}</span></button></li>)}</ul>}
      </> : null}
      {stage === "subject" ? <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void work(async () => {
        if (currentRef.current) await save()
        else { const d = await studioCreate(session!.csrf, subject); accept(d); text.current.subject = d.subject; setSubject(d.subject) }
        setStage("write")
      }) }}>
        <label htmlFor="newsletter-subject" className="sr-only">Subject</label>
        <div className={surfaceClass}><input ref={subjectInput} id="newsletter-subject" className={inputClass} value={subject} required maxLength={STUDIO_SUBJECT_LIMIT} disabled={busy} enterKeyHint="next" onChange={(e) => { text.current.subject = e.target.value; setSubject(e.target.value) }} /></div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !subject.trim()} type="submit">Next</Button><Button variant="ghost" disabled={busy} type="button" onClick={() => void work(backToList)}>Back</Button></div>
      </form> : null}
      {stage === "write" ? <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
          <Button variant="ghost" disabled={busy} onClick={() => void work(backToList)}>Back to newsletters</Button>
          <Button disabled={busy || !subject.trim() || !markdown.trim() || new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT} onClick={() => void work(preview)}>Preview email</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
          <p>2 of 5 · Write</p>
          <div className="flex items-center gap-2"><p role="status">{saved === "saving" ? "Saving…" : saved === "error" ? "Changes not saved" : dirty ? "Unsaved changes" : "Saved"}</p>{saved === "error" ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void work(async () => { await save() })}>Retry save</Button> : null}</div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="newsletter-subject" className="text-caption text-muted-foreground">Email subject</label>
          <input ref={subjectInput} id="newsletter-subject" className="min-h-8 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-0.5 text-name leading-tight font-semibold text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" value={subject} required maxLength={STUDIO_SUBJECT_LIMIT} disabled={busy} placeholder="Your newsletter subject" onChange={(event) => { text.current.subject = event.target.value; setSubject(event.target.value); setSaved("unsaved") }} />
        </div>
        <NewsletterEditor key={current?.id} value={markdown} disabled={busy} onChange={(value) => { text.current.markdown = value; setMarkdown(value); setSaved("unsaved") }} />
      </> : null}
      {stage === "preview" && meta ? <>
        <p className="text-caption text-muted-foreground">From {meta.sender.name} · {meta.sender.email}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Email preview device"><Button size="sm" variant={device === "desktop" ? "secondary" : "ghost"} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</Button><Button size="sm" variant={device === "mobile" ? "secondary" : "ghost"} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</Button></div>
        <div className={device === "mobile" ? "mx-auto w-full max-w-sm" : "w-full"}><iframe title="Newsletter email preview" sandbox="" srcDoc={html} className="min-h-96 w-full rounded-2xl border border-input" /></div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { setLater(false); setStage("delivery") }}>Continue</Button><Button variant="secondary" disabled={busy || !meta.test_email} onClick={() => void work(() => action("test"))}>Send me a test</Button><Button variant="ghost" disabled={busy} onClick={() => setStage("write")}>Back to writing</Button></div>
        {current?.tested_revision === current?.revision ? <p className="text-caption text-muted-foreground">A test was sent for this version.</p> : null}
        {!meta.test_email ? <p className="text-caption text-muted-foreground">Set a test email in the dashboard configuration to send yourself a preview.</p> : null}
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
          <Button variant="ghost" disabled={busy} onClick={() => void work(backToList)}>Back to newsletters</Button>
        </div>
      </> : null}
    </article>
  )
}
