"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { focusElement } from "@/lib/scroll"
import { NewsletterEditor } from "@/components/portfolio/newsletter-editor"
import { Markdown } from "@/components/prompt-kit/markdown"
import { AdminShell, type AdminSection } from "@/components/portfolio/admin-shell"
import { SelectField } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FileText, Mail, Plus, Info, LoaderCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { site } from "@/lib/portfolio-data"
import {
  studioSession, studioDrafts, studioCreate, studioSave, studioPreview, studioMeta, studioAction, studioLogout,
  studioLoginURL, nairobiSchedule, newsletterStateLabel, newsletterFromPost, STUDIO_SUBJECT_LIMIT, STUDIO_BODY_LIMIT,
  type NewsletterDraft, type StudioSession, type StudioMeta, type PublishedStudioPost,
} from "@/lib/newsletter-studio"

type Stage = "loading" | "signin" | "list" | "pick" | "write" | "preview" | "delivery" | "confirm" | "outcome"
const inputClass = "chat-input min-h-8 w-full min-w-0 bg-transparent px-0.5 text-base leading-7 text-foreground outline-none"
const surfaceClass = "glass-surface rounded-2xl border border-input p-2.5 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20"
const emptyPublishedPosts: PublishedStudioPost[] = []

// Ghost's writing -> email preview/test -> delivery -> confirmation flow.
// The portfolio's form controls and theme are reused throughout.
export function NewsletterStudio({ section = "posts", publishedPosts = emptyPublishedPosts, initialPost }: { section?: AdminSection; publishedPosts?: PublishedStudioPost[]; initialPost?: string }) {
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
  const [postView, setPostView] = useState("drafts")
  const [selectedPost, setSelectedPost] = useState<string | null>(initialPost ?? null)
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
        if (mounted.current) { setDrafts(list); setStage(section === "newsletters" && initialPost && publishedPosts.some((post) => post.slug === initialPost) ? "pick" : "list") }
      } catch (failure) { if (mounted.current) { fail(failure); setStage("list") } }
    }).catch((failure) => { if (mounted.current) { fail(failure); setStage("signin") } })
    return () => { mounted.current = false }
  }, [fail, initialPost, publishedPosts, section])

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
    const warn = (event: BeforeUnloadEvent) => {
      const latest = currentRef.current
      if (latest && text.current.subject.trim() === latest.subject && text.current.markdown === latest.markdown) return
      event.preventDefault(); event.returnValue = ""
    }
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
  async function newNewsletter() {
    if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
    setSelectedPost(null); setStage("pick")
  }
  async function usePublishedPost() {
    const post = publishedPosts.find((post) => post.slug === selectedPost)
    if (!post) throw new Error("Choose a published post.")
    const seed = newsletterFromPost(post, site.url)
    const draft = await studioCreate(session!.csrf, seed.subject)
    open(draft)
    text.current = seed; setSubject(seed.subject); setMarkdown(seed.markdown); setSaved("unsaved")
    await save()
  }
  async function navigate(href: string) {
    await work(async () => {
      if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
      window.location.assign(href)
    })
  }
  async function logout() {
    if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
    await studioLogout(session!.csrf)
    currentRef.current = null; setCurrent(null); setDrafts([]); setSubject(""); setMarkdown(""); setHTML(""); setMeta(null)
    setSession({ configured: true, authenticated: false, csrf: "", login: "" }); setStage("signin")
  }
  async function preview() {
    await save()
    setHTML(""); setMeta(null); setPreviewMode("post"); setStage("preview")
    if (section === "newsletters") await previewEmail()
  }
  async function previewEmail() {
    setPreviewMode("email")
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
  const title = { loading: section === "posts" ? "Posts" : "Newsletters", signin: "Sign in", list: section === "posts" ? "Posts" : "Newsletters", pick: "New newsletter", write: subject || "Untitled post", preview: section === "posts" ? "Post preview" : "Newsletter preview", delivery: "Email delivery", confirm: "Review delivery", outcome: current ? newsletterStateLabel(current.state) : "Post" }[stage]
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(value)) + " EAT"
  const visibleDrafts = drafts.filter((draft) => section === "posts" ? ["draft", "error"].includes(draft.state) : filter === "all" || (filter === "draft" ? ["draft", "error", "checking"].includes(draft.state) : draft.state === filter))
  const pickedPost = publishedPosts.find((post) => post.slug === selectedPost)

  return (
    <AdminShell section={section} session={session} loading={stage === "loading"} busy={busy} onNavigate={navigate} onLogout={() => void work(logout)}>
      <article className="flex min-w-0 flex-col gap-6 pb-8" aria-busy={busy}>
      <header className={stage === "write" ? "sr-only" : "flex items-center gap-3"}>
        {!["loading", "signin", "list"].includes(stage) ? <Button variant="ghost" size="icon" disabled={busy} aria-label={section === "posts" ? "Back to posts" : "Back to newsletters"} onClick={() => void work(backToList)}><ArrowLeft /></Button> : null}
        <h1 className="text-name font-semibold" ref={heading} tabIndex={-1}>{title}</h1>
      </header>
      {error ? <p role="alert" className="text-body text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="text-body">{notice}</p> : null}
      {stage === "loading" ? <section role="status" aria-label={section === "posts" ? "Loading posts" : "Loading newsletters"} className="flex flex-col gap-6">
        <div className="flex justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-32" /></div>
        <div className="rounded-lg border border-border p-4">{[0, 1, 2, 3, 4].map((row) => <div key={row} className="flex items-center gap-4 border-b border-border py-4 last:border-0"><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-16" /><Skeleton className="hidden h-4 w-24 sm:block" /></div>)}</div>
      </section> : null}
      {stage === "signin" ? <div className="flex flex-col gap-4">
        <p className="text-body">{session?.configured === false ? "This writing desk hasn’t been enabled yet." : "Sign in to work on your posts."}</p>
        {session?.configured !== false ? <Button className="w-fit" nativeButton={false} render={<a href={studioLoginURL} />}>Continue with GitHub</Button> : null}
      </div> : null}
      {stage === "list" ? <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {section === "posts" ? <SelectField ariaLabel="Post view" value={postView} onValueChange={(value) => value && setPostView(value)} options={[{ value: "drafts", label: "Drafts" }, { value: "published", label: "Published" }]} disabled={busy} /> : <SelectField ariaLabel="Newsletter status" value={filter} onValueChange={(value) => value && setFilter(value)} options={[{ value: "all", label: "All newsletters" }, { value: "draft", label: "Drafts" }, { value: "scheduled", label: "Scheduled" }, { value: "sent", label: "Sent" }]} disabled={busy} />}
          <div className="flex gap-2">{error ? <Button variant="ghost" disabled={busy} onClick={() => void work(async () => { setDrafts(await studioDrafts()) })}>Reload</Button> : null}<Button disabled={busy} onClick={() => void work(section === "posts" ? newPost : newNewsletter)}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <Plus />}{section === "posts" ? "New post" : "New newsletter"}</Button></div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border"><table className="admin-table"><thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">{section === "posts" && postView === "published" ? "Published" : "Updated"}</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {section === "posts" && postView === "published" ? publishedPosts.map((post) => <tr key={post.slug}><td className="min-w-48 font-medium">{post.title}</td><td><Badge variant="secondary">Published</Badge></td><td className="whitespace-nowrap"><time dateTime={post.date}>{post.date}</time></td><td><div className="flex items-center justify-end gap-2"><a className="admin-text-link inline-flex items-center gap-1 whitespace-nowrap" href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">View<ExternalLink className="size-3" /></a><Button size="sm" variant="outline" disabled={busy} onClick={() => void navigate(`/admin/newsletters?post=${encodeURIComponent(post.slug)}`)}><Mail />Newsletter</Button></div></td></tr>) : visibleDrafts.map((draft) => <tr key={draft.id}><td className="min-w-48"><button type="button" disabled={busy} className="text-left font-medium hover:underline" onClick={() => open(draft)}>{draft.subject}</button></td><td><Badge variant="secondary">{newsletterStateLabel(draft.state)}</Badge></td><td className="whitespace-nowrap">{formatDate(draft.updated_at)}</td><td className="text-right"><Button variant="ghost" size="sm" disabled={busy} onClick={() => open(draft)}>{["draft", "error"].includes(draft.state) ? "Edit" : "View"}</Button></td></tr>)}
          {(section === "posts" && postView === "published" ? publishedPosts.length : visibleDrafts.length) === 0 ? <tr><td colSpan={4}><div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">{section === "posts" ? <FileText className="size-6" /> : <Mail className="size-6" />}<p>{section === "posts" && postView === "published" ? "No published posts" : "No drafts or deliveries found"}</p></div></td></tr> : null}
        </tbody></table></div>
      </> : null}
      {stage === "pick" ? <form className="flex max-w-(--measure) flex-col gap-6" onSubmit={(event) => { event.preventDefault(); void work(usePublishedPost) }}>
        <div className="flex flex-col gap-3"><div className="flex items-center gap-2"><label htmlFor="newsletter-source" className="text-body font-medium">Published post</label><Tooltip><TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Newsletter content details" />}><Info /></TooltipTrigger><TooltipContent>Creates an editable newsletter with this post’s title, summary, and link.</TooltipContent></Tooltip></div>
          <SelectField id="newsletter-source" value={selectedPost} options={publishedPosts.map((post) => ({ value: post.slug, label: post.title }))} onValueChange={setSelectedPost} placeholder={publishedPosts.length ? "Choose a published post" : "No published posts"} disabled={busy || !publishedPosts.length} className="w-full" />
        </div>
        {pickedPost ? <div className="flex flex-col gap-3 rounded-lg border border-border p-4"><Badge variant="secondary" className="w-fit">Published · {pickedPost.date}</Badge><h2 className="text-title font-semibold">{pickedPost.title}</h2><p className="text-body text-muted-foreground">{pickedPost.description}</p><a className="admin-text-link text-caption" href={`/blog/${pickedPost.slug}`} target="_blank" rel="noreferrer">View post</a></div> : null}
        <div className="flex gap-2"><Button type="submit" disabled={busy || !pickedPost}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : null}Create newsletter</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => void work(backToList)}>Cancel</Button></div>
      </form> : null}
      {stage === "write" ? <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void work(backToList)}><ArrowLeft />{section === "posts" ? "Posts" : "Newsletters"}</Button>
          <Button disabled={busy || !subject.trim() || !markdown.trim() || new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT} onClick={() => void work(preview)}>Preview</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
          <p>{section === "posts" ? "Draft post" : "Draft newsletter"}</p>
          <div className="flex items-center gap-2">{saved === "saving" ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : null}<p role="status">{saved === "saving" ? "Saving…" : saved === "error" ? "Changes not saved" : dirty ? "Unsaved changes" : "Saved"}</p>{saved === "error" ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void work(async () => { await save() })}>Retry save</Button> : null}</div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="post-title" className="sr-only">Post title</label>
          <textarea ref={subjectInput} id="post-title" rows={2} className="studio-title w-full resize-none bg-transparent pl-8 font-bold text-foreground outline-none sm:pl-0" value={subject} required maxLength={STUDIO_SUBJECT_LIMIT} disabled={busy} placeholder="Untitled post" onChange={(event) => { const value = event.target.value.replace(/[\r\n]+/g, " "); text.current.subject = value; setSubject(value); setSaved("unsaved") }} />
        </div>
        <NewsletterEditor key={current?.id} value={markdown} disabled={busy} onChange={(value) => { text.current.markdown = value; setMarkdown(value); setSaved("unsaved") }} />
      </> : null}
      {stage === "preview" ? <>
        {section === "posts" ? <div className="flex flex-wrap gap-2" role="group" aria-label="Preview format">
          <Button size="sm" variant={previewMode === "post" ? "secondary" : "ghost"} aria-pressed={previewMode === "post"} disabled={busy} onClick={() => setPreviewMode("post")}>Post</Button>
          <Button size="sm" variant={previewMode === "email" ? "secondary" : "ghost"} aria-pressed={previewMode === "email"} disabled={busy} onClick={() => { if (html && meta) setPreviewMode("email"); else void work(previewEmail) }}>Email</Button>
        </div> : null}
        {previewMode === "post" ? <>
          <div className="border-y border-border py-6"><h2 className="studio-title font-bold">{subject}</h2><Markdown className="mt-6">{markdown}</Markdown></div>
        </> : busy && !meta ? <div role="status" aria-label="Loading email preview" className="flex flex-col gap-4"><Skeleton className="h-4 w-48" /><Skeleton className="h-96 w-full" /></div> : meta ? <>
        <p className="text-caption text-muted-foreground">From {meta.sender.name} · {meta.sender.email}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Email preview device"><Button size="sm" variant={device === "desktop" ? "secondary" : "ghost"} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</Button><Button size="sm" variant={device === "mobile" ? "secondary" : "ghost"} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</Button></div>
        <div className={device === "mobile" ? "mx-auto w-full max-w-sm" : "w-full"}><iframe title="Newsletter email preview" sandbox="" srcDoc={html} className="min-h-96 w-full rounded-2xl border border-input" /></div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { setLater(false); setStage("delivery") }}>Set up email delivery</Button><Button variant="secondary" disabled={busy || !meta.test_email} onClick={() => void work(() => action("test"))}>Send me a test</Button></div>
        {current?.tested_revision === current?.revision ? <p className="text-caption text-muted-foreground">A test was sent for this version.</p> : null}
        {!meta.test_email ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Test email unavailable" />}><Info /></TooltipTrigger><TooltipContent>Configure a test recipient to enable test emails.</TooltipContent></Tooltip> : null}
        </> : <Button className="w-fit" variant="outline" disabled={busy} onClick={() => void work(previewEmail)}>Retry email preview</Button>}
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
      </article>
    </AdminShell>
  )
}
