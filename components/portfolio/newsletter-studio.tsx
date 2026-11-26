"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { focusElement } from "@/lib/scroll"
import { Markdown } from "@/components/prompt-kit/markdown"
import { AdminShell } from "@/components/portfolio/admin-shell"
import { DocumentActions } from "@/components/portfolio/document-actions"
import { TablePager } from "@/components/portfolio/table-pager"
import { SelectField } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FileText, Mail, Plus, Info, LoaderCircle, X, ExternalLink, Send, Check, Monitor, Smartphone } from "lucide-react"
import { site } from "@/lib/portfolio-data"
import {
  studioBootstrap, studioCachedDesk, studioUpdateDesk, studioOpen, studioWarm, studioRemove, studioCreate, studioSave, studioPreview, studioMeta, studioAction, studioLogout, studioFromPost, studioPublish, studioUpload,
  studioLoginURL, nairobiSchedule, newsletterStateLabel, STUDIO_SUBJECT_LIMIT, STUDIO_BODY_LIMIT,
  type NewsletterDraft, type StudioSession, type StudioMeta, type PublishedStudioPost, type StudioRemoval, type AdminDesk,
} from "@/lib/newsletter-studio"

type Stage = "loading" | "signin" | "list" | "pick" | "write" | "preview" | "delivery" | "confirm" | "outcome" | "publish-url" | "publish-summary" | "publish-review" | "published"
const loadEditor = () => import("@/components/portfolio/newsletter-editor")
const PAGE_SIZE = 20
const NewsletterEditor = dynamic(() => loadEditor().then((module) => module.NewsletterEditor), { loading: () => <div role="status" aria-label="Loading editor" className="flex flex-col gap-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div> })
const inputClass = "chat-input min-h-8 w-full min-w-0 bg-transparent px-0.5 text-base leading-7 text-foreground outline-none"
const surfaceClass = "glass-surface rounded-2xl border border-input p-2.5 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20"

// Ghost's writing -> email preview/test -> delivery -> confirmation flow.
// The portfolio's form controls and theme are reused throughout.
export function NewsletterStudio({ section = "posts", initialPost }: { section?: "posts" | "newsletters"; initialPost?: string }) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("loading")
  const [session, setSession] = useState<StudioSession | null>(null)
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([])
  const [publishedPosts, setPublishedPosts] = useState<PublishedStudioPost[]>([])
  const [current, setCurrent] = useState<NewsletterDraft | null>(null)
  const [subject, setSubject] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [saved, setSaved] = useState<"saved" | "saving" | "unsaved" | "error">("saved")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [html, setHTML] = useState("")
  const [preheader, setPreheader] = useState("")
  const [meta, setMeta] = useState<StudioMeta | null>(null)
  const [page, setPage] = useState(0)
  const [selectedPost, setSelectedPost] = useState<string | null>(initialPost ?? null)
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [previewMode, setPreviewMode] = useState<"post" | "email">("post")
  const [later, setLater] = useState(false)
  const [schedule, setSchedule] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [bootAttempt,setBootAttempt]=useState(0)
  const currentRef = useRef<NewsletterDraft | null>(null)
  const text = useRef({ subject: "", markdown: "" })
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const heading = useRef<HTMLHeadingElement>(null)
  const subjectInput = useRef<HTMLTextAreaElement>(null)
  const mounted = useRef(false)
  const actionPending = useRef(false)
  const tableScroll = useRef<HTMLDivElement>(null)
  // Lists changed on this screen win over responses that were already in flight.
  const listVersion = useRef(0)

  const accept = useCallback((d: NewsletterDraft) => { currentRef.current = d; setCurrent(d) }, [])
  const fail = useCallback((failure: unknown) => { setError(failure instanceof Error ? failure.message : "Something went wrong. Please try again.") }, [])

  useEffect(() => {
    mounted.current = true
    const version = listVersion.current
    let shown = false
    const show = ({ session: owner, drafts: list, posts }: AdminDesk) => {
      if (!mounted.current) return
      if (!owner.authenticated) {
        // Never replace an open document; its next save reports the expired session.
        if (shown && currentRef.current) return
        setSession(owner)
        if (new URLSearchParams(window.location.search).get("login") === "failed") setError("Sign-in wasn’t completed. Try your owner account.")
        setStage("signin"); return
      }
      setSession(owner)
      if (version === listVersion.current) { setDrafts(list); setPublishedPosts(posts) }
      if (shown) return
      shown = true
      currentRef.current = null; setCurrent(null)
      setSelectedPost(initialPost ?? null)
      setStage(section === "newsletters" && initialPost && posts.some((post) => post.slug === initialPost) ? "pick" : "list")
    }
    const cached = studioCachedDesk(section)
    // A just-published post may be newer than the remembered list.
    if (cached && (!initialPost || cached.posts.some((post) => post.slug === initialPost))) void Promise.resolve(cached).then(show)
    studioBootstrap(section).then((desk) => {
      show(desk)
      // Switching sections then needs no wait.
      const other = section === "posts" ? "newsletters" : "posts"
      if (desk.session.authenticated && !studioCachedDesk(other)) void studioBootstrap(other).catch(() => undefined)
    }).catch((failure) => { if (mounted.current) { fail(failure); if (!shown) setStage("signin") } })
    return () => { mounted.current = false }
  }, [fail, initialPost, section, bootAttempt])

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
    if (busy || stage !== "write" || !current || !["draft", "error"].includes(current.state) || (subject.trim() === current.subject && markdown === current.markdown)) return
    const timer = setTimeout(() => { void save().catch(fail) }, 750)
    return () => clearTimeout(timer)
  }, [busy, stage, subject, markdown, current, save, fail])

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
    if (currentRef.current) put(currentRef.current)
    currentRef.current = null; setCurrent(null); setStage("list")
    refreshList()
  }
  function replaceList(next: NewsletterDraft[]) {
    listVersion.current++
    setDrafts(next); studioUpdateDesk(section, next)
  }
  function put(d: NewsletterDraft) {
    const summary = { ...d, markdown: "" }
    if (d.kind && d.kind !== (section === "posts" ? "post" : "newsletter")) return
    replaceList([summary, ...drafts.filter((item) => item.id !== d.id)])
  }
  // The list is already on screen; this only corrects it in the background.
  function refreshList() {
    const version = listVersion.current
    studioBootstrap(section).then((desk) => {
      if (!mounted.current || version !== listVersion.current) return
      if (!desk.session.authenticated) { if (!currentRef.current) { setSession(desk.session); setStage("signin") } return }
      setDrafts(desk.drafts); setPublishedPosts(desk.posts)
      void studioBootstrap(section === "posts" ? "newsletters" : "posts").catch(() => undefined)
    }).catch((failure) => { if (mounted.current) fail(failure) })
  }
  async function remove(target: NewsletterDraft, kind: StudioRemoval) {
    let done = false
    await work(async () => {
      // Let a save in progress settle, then act on the latest saved revision.
      await saveQueue.current.catch(() => undefined)
      const latest = currentRef.current?.id === target.id ? currentRef.current : target
      const result = await studioRemove(session!.csrf, latest, kind)
      done = true
      if (!mounted.current) return
      currentRef.current = null; setCurrent(null)
      if (result) put(result); else replaceList(drafts.filter((item) => item.id !== target.id))
      if (kind !== "discard") setPublishedPosts((posts) => posts.filter((post) => post.slug !== target.slug))
      setStage("list")
      setNotice(kind === "delete" ? "Deleted." : kind === "unpublish" ? "Unpublished. The post is now a draft." : "Changes discarded.")
      if (result?.cache_invalidated === false) setNotice("Done. Public pages may take a moment to refresh.")
      refreshList()
    })
    return done
  }
  function warm(d: NewsletterDraft) { studioWarm(d); void loadEditor() }
  function open(d: NewsletterDraft) {
    accept(d); text.current = { subject: d.subject, markdown: d.markdown }; setSubject(d.subject); setMarkdown(d.markdown)
    setSaved("saved"); setError(""); setNotice(""); setStage(["draft", "error"].includes(d.state) ? "write" : "outcome")
  }
  async function newPost() {
    if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
    open(await studioCreate(session!.csrf, "Untitled post", "post"))
  }
  async function newNewsletter() {
    if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
    setSelectedPost(null); setStage("pick")
  }
  async function usePublishedPost() {
    const post = publishedPosts.find((post) => post.slug === selectedPost)
    if (!post) throw new Error("Choose a published post.")
    open(await studioFromPost(session!.csrf, post.slug))
  }
  async function navigate(href: string) {
    await work(async () => {
      if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
      router.push(href)
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
  async function preparePublish() {
    const draft=await save()
    setSlug(draft.slug || draft.subject.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0,160).replace(/-$/,""))
    setDescription(draft.description || "")
    setStage(draft.slug ? "publish-summary" : "publish-url")
  }
  async function publish() {
    const draft=await save()
    const published = await studioPublish(session!.csrf,draft,slug,description)
    accept(published); put(published)
    setStage("published")
  }
  async function previewEmail() {
    setPreviewMode("email")
    const d = currentRef.current
    if (!d) return
    const [email, audience] = await Promise.all([studioPreview(session!.csrf, d), studioMeta()])
    setHTML(email.html); setPreheader(email.preheader); setMeta(audience); setPreviewMode("email")
  }
  async function action(kind: "test" | "send" | "schedule" | "cancel" | "refresh") {
    if (!currentRef.current || !session?.csrf) return
    const result = await studioAction(session.csrf, currentRef.current, kind, kind === "schedule" ? nairobiSchedule(schedule) : undefined)
    accept(result)
    text.current = { subject: result.subject, markdown: result.markdown }; setSubject(result.subject); setMarkdown(result.markdown)
    // A successful test is shown on the preview itself, beside the email.
    if (!(kind === "test" && result.state === "draft" && result.tested_revision === result.revision)) { setStage("outcome"); if (result.last_error) setError(result.last_error) }
  }
  const title = { loading: section === "posts" ? "Posts" : "Newsletters", signin: "Sign in", list: section === "posts" ? "Posts" : "Newsletters", pick: "New newsletter", write: subject || "Untitled post", preview: section === "posts" ? "Post preview" : "Newsletter preview", delivery: "Email delivery", confirm: "Review delivery", outcome: current ? newsletterStateLabel(current.state) : "Post", "publish-url":"Choose a post URL", "publish-summary":"Add a summary", "publish-review":"Review publication", published:"Post published" }[stage]
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(value)) + " EAT"
  const statusOf = (d: NewsletterDraft) => section === "newsletters" ? newsletterStateLabel(d.state) : !d.published_revision ? "Draft" : d.published_revision < d.revision ? "Unpublished changes" : "Published"
  const publishedDates = new Map(publishedPosts.map((post) => [post.slug, post.date]))
  // A published article is dated by its publication, everything else by its last edit.
  const dateOf = (d: NewsletterDraft) => d.published_revision && d.published_revision === d.revision && d.slug ? publishedDates.get(d.slug) ?? d.updated_at : d.updated_at
  const rows = [...drafts].sort((a, b) => Date.parse(dateOf(b)) - Date.parse(dateOf(a)))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  const firstRow = currentPage * PAGE_SIZE
  const visibleRows = rows.slice(firstRow, firstRow + PAGE_SIZE)
  const listing = stage === "list" || stage === "loading"
  function turnPage(next: number) { setPage(next); if (tableScroll.current) tableScroll.current.scrollTop = 0 }
  const scheduleLabel = (value: string) => { try { return formatDate(new Date(`${value}:00+03:00`).toISOString()) } catch { return value } }
  const pickedPost = publishedPosts.find((post) => post.slug === selectedPost)

  return (
    <AdminShell section={section} title={title} session={session} loading={stage === "loading"} busy={busy} editing={stage === "write" || listing} onNavigate={navigate} onLogout={() => void work(logout)} actions={<>
      {stage === "write" ? <Button size="sm" disabled={busy || !subject.trim() || !markdown.trim() || new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT} onClick={() => void work(preview)}>Preview</Button> : null}
      {stage === "preview" ? <><Button size="sm" variant="ghost" disabled={busy} onClick={() => setStage("write")}>Write</Button>{section === "posts" ? <Button size="sm" disabled={busy} onClick={() => void work(preparePublish)}>{current?.published_revision ? "Update post" : "Publish"}</Button> : meta ? <><Button size="sm" variant="secondary" disabled={busy || !meta.test_email} onClick={() => void work(() => action("test"))}><Send />Send test</Button><Button size="sm" disabled={busy} onClick={() => { setLater(false); setStage("delivery") }}>Continue</Button></> : null}</> : null}
      {!["loading","signin","list"].includes(stage) ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" disabled={busy} aria-label="Save and close" onClick={() => void work(backToList)} />}><X /></TooltipTrigger><TooltipContent>Save and close</TooltipContent></Tooltip> : null}
      {stage === "list" ? <>{error ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void work(backToList)}>Reload</Button> : null}<Button size="sm" disabled={busy} onClick={() => void work(section === "posts" ? newPost : newNewsletter)}><Plus />{section === "posts" ? "New post" : "New newsletter"}</Button></> : null}
      {["write", "preview", "published"].includes(stage) && current ? <DocumentActions document={current} busy={busy} onNewsletter={() => void navigate(`/admin/newsletters?post=${encodeURIComponent(current.slug!)}`)} onRemove={(kind) => remove(current, kind)} /> : null}
    </>}>
      <article className={stage === "write" || listing ? "flex h-full min-h-0 min-w-0 flex-col gap-4" : "flex min-w-0 flex-col gap-6 pb-8"} aria-busy={busy}>
      <h1 className="sr-only" ref={heading} tabIndex={-1}>{title}</h1>
      {error ? <p role="alert" className="text-body text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="text-body">{notice}</p> : null}
      {stage === "loading" ? <section role="status" aria-label={section === "posts" ? "Loading posts" : "Loading newsletters"} className="admin-table-frame">
        <div className="min-h-0 flex-1 overflow-hidden px-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((row) => <div key={row} className="flex items-center gap-4 border-b border-border py-4 last:border-0"><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-16" /><Skeleton className="hidden h-4 w-24 sm:block" /></div>)}</div>
      </section> : null}
      {stage === "signin" ? <div className="flex flex-col gap-4">
        <p className="text-body">{session?.configured === false ? "This writing desk hasn’t been enabled yet." : "Sign in to work on your posts."}</p>
        {session?.configured !== false ? <Button className="w-fit" nativeButton={false} render={<a href={studioLoginURL} />}>Continue with GitHub</Button> : null}
        {error && !session ? <Button className="w-fit" variant="outline" onClick={()=>{setError("");setStage("loading");setBootAttempt((attempt)=>attempt+1)}}>Retry loading</Button> : null}
      </div> : null}
      {stage === "list" ? <div className="admin-table-frame">
        <div ref={tableScroll} className="admin-table-scroll" role="region" aria-label={section === "posts" ? "All posts" : "All newsletters"} tabIndex={0}><table className="admin-table"><thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {visibleRows.map((row) => {
            const date = dateOf(row)
            return <tr key={row.id}>
              <td className="min-w-48"><button type="button" disabled={busy} className="text-left font-medium hover:underline" onPointerEnter={() => warm(row)} onFocus={() => warm(row)} onClick={() => void work(async () => open(await studioOpen(row)))}>{row.subject}</button></td>
              <td><Badge variant="secondary">{statusOf(row)}</Badge></td>
              <td className="whitespace-nowrap"><time dateTime={date}>{date.length === 10 ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date)) : formatDate(date)}</time></td>
              <td className="text-right"><DocumentActions document={row} busy={busy} onOpen={() => void work(async () => open(await studioOpen(row)))} onNewsletter={() => void navigate(`/admin/newsletters?post=${encodeURIComponent(row.slug!)}`)} onRemove={(kind) => remove(row, kind)} /></td>
            </tr>
          })}
          {rows.length === 0 ? <tr><td colSpan={4}><div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">{section === "posts" ? <FileText className="size-6" /> : <Mail className="size-6" />}<p>{section === "posts" ? "No posts yet" : "No newsletters yet"}</p></div></td></tr> : null}
        </tbody></table></div>
        <TablePager first={firstRow} shown={visibleRows.length} total={rows.length} page={currentPage} pages={pages} onPage={turnPage} />
      </div> : null}
      {stage === "pick" ? <form className="flex max-w-(--measure) flex-col gap-6" onSubmit={(event) => { event.preventDefault(); void work(usePublishedPost) }}>
        <div className="flex flex-col gap-3"><div className="flex items-center gap-2"><label htmlFor="newsletter-source" className="text-body font-medium">Published post</label><Tooltip><TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Newsletter content details" />}><Info /></TooltipTrigger><TooltipContent>Copies the whole post into an editable newsletter. Interactive parts become links.</TooltipContent></Tooltip></div>
          <SelectField id="newsletter-source" value={selectedPost} options={publishedPosts.map((post) => ({ value: post.slug, label: post.title }))} onValueChange={setSelectedPost} placeholder={publishedPosts.length ? "Choose a published post" : "No published posts"} disabled={busy || !publishedPosts.length} className="w-full" />
        </div>
        {pickedPost ? <div className="flex flex-col gap-3 rounded-lg border border-border p-4"><Badge variant="secondary" className="w-fit">Published · {pickedPost.date}</Badge><h2 className="text-title font-semibold">{pickedPost.title}</h2><p className="text-body text-muted-foreground">{pickedPost.description}</p><a className="admin-text-link text-caption" href={`/blog/${pickedPost.slug}`} target="_blank" rel="noreferrer">View post</a></div> : null}
        <div className="flex gap-2"><Button type="submit" disabled={busy || !pickedPost}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : null}Create newsletter</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => void work(backToList)}>Cancel</Button></div>
      </form> : null}
      {stage === "write" ? <>
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
          <p>{section === "posts" ? current?.published_revision ? "Published · Editing draft" : "Draft post" : "Draft newsletter"}</p>
          <div className="flex items-center gap-2">{saved === "saving" ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : null}<p role="status">{saved === "saving" ? "Saving…" : saved === "error" ? "Changes not saved" : dirty ? "Unsaved changes" : "Saved"}</p>{saved === "error" ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void work(async () => { await save() })}>Retry save</Button> : null}</div>
        </div>
        <div className="admin-editor-scroll" role="region" aria-label="Article editor" tabIndex={0}>
        <div className="flex flex-col gap-2">
          <label htmlFor="post-title" className="sr-only">Post title</label>
          <textarea ref={subjectInput} id="post-title" rows={2} className="studio-title w-full resize-none bg-transparent pl-8 font-bold text-foreground outline-none" value={subject} required maxLength={STUDIO_SUBJECT_LIMIT} disabled={busy} placeholder="Untitled post" onChange={(event) => { const value = event.target.value.replace(/[\r\n]+/g, " "); text.current.subject = value; setSubject(value); setSaved("unsaved") }} />
        </div>
        <NewsletterEditor key={current?.id} value={markdown} disabled={busy} onUpload={(file) => studioUpload(session!.csrf,file)} onChange={(value) => { text.current.markdown = value; setMarkdown(value); setSaved("unsaved") }} />
        </div>
      </> : null}
      {stage === "preview" ? <>
        {previewMode === "post" ? <>
          <div className="border-y border-border py-6"><h2 className="studio-title font-bold">{subject}</h2><Markdown className="mt-6">{markdown}</Markdown></div>
        </> : busy && !meta ? <div role="status" aria-label="Loading email preview" className="flex flex-col gap-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-96 w-full" /></div> : meta ? <>
        {/* Inbox header first, as Buttondown and Ghost preview it: what a reader sees before opening. */}
        <section aria-label="How it appears in the inbox" className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border p-4">
          <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
            <dt className="text-muted-foreground">From</dt><dd className="min-w-0 break-words">{meta.sender.name} &lt;{meta.sender.email}&gt;</dd>
            <dt className="text-muted-foreground">To</dt><dd>All subscribers · {meta.subscribers}</dd>
            <dt className="text-muted-foreground">Subject</dt><dd className="min-w-0 font-medium break-words">{subject}</dd>
            {preheader ? <><dt className="text-muted-foreground">Preview text</dt><dd className="min-w-0 break-words text-muted-foreground">{preheader}</dd></> : null}
          </dl>
          <div className="flex gap-1" role="group" aria-label="Email preview device"><Button size="icon-sm" variant={device === "desktop" ? "secondary" : "ghost"} aria-pressed={device === "desktop"} aria-label="Desktop" onClick={() => setDevice("desktop")}><Monitor /></Button><Button size="icon-sm" variant={device === "mobile" ? "secondary" : "ghost"} aria-pressed={device === "mobile"} aria-label="Mobile" onClick={() => setDevice("mobile")}><Smartphone /></Button></div>
        </section>
        {current?.tested_revision === current?.revision ? <p className="flex items-center gap-2 text-caption text-muted-foreground"><Check className="size-4" />A test was sent to {meta.test_email} for this version.</p> : !meta.test_email ? <p className="text-caption text-muted-foreground">Set a test address to send yourself a test.</p> : null}
        <div className={device === "mobile" ? "mx-auto w-full max-w-sm" : "w-full"}><iframe title="Newsletter email preview" sandbox="" srcDoc={html} className="h-[70dvh] min-h-96 w-full rounded-lg border border-border" /></div>
        </> : <Button className="w-fit" variant="outline" disabled={busy} onClick={() => void work(previewEmail)}>Retry email preview</Button>}
      </> : null}
      {stage === "publish-url" || stage === "publish-summary" ? <form className="flex max-w-(--measure) flex-col gap-6" onSubmit={(event)=>{event.preventDefault();setStage(stage==="publish-url" ? "publish-summary" : "publish-review")}}>
        <p className="text-caption text-muted-foreground">{stage==="publish-url" ? "1" : "2"} of 3</p>
        {stage==="publish-url" ? <><label htmlFor="post-slug" className="text-body">Post URL</label><div className={surfaceClass}><input id="post-slug" className={inputClass} value={slug} onChange={(event)=>setSlug(event.target.value)} required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={busy}/></div><p className="break-all text-caption text-muted-foreground">{site.url}/blog/{slug}</p></> : <><label htmlFor="post-summary" className="text-body">Summary</label><div className={surfaceClass}><textarea id="post-summary" className={inputClass} rows={4} value={description} onChange={(event)=>setDescription(event.target.value)} required maxLength={300} disabled={busy}/></div><p className="text-caption text-muted-foreground">{description.length}/300</p></>}
        <div className="flex gap-2"><Button type="submit" disabled={busy || (stage==="publish-summary" && !description.trim())}>{stage==="publish-url" ? "Next" : "Review"}</Button><Button type="button" variant="ghost" onClick={()=>setStage(stage==="publish-summary" && !current?.slug ? "publish-url" : "preview")}>Back</Button></div>
      </form> : null}
      {stage === "publish-review" ? <div className="flex max-w-(--measure) flex-col gap-6">
        <p className="text-caption text-muted-foreground">3 of 3</p><h2 className="text-title font-semibold">{subject}</h2><p className="text-body">{description}</p><p className="break-all text-caption text-muted-foreground">{site.url}/blog/{slug}</p>
        <div className="flex gap-2"><Button disabled={busy} onClick={()=>void work(publish)}>{busy ? <LoaderCircle className="motion-safe:animate-spin"/> : null}{current?.published_revision ? "Confirm update" : "Publish post"}</Button><Button variant="ghost" disabled={busy} onClick={()=>setStage("publish-summary")}>Back</Button></div>
      </div> : null}
      {stage === "published" && current?.slug ? <div className="flex flex-col gap-4"><div className="flex items-center gap-2"><h2 className="text-title font-semibold">{current.subject}</h2>{current.cache_invalidated === false ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Public page refresh status"/>}><Info/></TooltipTrigger><TooltipContent>Published. Public pages will refresh through the cache; reload shortly if you see the previous version.</TooltipContent></Tooltip> : null}</div><div className="flex flex-wrap gap-2"><Button nativeButton={false} render={<a href={`/blog/${current.slug}`} target="_blank" rel="noreferrer"/>}><ExternalLink/>View post</Button><Button variant="outline" disabled={busy} onClick={()=>void navigate(`/admin/newsletters?post=${encodeURIComponent(current.slug!)}`)}><Mail/>Create newsletter</Button></div></div> : null}
      {stage === "delivery" && meta ? <form className="flex max-w-(--measure) flex-col gap-6" onSubmit={(event) => { event.preventDefault(); void work(async () => { if (later) nairobiSchedule(schedule); setMeta(await studioMeta()); setStage("confirm") }) }}>
        {/* Ghost's publish settings: recipients, then timing, then a one-line summary. */}
        <fieldset className="flex flex-col gap-3"><legend className="pb-3 text-body font-medium">Recipients</legend>
          <p className="flex items-center gap-2 rounded-lg border border-ring bg-primary/5 p-3 text-body"><Check className="size-4 text-primary" />All subscribers · {meta.subscribers}</p>
          <p className="text-caption text-muted-foreground">Only confirmed subscribers receive it. Unsubscribed and pending contacts are skipped.</p>
        </fieldset>
        <fieldset className="flex flex-col gap-3"><legend className="pb-3 text-body font-medium">When</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Delivery time"><Button type="button" variant={!later ? "secondary" : "ghost"} aria-pressed={!later} onClick={() => setLater(false)}>Right now</Button><Button type="button" variant={later ? "secondary" : "ghost"} aria-pressed={later} onClick={() => setLater(true)}>Schedule for later</Button></div>
          {later ? <><label htmlFor="newsletter-schedule" className="text-caption text-muted-foreground">Date and time in Nairobi (EAT)</label><div className={surfaceClass}><input id="newsletter-schedule" className={inputClass} type="datetime-local" required value={schedule} disabled={busy} onChange={(e) => setSchedule(e.target.value)} /></div></> : null}
        </fieldset>
        <p className="text-body">{meta.subscribers < 1 ? "There are no confirmed subscribers yet." : `Goes to ${meta.subscribers} ${meta.subscribers === 1 ? "subscriber" : "subscribers"} ${later ? (schedule ? `on ${scheduleLabel(schedule)}` : "at the time you choose") : "right now"}.`}</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || meta.subscribers < 1} type="submit">Continue</Button><Button disabled={busy} variant="ghost" type="button" onClick={() => setStage("preview")}>Back</Button></div>
      </form> : null}
      {stage === "confirm" && meta ? <div className="flex max-w-(--measure) flex-col gap-4">
        <h2 className="text-title font-semibold">Ready to send?</h2>
        <p className="text-body">“{subject}” goes to {meta.subscribers} {meta.subscribers === 1 ? "subscriber" : "subscribers"} {later ? `on ${scheduleLabel(schedule)}` : "right now"}. Sent emails can’t be recalled.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || meta.subscribers < 1} onClick={() => void work(() => action(later ? "schedule" : "send"))}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <Send />}{later ? "Schedule email" : "Send email, right now"}</Button><Button disabled={busy} variant="ghost" onClick={() => setStage("delivery")}>Back</Button></div>
      </div> : null}
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
