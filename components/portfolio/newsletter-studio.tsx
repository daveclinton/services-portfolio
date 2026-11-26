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
import { LiveArticle } from "@/components/portfolio/live-article"
import { SortHeader } from "@/components/portfolio/sort-header"
import { EMPTY_QUERY, compareText, leaveDeskQuery, nextSort, readPage, readSort, setDeskQuery, type DeskQuery, type SortDir } from "@/lib/desk-url"
import { SelectField } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FileText, Mail, Search, Plus, Info, LoaderCircle, X, ExternalLink, Send, Check, Monitor, Smartphone } from "lucide-react"
import { site } from "@/lib/portfolio-data"
import {
  studioDraft, studioRecipients, studioContacts, studioBootstrap, studioCachedDesk, studioUpdateDesk, studioOpen, studioWarm, studioRemove, studioCreate, studioSave, studioPreview, studioMeta, studioAction, studioLogout, studioFromPost, studioPublish, studioUpload,
  studioLoginURL, announceSaved, previewPath, nairobiSchedule, newsletterStateLabel, STUDIO_SUBJECT_LIMIT, STUDIO_BODY_LIMIT, STUDIO_SUMMARY_LIMIT,
  type NewsletterDraft, type StudioSession, type StudioMeta, type PublishedStudioPost, type StudioRemoval, type AdminDesk, type StudioContact,
} from "@/lib/newsletter-studio"

type Stage = "loading" | "signin" | "list" | "pick" | "write" | "preview" | "delivery" | "confirm" | "outcome" | "publish-url" | "publish-summary" | "publish-review" | "published"
const loadEditor = () => import("@/components/portfolio/newsletter-editor")
const PAGE_SIZE = 20
const NewsletterEditor = dynamic(() => loadEditor().then((module) => module.NewsletterEditor), { loading: () => <div role="status" aria-label="Loading editor" className="flex flex-col gap-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div> })
const inputClass = "chat-input min-h-8 w-full min-w-0 bg-transparent px-0.5 text-base leading-7 text-foreground outline-none"
const surfaceClass = "glass-surface rounded-2xl border border-input p-2.5 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20"

// Ghost's writing -> email preview/test -> delivery -> confirmation flow.
// The portfolio's form controls and theme are reused throughout.
const SORT_KEYS = ["title", "status", "date"] as const
type SortKey = typeof SORT_KEYS[number]
const sortDefault = (key: SortKey): SortDir => key === "date" ? "desc" : "asc"
// Matches the container query in globals.css: below this the desk shows the
// editor alone, and the live view is not rendered at all.
const LIVE_VIEW_MIN_WIDTH = 896

export function NewsletterStudio({ section = "posts", initialPost, query = EMPTY_QUERY }: { section?: "posts" | "newsletters"; initialPost?: string; query?: DeskQuery }) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("loading")
  const [session, setSession] = useState<StudioSession | null>(null)
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([])
  const [publishedPosts, setPublishedPosts] = useState<PublishedStudioPost[]>([])
  const [current, setCurrent] = useState<NewsletterDraft | null>(null)
  const [subject, setSubject] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [summary, setSummary] = useState("")
  const [saved, setSaved] = useState<"saved" | "saving" | "unsaved" | "error">("saved")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [html, setHTML] = useState("")
  const [preheader, setPreheader] = useState("")
  const [audience, setAudience] = useState<"all" | "selected">("all")
  const [picked, setPicked] = useState<string[]>([])
  const [subscribers, setSubscribers] = useState<StudioContact[] | null>(null)
  const [pickerQuery, setPickerQuery] = useState("")
  const [meta, setMeta] = useState<StudioMeta | null>(null)
  const [selectedPost, setSelectedPost] = useState<string | null>(initialPost ?? null)
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [previewMode, setPreviewMode] = useState<"post" | "email">("post")
  const [later, setLater] = useState(false)
  const [schedule, setSchedule] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [bootAttempt,setBootAttempt]=useState(0)
  const currentRef = useRef<NewsletterDraft | null>(null)
  const text = useRef({ subject: "", markdown: "", summary: "" })
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const heading = useRef<HTMLHeadingElement>(null)
  const subjectInput = useRef<HTMLTextAreaElement>(null)
  const mounted = useRef(false)
  // The post to start a newsletter from is read once, when the desk opens.
  const startPost = useRef(initialPost)
  const actionPending = useRef(false)
  const tableScroll = useRef<HTMLDivElement>(null)
  const writeArea = useRef<HTMLDivElement>(null)
  const pendingSubjectFocus = useRef(false)
  const attachSubjectInput = useCallback((element: HTMLTextAreaElement | null) => {
    subjectInput.current = element
    // The title now renders inside the lazy editor, which can mount after the
    // writing stage's focus effect. Fulfil that pending focus when it arrives.
    if (element && pendingSubjectFocus.current) {
      pendingSubjectFocus.current = false
      focusElement(element)
      if (element.value === "Untitled post") element.select()
    }
  }, [])
  const [roomy, setRoomy] = useState(true)
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
      setSelectedPost(startPost.current ?? null)
      setStage(section === "newsletters" && startPost.current && posts.some((post) => post.slug === startPost.current) ? "pick" : "list")
    }
    const cached = studioCachedDesk(section)
    // A just-published post may be newer than the remembered list.
    if (cached && (!startPost.current || cached.posts.some((post) => post.slug === startPost.current))) void Promise.resolve(cached).then(show)
    studioBootstrap(section).then((desk) => {
      show(desk)
      // Switching sections then needs no wait.
      const other = section === "posts" ? "newsletters" : "posts"
      if (desk.session.authenticated && !studioCachedDesk(other)) void studioBootstrap(other).catch(() => undefined)
    }).catch((failure) => { if (mounted.current) { fail(failure); if (!shown) setStage("signin") } })
    return () => { mounted.current = false }
  }, [fail, section, bootAttempt])

  useEffect(() => {
    pendingSubjectFocus.current = stage === "write" && !busy && !subjectInput.current
    if (stage === "write" && !busy) { focusElement(subjectInput.current); if (subjectInput.current?.value === "Untitled post") subjectInput.current.select() }
    else if (stage !== "loading") focusElement(heading.current)
  }, [stage, busy])

  // Measured on the desk itself, since the sidebar takes part of the window.
  useEffect(() => {
    const area = writeArea.current
    if (stage !== "write" || !area || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => setRoomy(entry.contentRect.width >= LIVE_VIEW_MIN_WIDTH))
    observer.observe(area)
    return () => observer.disconnect()
  }, [stage])

  // Back, Forward, reloads and shared links drive the desk through ?doc and ?view.
  const docParam = query.get("doc")
  const viewParam = query.get("view")
  const ready = !["loading", "signin"].includes(stage)
  useEffect(() => {
    if (!ready || actionPending.current) return
    const open = currentRef.current
    const editable = open && ["draft", "error"].includes(open.state)
    if (docParam && open?.id !== docParam) {
      void work(async () => {
        if (editable) await save()
        let d: NewsletterDraft
        try { d = await studioDraft(docParam) } catch (failure) { setDeskQuery({ doc: null, view: null }); throw failure }
        const home = d.kind === "post" ? "posts" : "newsletters"
        if (home !== section) { router.replace(`/admin/${home}?doc=${d.id}${viewParam ? `&view=${viewParam}` : ""}`); return }
        if (open) put(open)
        openRef.current(d, "none")
        if (viewParam === "preview" && section === "newsletters" && ["draft", "error"].includes(d.state)) await previewRef.current(false)
      })
    } else if (!docParam && open && stage !== "list") {
      void work(closeRef.current)
    } else if (docParam && open?.id === docParam) {
      if (viewParam === "preview" && section === "posts") setDeskQuery({ view: null })
      else if (viewParam === "preview" && stage === "write") void work(() => previewRef.current(false))
      else if (!viewParam && ["preview", "delivery", "confirm"].includes(stage) && editable) setStage("write")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the handlers are read through refs
  }, [ready, docParam, viewParam, stage, section])

  // Posts carry a summary with the title and body; newsletters do not.
  const matches = useCallback((d: NewsletterDraft, t: { subject: string; markdown: string; summary: string }) => t.subject.trim() === d.subject && t.markdown === d.markdown && (section !== "posts" || t.summary.trim() === (d.description ?? "")), [section])
  const save = useCallback((): Promise<NewsletterDraft> => {
    const queued = saveQueue.current.catch(() => undefined).then(async () => {
      const draft = currentRef.current
      if (!draft || !session?.csrf) throw new Error("Reopen your draft before continuing.")
      const snapshot = { ...text.current, subject: text.current.subject.trim() }
      if (matches(draft, snapshot)) return draft
      setSaved("saving")
      try {
        const result = await studioSave(session.csrf, draft, snapshot.subject, snapshot.markdown, section === "posts" ? snapshot.summary.trim() : undefined)
        if (!mounted.current || currentRef.current?.id !== draft.id) throw new Error("Reopen this draft before continuing.")
        accept(result)
        announceSaved(result.id)
        setSaved(matches(result, text.current) ? "saved" : "unsaved")
        return result
      } catch (failure) { if (mounted.current) setSaved("error"); throw failure }
    })
    saveQueue.current = queued
    return queued
  }, [session, accept, matches, section])

  useEffect(() => {
    if (busy || stage !== "write" || !current || !["draft", "error"].includes(current.state) || matches(current, { subject, markdown, summary })) return
    const timer = setTimeout(() => { void save().catch(fail) }, 750)
    return () => clearTimeout(timer)
  }, [busy, stage, subject, markdown, summary, current, save, fail, matches])

  const dirty = current !== null && !matches(current, { subject, markdown, summary })
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      const latest = currentRef.current
      if (latest && matches(latest, text.current)) return
      event.preventDefault(); event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, matches])

  async function work(action: () => Promise<void>) {
    if (actionPending.current) return
    actionPending.current = true
    setBusy(true); setError(""); setNotice("")
    try { await action() } catch (failure) { fail(failure) } finally { actionPending.current = false; if (mounted.current) setBusy(false) }
  }
  async function closeDocument() {
    if (currentRef.current && ["draft", "error"].includes(currentRef.current.state)) await save()
    if (currentRef.current) put(currentRef.current)
    currentRef.current = null; setCurrent(null); setStage("list")
    refreshList()
  }
  async function backToList() {
    await closeDocument()
    leaveDeskQuery({ doc: null, view: null, post: null })
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
      setStage("list"); setDeskQuery({ doc: null, view: null })
      setNotice(kind === "delete" ? "Deleted." : kind === "unpublish" ? "Unpublished. The post is now a draft." : "Changes discarded.")
      if (result?.cache_invalidated === false) setNotice("Done. Public pages may take a moment to refresh.")
      refreshList()
    })
    return done
  }
  function warm(d: NewsletterDraft) { studioWarm(d); void loadEditor() }
  // Each open document has its own address, so a post and a newsletter are
  // never confused and Back returns to the list.
  function open(d: NewsletterDraft, history: "push" | "replace" | "none" = "push") {
    if (history !== "none") setDeskQuery({ doc: d.id, view: null, post: null }, history)
    accept(d); text.current = { subject: d.subject, markdown: d.markdown, summary: d.description ?? "" }; setSubject(d.subject); setMarkdown(d.markdown); setSummary(d.description ?? "")
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
    setDeskQuery({ doc: null, view: null })
    currentRef.current = null; setCurrent(null); setDrafts([]); setSubject(""); setMarkdown(""); setHTML(""); setMeta(null)
    setSession({ configured: true, authenticated: false, csrf: "", login: "" }); setStage("signin")
  }
  async function preview(record = true) {
    await save()
    setHTML(""); setMeta(null); setPreviewMode("post"); setStage("preview")
    if (record && currentRef.current) setDeskQuery({ doc: currentRef.current.id, view: "preview" }, "push")
    if (section === "newsletters") await previewEmail()
  }
  // Ghost's Preview: the real public layout in its own tab. The tab opens during
  // the click so browsers allow it, then loads once the latest text is saved.
  function openPreviewTab() {
    const draft = currentRef.current
    if (!draft) return
    const tab = window.open("", "_blank")
    void work(async () => {
      try {
        await save()
        if (tab) { tab.opener = null; tab.location.href = previewPath(draft.id) }
        else setNotice("Your browser blocked the preview tab. Allow pop-ups for this site, or open the preview link.")
      } catch (failure) { tab?.close(); throw failure }
    })
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
    // The summary confirmed at publication becomes the editor's summary.
    text.current.summary = published.description ?? ""; setSummary(published.description ?? "")
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
  // Delivery opens with the draft's saved choice, so returning never widens it.
  function openDelivery() {
    const saved = currentRef.current?.recipients ?? null
    setLater(false); setAudience(saved ? "selected" : "all"); setPicked(saved ?? []); setPickerQuery("")
    setStage("delivery")
    if (saved) loadSubscribers()
  }
  function loadSubscribers() {
    if (subscribers) return
    studioContacts().then((result) => { if (mounted.current) setSubscribers(result.contacts.filter((contact) => contact.status === "subscribed")) }).catch(fail)
  }
  async function confirmDelivery() {
    if (later) nairobiSchedule(schedule)
    const draft = currentRef.current!
    const wanted = audience === "all" ? null : picked
    const saved = draft.recipients ?? null
    if (JSON.stringify(saved) !== JSON.stringify(wanted ? [...wanted].sort() : null)) accept(await studioRecipients(session!.csrf, draft, wanted))
    setMeta(await studioMeta()); setStage("confirm")
  }
  async function action(kind: "test" | "send" | "schedule" | "cancel" | "refresh") {
    if (!currentRef.current || !session?.csrf) return
    const result = await studioAction(session.csrf, currentRef.current, kind, kind === "schedule" ? nairobiSchedule(schedule) : undefined)
    accept(result)
    text.current = { subject: result.subject, markdown: result.markdown, summary: result.description ?? "" }; setSubject(result.subject); setMarkdown(result.markdown); setSummary(result.description ?? "")
    // A successful test is shown on the preview itself, beside the email.
    if (!(kind === "test" && result.state === "draft" && result.tested_revision === result.revision)) { setStage("outcome"); if (result.last_error) setError(result.last_error) }
  }
  const openRef = useRef(open); openRef.current = open
  const previewRef = useRef(preview); previewRef.current = preview
  const closeRef = useRef(closeDocument); closeRef.current = closeDocument
  const title = { loading: section === "posts" ? "Posts" : "Newsletters", signin: "Sign in", list: section === "posts" ? "Posts" : "Newsletters", pick: "New newsletter", write: subject || "Untitled post", preview: section === "posts" ? "Post preview" : "Newsletter preview", delivery: "Email delivery", confirm: "Review delivery", outcome: current ? newsletterStateLabel(current.state) : "Post", "publish-url":"Choose a post URL", "publish-summary":"Add a summary", "publish-review":"Review publication", published:"Post published" }[stage]
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(value)) + " EAT"
  const statusOf = (d: NewsletterDraft) => section === "newsletters" ? newsletterStateLabel(d.state) : !d.published_revision ? "Draft" : d.published_revision < d.revision ? "Unpublished changes" : "Published"
  const publishedDates = new Map(publishedPosts.map((post) => [post.slug, post.date]))
  // A published article is dated by its publication, everything else by its last edit.
  const dateOf = (d: NewsletterDraft) => d.published_revision && d.published_revision === d.revision && d.slug ? publishedDates.get(d.slug) ?? d.updated_at : d.updated_at
  const sort = readSort(query, SORT_KEYS, "date", sortDefault)
  const search = query.get("q") ?? ""
  const needle = search.trim().toLowerCase()
  const order = (a: NewsletterDraft, b: NewsletterDraft) => sort.key === "title" ? compareText(a.subject, b.subject) : sort.key === "status" ? compareText(statusOf(a), statusOf(b)) || Date.parse(dateOf(b)) - Date.parse(dateOf(a)) : Date.parse(dateOf(a)) - Date.parse(dateOf(b))
  const rows = drafts.filter((d) => !needle || d.subject.toLowerCase().includes(needle)).sort((a, b) => sort.dir === "asc" ? order(a, b) : order(b, a))
  const page = readPage(query)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  const firstRow = currentPage * PAGE_SIZE
  const visibleRows = rows.slice(firstRow, firstRow + PAGE_SIZE)
  const listing = stage === "list" || stage === "loading"
  function turnPage(next: number) { setDeskQuery({ page: next > 0 ? String(next + 1) : null }); if (tableScroll.current) tableScroll.current.scrollTop = 0 }
  const reach = audience === "all" ? meta?.subscribers ?? 0 : picked.length
  const shortDate = (value: string) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeZone: value.length === 10 ? "UTC" : "Africa/Nairobi" }).format(new Date(value))
  const scheduleLabel = (value: string) => { try { return formatDate(new Date(`${value}:00+03:00`).toISOString()) } catch { return value } }
  const pickedPost = publishedPosts.find((post) => post.slug === selectedPost)

  return (
    <AdminShell section={section} title={title} session={session} loading={stage === "loading"} busy={busy} editing={stage === "write" || listing} compactTitle={!listing && stage !== "signin"} onNavigate={navigate} onLogout={() => void work(logout)} actions={<>
      {stage === "write" && section === "posts" ? <><Button size="sm" variant="outline" disabled={busy || !current} onClick={openPreviewTab}><ExternalLink /><span className="max-sm:sr-only">Preview</span><span className="sr-only"> (opens in a new tab)</span></Button><Button size="sm" disabled={busy || !subject.trim() || !markdown.trim() || new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT} onClick={() => void work(preparePublish)}>{current?.published_revision ? "Update" : "Publish"}</Button></> : null}
      {stage === "write" && section === "newsletters" ? <Button size="sm" disabled={busy || !subject.trim() || !markdown.trim() || new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT} onClick={() => void work(preview)}>Preview</Button> : null}
      {stage === "preview" ? <><Button size="sm" variant="ghost" disabled={busy} onClick={() => { setStage("write"); leaveDeskQuery({ view: null }) }}>Write</Button>{section === "posts" ? <Button size="sm" disabled={busy} onClick={() => void work(preparePublish)}>{current?.published_revision ? "Update post" : "Publish"}</Button> : meta ? <><Button size="sm" variant="secondary" disabled={busy || !meta.test_email} onClick={() => void work(() => action("test"))}><Send />Send test</Button><Button size="sm" disabled={busy} onClick={openDelivery}>Continue</Button></> : null}</> : null}
      {!["loading","signin","list"].includes(stage) ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" disabled={busy} aria-label="Save and close" onClick={() => void work(backToList)} />}><X /></TooltipTrigger><TooltipContent>Save and close</TooltipContent></Tooltip> : null}
      {stage === "list" ? <>{error ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void work(backToList)}>Reload</Button> : null}<Button size="sm" disabled={busy} onClick={() => void work(section === "posts" ? newPost : newNewsletter)}><Plus />{section === "posts" ? "New post" : "New newsletter"}</Button></> : null}
      {["write", "preview", "published"].includes(stage) && current ? <DocumentActions document={current} busy={busy} onNewsletter={() => void navigate(`/admin/newsletters?post=${encodeURIComponent(current.slug!)}`)} onRemove={(kind) => remove(current, kind)} /> : null}
    </>}>
      <article className={stage === "write" || listing ? "flex h-full min-h-0 min-w-0 flex-col gap-4" : "flex min-w-0 flex-col gap-6 pb-8"} aria-busy={busy}>
      <h1 className="sr-only" ref={heading} tabIndex={-1}>{title}</h1>
      {error ? <p role="alert" className="text-body text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="text-body">{notice}</p> : null}
      {stage === "loading" ? <section role="status" aria-label={section === "posts" ? "Loading posts" : "Loading newsletters"} className="admin-table-frame">
        <div className="min-h-0 flex-1 overflow-hidden px-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((row) => <div key={row} className="flex items-center gap-4 py-4"><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-16" /><Skeleton className="hidden h-4 w-24 sm:block" /></div>)}</div>
      </section> : null}
      {stage === "signin" ? <div className="flex flex-col gap-4">
        <p className="text-body">{session?.configured === false ? "This writing desk hasn’t been enabled yet." : "Sign in to work on your posts."}</p>
        {session?.configured !== false ? <Button className="w-fit" nativeButton={false} render={<a href={studioLoginURL} />}>Continue with GitHub</Button> : null}
        {error && !session ? <Button className="w-fit" variant="outline" onClick={()=>{setError("");setStage("loading");setBootAttempt((attempt)=>attempt+1)}}>Retry loading</Button> : null}
      </div> : null}
      {stage === "list" ? <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="glass-surface flex w-full max-w-sm items-center gap-2 rounded-lg border border-input px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{section === "posts" ? "Search posts by title" : "Search newsletters by subject"}</span>
          <input type="search" className="chat-input h-8 min-w-0 flex-1 bg-transparent text-caption text-foreground outline-none" placeholder={section === "posts" ? "Search posts" : "Search newsletters"} value={search} onChange={(event) => setDeskQuery({ q: event.target.value, page: null })} />
        </label>
      </div> : null}
      {stage === "list" ? <div className="admin-table-frame">
        <div ref={tableScroll} className="admin-table-scroll" role="region" aria-label={section === "posts" ? "All posts" : "All newsletters"} tabIndex={0}><table className="admin-table"><thead><tr>{(["title", "status", "date"] as const).map((key) => <SortHeader key={key} label={{ title: "Title", status: "Status", date: "Date" }[key]} active={sort.key === key} dir={sort.dir} className={key === "date" ? "max-sm:hidden" : undefined} onSort={() => setDeskQuery(nextSort(sort, key, "date", sortDefault))} />)}<th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {visibleRows.map((row) => {
            const date = dateOf(row)
            return <tr key={row.id}>
              <td className="min-w-36 sm:min-w-48"><button type="button" disabled={busy} className="text-left font-medium hover:underline" onPointerEnter={() => warm(row)} onFocus={() => warm(row)} onClick={() => void work(async () => open(await studioOpen(row)))}>{row.subject}</button>{/* Phones drop the date column and keep the date with its title. */}<span className="block text-muted-foreground sm:hidden">{shortDate(date)}</span></td>
              <td><Badge variant="secondary">{statusOf(row)}</Badge></td>
              <td className="whitespace-nowrap max-sm:hidden"><time dateTime={date}>{date.length === 10 ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date)) : formatDate(date)}</time></td>
              <td className="text-right"><DocumentActions document={row} busy={busy} onOpen={() => void work(async () => open(await studioOpen(row)))} onNewsletter={() => void navigate(`/admin/newsletters?post=${encodeURIComponent(row.slug!)}`)} onRemove={(kind) => remove(row, kind)} /></td>
            </tr>
          })}
          {rows.length === 0 ? <tr><td colSpan={4}><div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">{section === "posts" ? <FileText className="size-6" /> : <Mail className="size-6" />}<p>{needle ? "Nothing matches that search" : section === "posts" ? "No posts yet" : "No newsletters yet"}</p></div></td></tr> : null}
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
        <div ref={writeArea} className="admin-write-layout"><div className="admin-write-grid">
        <div className="admin-editor-scroll" role="region" aria-label="Article editor" tabIndex={0}>
        <NewsletterEditor key={current?.id} value={markdown} subject={subject} description={section === "posts" ? summary : undefined} disabled={busy} onUpload={(file) => studioUpload(session!.csrf,file)} onChange={(value) => { text.current.markdown = value; setMarkdown(value); setSaved("unsaved") }} onDocumentChange={(document) => {
          text.current = { subject: document.subject, summary: document.description ?? "", markdown: document.markdown }
          setSubject(document.subject); setSummary(document.description ?? ""); setMarkdown(document.markdown); setSaved("unsaved")
        }}>
        <div className="flex flex-col gap-2">
          <label htmlFor="post-title" className="sr-only">Post title</label>
          <textarea ref={attachSubjectInput} id="post-title" rows={2} className="studio-title w-full resize-none bg-transparent pl-8 font-bold text-foreground outline-none" value={subject} required maxLength={STUDIO_SUBJECT_LIMIT} disabled={busy} placeholder="Untitled post" onChange={(event) => { const value = event.target.value.replace(/[\r\n]+/g, " "); text.current.subject = value; setSubject(value); setSaved("unsaved") }} />
          {/* The summary readers see under the title, as Medium and Ghost place a subtitle. */}
          {section === "posts" ? <><label htmlFor="post-summary-line" className="sr-only">Summary</label>
          <textarea id="post-summary-line" rows={1} className="w-full resize-none bg-transparent pl-8 text-title text-muted-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground/70" placeholder="Add a summary readers see under the title" maxLength={STUDIO_SUMMARY_LIMIT} disabled={busy} value={summary} onChange={(event) => { const value = event.target.value.replace(/[\r\n]+/g, " "); text.current.summary = value; setSummary(value); setSaved("unsaved") }} /></> : null}
        </div>
        </NewsletterEditor>
        </div>
        {roomy ? <LiveArticle subject={subject} markdown={markdown} description={summary} date={current?.slug ? publishedPosts.find((post) => post.slug === current.slug)?.date : undefined} /> : null}
        </div>
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
            <dt className="text-muted-foreground">To</dt><dd>{current?.recipients ? `${current.recipients.length} selected ${current.recipients.length === 1 ? "contact" : "contacts"}` : `All subscribers · ${meta.subscribers}`}</dd>
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
        <div className="flex gap-2"><Button type="submit" disabled={busy || (stage==="publish-summary" && !description.trim())}>{stage==="publish-url" ? "Next" : "Review"}</Button><Button type="button" variant="ghost" onClick={()=>setStage(stage==="publish-summary" && !current?.slug ? "publish-url" : "write")}>Back</Button></div>
      </form> : null}
      {stage === "publish-review" ? <div className="flex max-w-(--measure) flex-col gap-6">
        <p className="text-caption text-muted-foreground">3 of 3</p><h2 className="text-title font-semibold">{subject}</h2><p className="text-body">{description}</p><p className="break-all text-caption text-muted-foreground">{site.url}/blog/{slug}</p>
        <div className="flex gap-2"><Button disabled={busy} onClick={()=>void work(publish)}>{busy ? <LoaderCircle className="motion-safe:animate-spin"/> : null}{current?.published_revision ? "Confirm update" : "Publish post"}</Button><Button variant="ghost" disabled={busy} onClick={()=>setStage("publish-summary")}>Back</Button></div>
      </div> : null}
      {stage === "published" && current?.slug ? <div className="flex flex-col gap-4"><div className="flex items-center gap-2"><h2 className="text-title font-semibold">{current.subject}</h2>{current.cache_invalidated === false ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Public page refresh status"/>}><Info/></TooltipTrigger><TooltipContent>Published. Public pages will refresh through the cache; reload shortly if you see the previous version.</TooltipContent></Tooltip> : null}</div><div className="flex flex-wrap gap-2"><Button nativeButton={false} render={<a href={`/blog/${current.slug}`} target="_blank" rel="noreferrer"/>}><ExternalLink/>View post</Button><Button variant="outline" disabled={busy} onClick={()=>void navigate(`/admin/newsletters?post=${encodeURIComponent(current.slug!)}`)}><Mail/>Create newsletter</Button></div></div> : null}
      {stage === "delivery" && meta ? <form className="flex max-w-(--measure) flex-col gap-6" onSubmit={(event) => { event.preventDefault(); void work(confirmDelivery) }}>
        {/* Ghost's publish settings: recipients, then timing, then a one-line summary. */}
        <fieldset className="flex flex-col gap-3"><legend className="pb-3 text-body font-medium">Recipients</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Recipients"><Button type="button" variant={audience === "all" ? "secondary" : "ghost"} aria-pressed={audience === "all"} onClick={() => setAudience("all")}>All subscribers · {meta.subscribers}</Button><Button type="button" variant={audience === "selected" ? "secondary" : "ghost"} aria-pressed={audience === "selected"} onClick={() => { setAudience("selected"); loadSubscribers() }}>Selected contacts{audience === "selected" ? ` · ${picked.length}` : ""}</Button></div>
          {/* The picker opens under its own option, so the choice and its list stay together. */}
          {audience === "selected" ? <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className={surfaceClass}><label htmlFor="recipient-search" className="sr-only">Search subscribers</label><input id="recipient-search" type="search" className={inputClass} placeholder="Search by email" value={pickerQuery} disabled={!subscribers} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => setPickerQuery(event.target.value)} /></div>
            {subscribers ? <ul className="flex max-h-64 flex-col overflow-y-auto overscroll-contain" aria-label="Subscribers">
              {subscribers.filter((contact) => contact.email.includes(pickerQuery.trim().toLowerCase())).map((contact) => <li key={contact.email}><label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-caption hover:bg-muted"><input type="checkbox" className="size-4 accent-primary" checked={picked.includes(contact.email)} disabled={busy} onChange={(event) => setPicked((list) => event.target.checked ? [...list, contact.email] : list.filter((email) => email !== contact.email))} /><span className="min-w-0 break-all">{contact.email}</span></label></li>)}
              {subscribers.length === 0 ? <li className="px-2 py-2 text-caption text-muted-foreground">No confirmed subscribers yet.</li> : null}
            </ul> : <div role="status" aria-label="Loading subscribers" className="flex flex-col gap-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-2/3" /></div>}
          </div> : null}
          <p className="text-caption text-muted-foreground">Only confirmed subscribers receive it. Anyone who unsubscribes before sending is skipped.</p>
        </fieldset>
        <fieldset className="flex flex-col gap-3"><legend className="pb-3 text-body font-medium">When</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Delivery time"><Button type="button" variant={!later ? "secondary" : "ghost"} aria-pressed={!later} onClick={() => setLater(false)}>Right now</Button><Button type="button" variant={later ? "secondary" : "ghost"} aria-pressed={later} onClick={() => setLater(true)}>Schedule for later</Button></div>
          {later ? <><label htmlFor="newsletter-schedule" className="text-caption text-muted-foreground">Date and time in Nairobi (EAT)</label><div className={surfaceClass}><input id="newsletter-schedule" className={inputClass} type="datetime-local" required value={schedule} disabled={busy} onChange={(e) => setSchedule(e.target.value)} /></div></> : null}
        </fieldset>
        <p className="text-body">{reach < 1 ? (audience === "all" ? "There are no confirmed subscribers yet." : "Choose at least one contact.") : `Goes to ${reach} ${reach === 1 ? "subscriber" : "subscribers"} ${later ? (schedule ? `on ${scheduleLabel(schedule)}` : "at the time you choose") : "right now"}.`}</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || reach < 1} type="submit">Continue</Button><Button disabled={busy} variant="ghost" type="button" onClick={() => setStage("preview")}>Back</Button></div>
      </form> : null}
      {stage === "confirm" && meta ? <div className="flex max-w-(--measure) flex-col gap-4">
        <h2 className="text-title font-semibold">Ready to send?</h2>
        <p className="text-body">“{subject}” goes to {current?.recipients ? `${current.recipients.length} selected` : `all ${meta.subscribers}`} {(current?.recipients?.length ?? meta.subscribers) === 1 ? "subscriber" : "subscribers"} {later ? `on ${scheduleLabel(schedule)}` : "right now"}. Sent emails can’t be recalled.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || (current?.recipients?.length ?? meta.subscribers) < 1} onClick={() => void work(() => action(later ? "schedule" : "send"))}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <Send />}{later ? "Schedule email" : "Send email, right now"}</Button><Button disabled={busy} variant="ghost" onClick={() => setStage("delivery")}>Back</Button></div>
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
