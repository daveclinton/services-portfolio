"use client"

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import DragHandle from "@tiptap/extension-drag-handle-react"
import { Menu } from "@base-ui/react/menu"
import { Tabs } from "@base-ui/react/tabs"
import { Bold, Italic, Code, Link, ImagePlus, GripVertical, Undo2, Redo2, Unlink, Trash2, Info, FileCode, PenLine, Heading, Strikethrough, Quote, List, ListOrdered, ListChecks, MoreHorizontal, Eye, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toastManager } from "@/components/ui/toast"
import { newsletterEditorExtensions, newsletterRichTextIssue, formatMarkdown, newsletterImageMarkdown, newsletterDocumentMarkdown, parseNewsletterDocument, imageUploadPositions, mapMarkdownPosition, type MarkdownFormat, type NewsletterDocument } from "@/lib/newsletter-editor"
import { createWritingSlash } from "@/components/portfolio/newsletter-command-menu"
import { STUDIO_BODY_LIMIT, STUDIO_IMAGE_ACCEPT, studioImageURL, type StudioUploadOptions } from "@/lib/newsletter-studio"
import { DEFAULT_FRAME, FRAME_IDS, IMAGE_FRAMES, frameOf, withFrame, withoutFrame, type ImageFrame } from "@/lib/image-frames"
import { FramedImage } from "@/components/portfolio/framed-image"
import { PostMarkdown } from "@/components/portfolio/published-post-content"
import { focusElement } from "@/lib/scroll"

type Props = { value: string; disabled: boolean; onChange: (value: string) => void; onUpload?: (file: File, options?: StudioUploadOptions) => Promise<string>; onUploadingChange?: (pending: number) => void; modeSwitch?: ReactNode; children?: ReactNode }
type DocumentProps = Props & { subject: string; description?: string; onDocumentChange: (document: NewsletterDocument) => void }

// Novel's document canvas, slash commands, contextual formatting, and handles.
// https://github.com/steven-tey/novel/tree/main/apps/web/components/tailwind
export function NewsletterEditor({ value, subject, description, disabled, onChange, onDocumentChange, onUpload, children }: DocumentProps) {
  const [mode, setMode] = useState<"rich" | "markdown">(() => newsletterRichTextIssue(value) ? "markdown" : "rich")
  const [source, setSource] = useState(() => newsletterDocumentMarkdown({ subject, description, markdown: value }))
  const [uploads, setUploads] = useState(0)
  const issue = newsletterRichTextIssue(value)
  const bytes = new TextEncoder().encode(value).length

  // The switch sits in the sticky formatting bar at the top, reachable at any
  // scroll position, rather than after the end of a long article.
  const modeSwitch = mode === "rich"
    ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Edit Markdown" disabled={disabled || uploads > 0} onClick={() => { setSource(newsletterDocumentMarkdown({ subject, description, markdown: value })); setMode("markdown") }} />}><FileCode /></TooltipTrigger><TooltipContent>Edit Markdown</TooltipContent></Tooltip>
    : <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Back to editor" disabled={disabled || uploads > 0 || !!issue} onClick={() => setMode("rich")} />}><PenLine /></TooltipTrigger><TooltipContent>Back to editor</TooltipContent></Tooltip>

  return <section className="writing-editor flex min-w-0 flex-col gap-4" aria-label="Post content">
    {mode === "rich" ? <RichTextEditor value={value} disabled={disabled} onChange={onChange} onUpload={onUpload} onUploadingChange={setUploads} modeSwitch={modeSwitch}>{children}</RichTextEditor> : <MarkdownEditor value={source} disabled={disabled} onChange={(next) => {
      setSource(next)
      onDocumentChange(parseNewsletterDocument(next, description !== undefined))
    }} onUpload={onUpload} onUploadingChange={setUploads} modeSwitch={modeSwitch} />}
    <p className="text-caption text-muted-foreground">{value.trim() ? value.trim().split(/\s+/).length : 0} words</p>
    {bytes > STUDIO_BODY_LIMIT ? <p role="alert" className="text-caption text-destructive">This draft is too long to save. Remove {bytes - STUDIO_BODY_LIMIT} bytes to continue.</p> : null}
  </section>
}

function useImageUploads(onUpload: Props["onUpload"], onUploadingChange: Props["onUploadingChange"]) {
  const active = useRef(new Map<string, AbortController>())
  useEffect(() => {
    const uploads = active.current
    return () => { uploads.forEach((controller, id) => { controller.abort(); toastManager.close(id) }); uploads.clear() }
  }, [])
  async function upload(file: File, insert: (address: string) => { children: string; onClick: () => void } | void) {
    if (!onUpload) return
    const id = toastManager.add({ title: "Uploading image", description: file.name, type: "loading", timeout: 0, data: { progress: null } })
    const controller = new AbortController()
    active.current.set(id, controller); onUploadingChange?.(active.current.size)
    try {
      const address = await onUpload(file, { signal: controller.signal, onProgress: (progress) => {
        if (active.current.has(id)) toastManager.update(id, { title: progress === 100 ? "Processing image" : "Uploading image", description: progress === null ? file.name : `${file.name} · ${progress}%`, data: { progress } })
      } })
      if (!active.current.has(id) || controller.signal.aborted) return
      const action = insert(address)
      toastManager.update(id, { title: "Image uploaded", description: file.name, type: "success", timeout: 5000, data: undefined, actionProps: action ?? undefined })
    } catch (failure) {
      if (active.current.has(id)) toastManager.update(id, { title: "Image upload failed", description: failure instanceof Error ? failure.message : "Please try uploading the image again.", type: "error", priority: "high", timeout: 0, data: undefined })
    } finally {
      if (active.current.delete(id)) onUploadingChange?.(active.current.size)
    }
  }
  return upload
}

// HackMD's whole-document source view, with the existing selection formatting,
// renderer, upload service, and theme.
// https://hackmd.io/features
// https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/about-writing-and-formatting-on-github
// https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts#comments
const markdownTools: { format: MarkdownFormat; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { format: "heading", label: "Heading", icon: Heading },
  { format: "bold", label: "Bold", icon: Bold },
  { format: "italic", label: "Italic", icon: Italic },
  { format: "strikethrough", label: "Strikethrough", icon: Strikethrough },
  { format: "quote", label: "Quote", icon: Quote },
  { format: "code", label: "Code", icon: Code },
  { format: "link", label: "Link", icon: Link },
  { format: "image", label: "Image", icon: ImagePlus },
  { format: "bulletList", label: "Bullet list", icon: List },
  { format: "orderedList", label: "Numbered list", icon: ListOrdered },
  { format: "taskList", label: "Task list", icon: ListChecks },
]

// Tiptap's compact toolbar approach: keep primary controls visible and move
// secondary actions into the app's existing menu on narrow editor panes.
// https://tiptap.dev/docs/ui-components/templates/simple-editor
function WritingMore({ children }: { children: ReactNode }) {
  return <Menu.Root>
    <Tooltip><TooltipTrigger render={<Menu.Trigger className="writing-toolbar-more" render={<Button variant="ghost" size="icon" aria-label="More formatting tools" />} />}><MoreHorizontal /></TooltipTrigger><TooltipContent>More formatting tools</TooltipContent></Tooltip>
    <Menu.Portal><Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-50"><Menu.Popup className="writing-block-menu" finalFocus={false}>{children}</Menu.Popup></Menu.Positioner></Menu.Portal>
  </Menu.Root>
}

function MarkdownEditor({ value, disabled, onChange, onUpload, onUploadingChange, modeSwitch }: Props) {
  const id = useId()
  const input = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const selection = useRef<{ selectionStart: number; selectionEnd: number } | null>(null)
  const uploadVersion = useRef(0)
  const positions = useRef(new Map<number, number>())
  const latest = useRef(value)
  const [tab, setTab] = useState("write")
  const locked = disabled
  const uploadImage = useImageUploads(onUpload, onUploadingChange)
  const issue = newsletterRichTextIssue(value)
  function change(next: string) {
    positions.current.forEach((position, id) => positions.current.set(id, mapMarkdownPosition(latest.current, next, position)))
    latest.current = next
    onChange(next)
  }
  useLayoutEffect(() => {
    if (selection.current && input.current) {
      input.current.setSelectionRange(selection.current.selectionStart, selection.current.selectionEnd)
      selection.current = null
    }
  }, [value])

  function replace(edit: ReturnType<typeof formatMarkdown>, focus = true) {
    const field = input.current
    if (!field) return
    const focused = focus || document.activeElement === field
    if (focus) field.focus({ preventScroll: true })
    if (focused) field.setSelectionRange(edit.start, edit.end)
    // GitHub uses native insertText to keep toolbar actions in the same undo
    // history as typing. setRangeText covers engines without that command.
    if (!focused || !document.execCommand?.("insertText", false, edit.text)) field.setRangeText(edit.text, edit.start, edit.end, "preserve")
    selection.current = edit
    change(field.value)
    field.setSelectionRange(edit.selectionStart, edit.selectionEnd)
  }
  function format(kind: MarkdownFormat) {
    const field = input.current
    if (!field || locked || tab !== "write") return
    if (kind === "image" && onUpload) { fileInput.current?.click(); return }
    replace(formatMarkdown(field.value, field.selectionStart, field.selectionEnd, kind))
  }
  async function upload(file: File) {
    const field = input.current
    if (!field || !onUpload || locked || tab !== "write") return
    const id = ++uploadVersion.current
    positions.current.set(id, field.selectionStart)
    try { await uploadImage(file, (address) => {
      const start = positions.current.get(id)
      if (start === undefined || !input.current) throw new Error("Reopen the draft before inserting this image.")
      const framed = withFrame(address, DEFAULT_FRAME), text = newsletterImageMarkdown(framed)
      const before = latest.current, next = before.slice(0, start) + text + before.slice(start)
      const selectionStart = mapMarkdownPosition(before, next, input.current.selectionStart), selectionEnd = mapMarkdownPosition(before, next, input.current.selectionEnd)
      replace({ start, end: start, text, selectionStart, selectionEnd }, false)
      return { children: "Add alt text", onClick: () => {
        const source = input.current?.value ?? "", end = source.indexOf(`](<${framed}>)`), begin = source.lastIndexOf("![", end)
        if (!input.current || end < 0 || begin < 0) return
        input.current.focus({ preventScroll: true }); input.current.setSelectionRange(begin + 2, end)
      } }
    }) } finally { positions.current.delete(id) }
  }

  return <Tabs.Root value={tab} onValueChange={setTab} className="min-w-0" onKeyDown={(event) => {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault(); setTab(tab === "write" ? "preview" : "write")
    }
  }}>
    <TooltipProvider delay={300}>
      <div className="writing-toolbar writing-toolbar-markdown" data-native-scroll role="group" aria-label="Markdown formatting">
        <Tabs.List aria-label="Markdown view" className="flex shrink-0 items-center gap-1">
          <Tooltip><TooltipTrigger render={<Tabs.Tab value="write" aria-label="Write" render={<Button variant="ghost" size="icon" />} />}><FileCode /></TooltipTrigger><TooltipContent>Write</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger render={<Tabs.Tab value="preview" aria-label="Preview" render={<Button variant="ghost" size="icon" />} />}><Eye /></TooltipTrigger><TooltipContent>Preview</TooltipContent></Tooltip>
        </Tabs.List>
        {markdownTools.map(({ format: kind, label, icon: Icon }) => <Tooltip key={kind}>
          <TooltipTrigger render={<Button size="icon" variant="ghost" className={["bold", "italic", "link"].includes(kind) ? undefined : "writing-toolbar-secondary"} aria-label={kind === "image" && onUpload ? "Upload image" : label} disabled={locked || tab !== "write"} onMouseDown={(event) => event.preventDefault()} onClick={() => format(kind)} />}><Icon /></TooltipTrigger>
          <TooltipContent>{kind === "image" && onUpload ? "Upload image" : label}</TooltipContent>
        </Tooltip>)}
        <WritingMore>{markdownTools.filter(({ format }) => !["bold", "italic", "link"].includes(format)).map(({ format: kind, label, icon: Icon }) => <Menu.Item key={kind} className="admin-menu-item" disabled={locked || tab !== "write"} onClick={() => format(kind)}><Icon className="size-4" />{kind === "image" && onUpload ? "Upload image" : label}</Menu.Item>)}</WritingMore>
        <div className="ml-auto shrink-0">{modeSwitch}</div>
      </div>
    </TooltipProvider>
    <input ref={fileInput} type="file" accept={STUDIO_IMAGE_ACCEPT} className="hidden" aria-label="Choose image file" disabled={locked} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file) }} />
    {issue ? <p role="status" className="py-2 text-caption text-muted-foreground">{issue}</p> : null}
      <Tabs.Panel value="write" keepMounted className="pt-4">
        <label htmlFor={`${id}-markdown`} className="sr-only">Post Markdown</label>
        <textarea ref={input} id={`${id}-markdown`} data-native-scroll rows={14} spellCheck className="min-h-96 w-full resize-none bg-transparent font-mono text-body leading-7 outline-none [field-sizing:content]" placeholder="Write your post using Markdown…" value={value} disabled={disabled} onChange={(event) => change(event.target.value)} onKeyDown={(event) => {
          if (!(event.metaKey || event.ctrlKey) || event.altKey) return
          const key = event.key.toLowerCase()
          const kind = event.shiftKey ? event.code === "Digit7" ? "orderedList" : event.code === "Digit8" ? "bulletList" : event.code === "Period" ? "quote" : null : ({ b: "bold", i: "italic", e: "code", k: "link" } as const)[key as "b" | "i" | "e" | "k"]
          if (kind) { event.preventDefault(); format(kind) }
        }} onPaste={(event) => {
          const file = Array.from(event.clipboardData.files)[0]
          if (file && onUpload) { event.preventDefault(); void upload(file); return }
          const field = event.currentTarget, address = event.clipboardData.getData("text/plain").trim()
          if (field.selectionStart !== field.selectionEnd && /^https?:\/\/\S+$/.test(address) && !locked) {
            event.preventDefault()
            const start = field.selectionStart, end = field.selectionEnd
            const text = `[${field.value.slice(start, end)}](<${address.replace(/[<>]/g, encodeURIComponent)}>)`
            replace({ start, end, text, selectionStart: start, selectionEnd: start + text.length })
          }
        }} onDragOver={(event) => { if (onUpload && event.dataTransfer.types.includes("Files")) event.preventDefault() }} onDrop={(event) => {
          if (onUpload && event.dataTransfer.files.length) { event.preventDefault(); void upload(event.dataTransfer.files[0]) }
        }} />
      </Tabs.Panel>
      <Tabs.Panel value="preview" className="min-h-96 pt-4">
        {value.trim() ? <div className="blog-prose"><PostMarkdown markdown={value} /></div> : <p className="text-body text-muted-foreground">Nothing to preview</p>}
      </Tabs.Panel>
  </Tabs.Root>
}

function RichTextEditor({ value, disabled, onChange, onUpload, onUploadingChange, modeSwitch, children }: Props) {
  const id = useId()
  const [initial] = useState(value)
  const emitted = useRef(value)
  const dialog = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const imageTrigger = useRef<HTMLButtonElement>(null)
  const imageAction = useRef<(() => void) | null>(null)
  const linkAction = useRef<(() => void) | null>(null)
  const uploadAction = useRef<((file: File) => void) | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadVersion = useRef(0)
  const uploadImage = useImageUploads(onUpload, onUploadingChange)
  const extensions = useMemo(() => [...newsletterEditorExtensions, createWritingSlash(() => imageAction.current?.())], [])
  const [blockPosition, setBlockPosition] = useState(-1)
  const [insert, setInsert] = useState<"link" | "image" | null>(null)
  const [url, setURL] = useState("")
  const [alt, setAlt] = useState("")
  const [step, setStep] = useState<"url" | "frame" | "alt" | "review">("url")
  const [altOnly, setAltOnly] = useState(false)
  const [frame, setFrame] = useState<ImageFrame>(DEFAULT_FRAME)
  const [error, setError] = useState("")
  // https://tiptap.dev/docs/editor/getting-started/install/nextjs
  const editor = useEditor({
    extensions,
    content: initial,
    contentType: "markdown",
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: !disabled,
    editorProps: {
      attributes: { class: "newsletter-editor blog-prose min-h-96 pb-6 outline-none", role: "textbox", "aria-label": "Post body", "aria-multiline": "true", "data-native-scroll": "" },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); linkAction.current?.(); return true }
        return false
      },
      handlePaste: (_view, event) => {
        if (!Array.from(event.clipboardData?.items ?? []).some((item) => item.kind === "file")) return false
        const file = Array.from(event.clipboardData?.items ?? []).find((item) => item.kind === "file")?.getAsFile()
        if (file) uploadAction.current?.(file)
        return true
      },
      handleDrop: (_view, event) => {
        if (!event.dataTransfer?.files.length) return false
        uploadAction.current?.(event.dataTransfer.files[0])
        return true
      },
    },
    onUpdate: ({ editor }) => {
      const next = editor.getMarkdown()
      emitted.current = next
      onChange(next)
    },
  })
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive("bold"), italic: editor.isActive("italic"), code: editor.isActive("code"),
    bulletList: editor.isActive("bulletList"), orderedList: editor.isActive("orderedList"),
    blockquote: editor.isActive("blockquote"), codeBlock: editor.isActive("codeBlock"),
    link: editor.isActive("link"), image: editor.isActive("image"),
    heading: editor.isActive("heading") ? String(editor.getAttributes("heading").level) : "paragraph",
    undo: editor.can().undo(), redo: editor.can().redo(),
  } : null })

  useEffect(() => { editor?.setEditable(!disabled, false) }, [editor, disabled])
  useEffect(() => {
    if (!editor || value === emitted.current) return
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false })
    emitted.current = value
  }, [editor, value])
  useEffect(() => {
    imageAction.current = chooseImage
    linkAction.current = () => openInsert("link", null)
    uploadAction.current = (file) => {
      if (disabled) return
      void upload(file)
    }
  })
  useEffect(() => {
    if (insert && !dialog.current?.open) dialog.current?.showModal()
  }, [insert])
  useEffect(() => {
    if (!insert) return
    focusElement(dialog.current?.querySelector<HTMLElement>(step === "review" ? "h2" : "input, textarea") ?? null)
  }, [step, insert])

  function openInsert(kind: "link" | "image", trigger: HTMLButtonElement | null, altTextOnly = false) {
    if (!editor) return
    returnFocus.current = trigger
    const current = String(editor.getAttributes(kind).href ?? editor.getAttributes(kind).src ?? "")
    // An image's frame is kept apart from its address while editing.
    setURL(kind === "image" ? withoutFrame(current) : current)
    setFrame(kind === "image" && current ? frameOf(current) : DEFAULT_FRAME)
    setAlt(String(editor.getAttributes(kind).alt ?? ""))
    setAltOnly(altTextOnly); setStep(altTextOnly ? "alt" : "url"); setError(""); setInsert(kind)
  }
  function chooseImage() {
    if (!editor || !onUpload || disabled) return
    fileInput.current?.click()
  }
  async function upload(file: File) {
    if (!editor || !onUpload || disabled) return
    const uploadId = `${id}-${++uploadVersion.current}`
    editor.view.dispatch(editor.state.tr.setMeta(imageUploadPositions, { id: uploadId, bookmark: editor.state.selection.getBookmark() }))
    try { await uploadImage(file, (address) => {
      if (editor.isDestroyed) throw new Error("Reopen the draft before inserting this image.")
      const bookmark = imageUploadPositions.getState(editor.state)?.get(uploadId)
      if (!bookmark) throw new Error("The image insertion point is no longer available. Please try again.")
      const position = bookmark.resolve(editor.state.doc), src = withFrame(address, DEFAULT_FRAME)
      if (!editor.commands.insertContentAt({ from: position.from, to: position.to }, { type: "image", attrs: { src, alt: "" } }, { updateSelection: false })) throw new Error("The image could not be inserted. Please try again.")
      return { children: "Add alt text", onClick: () => {
        if (editor.isDestroyed) return
        editor.state.doc.descendants((node, pos) => { if (node.type.name === "image" && withoutFrame(node.attrs.src) === withoutFrame(address)) { editor.commands.setNodeSelection(pos); openInsert("image", imageTrigger.current, true); return false } })
      } }
    }) } finally { if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(imageUploadPositions, { id: uploadId })) }
  }
  function validateURL(): string | null {
    try {
      const parsed = new URL(insert === "image" ? withoutFrame(url.trim()) : url.trim())
      if (parsed.username || parsed.password || (insert === "image" ? !studioImageURL(parsed.href) : !["https:","http:","mailto:"].includes(parsed.protocol))) throw new Error()
      setURL(parsed.href)
      setError("")
      return parsed.href
    } catch { setError(insert === "image" ? "Enter a complete HTTPS image address." : "Enter a complete web address or mailto: link."); return null }
  }
  function applyInsert() {
    if (!editor || disabled) return
    const address = validateURL()
    if (!address) return
    if (insert === "image") {
      const framed = withFrame(address, frame)
      if (editor.isActive("image")) editor.chain().focus().updateAttributes("image", { src: framed, alt: alt.trim() }).run()
      else editor.chain().focus().setImage({ src: framed, alt: alt.trim() }).run()
    } else if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: address, marks: [{ type: "link", attrs: { href: address } }] }).run()
    } else editor.chain().focus().extendMarkRange("link").setLink({ href: address }).run()
    dialog.current?.close()
    toastManager.add({ title: altOnly ? "Alt text saved" : insert === "image" ? "Image updated" : "Link saved", type: "success" })
  }

  const controls: { label: string; icon: ComponentType<{ className?: string }>; active?: boolean; enabled?: boolean; run: () => void }[] = [
    { label: "Bold", icon: Bold, active: state?.bold, run: () => { editor?.chain().focus().toggleBold().run() } },
    { label: "Italic", icon: Italic, active: state?.italic, run: () => { editor?.chain().focus().toggleItalic().run() } },
    { label: "Inline code", icon: Code, active: state?.code, run: () => { editor?.chain().focus().toggleCode().run() } },
    { label: "Undo", icon: Undo2, enabled: state?.undo, run: () => { editor?.chain().focus().undo().run() } },
    { label: "Redo", icon: Redo2, enabled: state?.redo, run: () => { editor?.chain().focus().redo().run() } },
  ]

  function formatButtons(bubble = false) {
    return controls.filter((control) => !bubble || !["Undo", "Redo"].includes(control.label)).map(({ label, icon: Icon, active, enabled, run }) => <Tooltip key={label}>
      <TooltipTrigger render={<Button size="icon" variant="ghost" className={bubble ? active ? "text-primary" : undefined : ["Undo", "Redo"].includes(label) ? "writing-toolbar-secondary" : undefined} aria-label={label} aria-pressed={active} disabled={!editor || disabled || enabled === false} onMouseDown={(event) => event.preventDefault()} onClick={run} />}><Icon /></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>)
  }

  return <div className="relative min-w-0">
    <TooltipProvider delay={300}>
      <div className="writing-toolbar writing-toolbar-rich" data-native-scroll role="group" aria-label="Text formatting">
        <label htmlFor={`${id}-style`} className="sr-only">Text style</label>
        <SelectField id={`${id}-style`} ariaLabel="Text style" variant="ghost" icon={state?.heading && state.heading !== "paragraph" ? <Heading /> : <Type />} disabled={!editor || disabled} value={state?.heading ?? "paragraph"} onValueChange={(value) => {
          if (value === "paragraph") editor?.chain().focus().setParagraph().run()
          else if (value) editor?.chain().focus().setHeading({ level: Number(value) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        }} options={[{ value: "paragraph", label: "Paragraph" }, ...[1, 2, 3, 4, 5, 6].map((level) => ({ value: String(level), label: `Heading ${level}` }))]} />
        {formatButtons()}
        <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Link" aria-pressed={state?.link} disabled={!editor || disabled} onClick={(event) => openInsert("link", event.currentTarget)} />}><Link /></TooltipTrigger><TooltipContent>Link</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger render={<Button ref={imageTrigger} variant="ghost" size="icon" className="writing-toolbar-secondary" aria-label="Upload image" disabled={!editor || !onUpload || disabled} onMouseDown={(event)=>event.preventDefault()} onClick={chooseImage} />}><ImagePlus /></TooltipTrigger><TooltipContent>Upload image</TooltipContent></Tooltip>
        {state?.link ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className="writing-toolbar-secondary" aria-label="Remove link" disabled={disabled} onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()} />}><Unlink /></TooltipTrigger><TooltipContent>Remove link</TooltipContent></Tooltip> : null}
        <WritingMore>
          {controls.filter(({ label }) => ["Undo", "Redo"].includes(label)).map(({ label, icon: Icon, enabled, run }) => <Menu.Item key={label} className="admin-menu-item" disabled={!editor || disabled || enabled === false} onClick={run}><Icon className="size-4" />{label}</Menu.Item>)}
          <Menu.Item className="admin-menu-item" disabled={!editor || !onUpload || disabled} onClick={chooseImage}><ImagePlus className="size-4" />Upload image</Menu.Item>
          {state?.link ? <Menu.Item className="admin-menu-item" disabled={disabled} onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}><Unlink className="size-4" />Remove link</Menu.Item> : null}
        </WritingMore>
        <div className="ml-auto shrink-0">{modeSwitch}</div>
        <Tooltip><TooltipTrigger render={<Button variant="ghost" className="writing-toolbar-secondary" size="icon" aria-label="Editor help" />}><Info /></TooltipTrigger><TooltipContent>Type / to insert blocks. Select text to format it. Drag the handle to reorder.</TooltipContent></Tooltip>
      </div>
      {editor ? <>
        <BubbleMenu editor={editor} pluginKey="writing-format-menu" className="writing-floating-toolbar" options={{ placement: "top" }} shouldShow={({ editor, state, view }) => editor.isEditable && (view.hasFocus() || !!document.activeElement?.closest(".writing-floating-toolbar")) && !state.selection.empty && !editor.isActive("image")}>
          {formatButtons(true)}
          <Button size="sm" variant="ghost" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={(event) => openInsert("link", event.currentTarget)}><Link />Link</Button>
        </BubbleMenu>
        <BubbleMenu editor={editor} pluginKey="writing-image-menu" className="writing-floating-toolbar" shouldShow={({ editor, view }) => editor.isEditable && (view.hasFocus() || !!document.activeElement?.closest(".writing-floating-toolbar")) && editor.isActive("image")}>
          <Button size="sm" variant="ghost" onClick={() => openInsert("image", imageTrigger.current, true)}>Alt text</Button>
          <Button size="sm" variant="ghost" onClick={() => openInsert("image", imageTrigger.current)}>Edit image</Button>
          <Button size="sm" variant="ghost" onClick={() => { if (editor.chain().focus().deleteSelection().run()) toastManager.add({ title: "Image removed", type: "success" }) }}><Trash2 />Remove</Button>
        </BubbleMenu>
      </> : null}
    </TooltipProvider>
    <input ref={fileInput} type="file" accept={STUDIO_IMAGE_ACCEPT} className="hidden" aria-label="Choose image file" disabled={disabled} onChange={(event)=>{const file=event.target.files?.[0];event.target.value="";if(file)void upload(file)}} />
    {children}
    {!editor ? <div role="status" aria-label="Loading editor" className="flex min-h-96 flex-col gap-4 py-6"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div> : null}
    <EditorContent editor={editor} />
    {error && !insert ? <p role="alert" className="text-caption text-destructive">{error}</p> : null}
    {editor && !disabled ? <DragHandle editor={editor} className="writing-drag-handle" onNodeChange={({ pos }) => setBlockPosition(pos)}>
      <button type="button" className="flex size-8 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing" aria-label="Drag to move this block, or select it to cut and paste" onClick={() => { if (blockPosition >= 0) editor.commands.setNodeSelection(blockPosition) }}><GripVertical className="size-4" /></button>
    </DragHandle> : null}
    <dialog ref={dialog} aria-labelledby={`${id}-insert-title`} className="fixed inset-0 m-auto max-h-full w-full max-w-(--measure) overflow-y-auto rounded-lg border border-border bg-background p-4 text-foreground backdrop:bg-background/85 sm:p-6" onClose={() => { setInsert(null); focusElement(returnFocus.current) }}>
      {insert ? <form className="flex flex-col gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (insert === "link" || step === "review" || altOnly) applyInsert()
        else if (step === "url" && validateURL()) setStep("frame")
        else if (step === "frame") setStep("alt")
        else if (step === "alt") setStep("review")
      }}>
        <p className="text-caption text-muted-foreground">{altOnly ? "Alt text" : insert === "image" ? `${{ url: 1, frame: 2, alt: 3, review: 4 }[step]} of 4 · Image` : "Link"}</p>
        <h2 id={`${id}-insert-title`} tabIndex={-1} className="text-title">{insert === "link" ? "Where should this link go?" : step === "url" ? "Add an image" : step === "frame" ? "How should it be framed?" : step === "alt" ? "Describe the image" : "Review your image"}</h2>
        {step === "url" ? <>
          <label htmlFor={`${id}-url`} className="text-body">{insert === "image" ? "HTTPS image address" : "Link address"}</label>
          <input id={`${id}-url`} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="chat-input min-h-8 w-full min-w-0 rounded-lg border border-input bg-background p-2.5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/20" required value={url} onChange={(event) => { setURL(event.target.value); setError("") }} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
        </> : step === "frame" ? <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Frame</legend>
          {/* Every article image uses one of these frames (docs/article-images.md). */}
          {FRAME_IDS.map((id) => { const option = IMAGE_FRAMES[id]; return <label key={id} className="flex cursor-pointer items-center gap-4 rounded-lg p-3 hover:bg-muted has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
            <input type="radio" name="image-frame" value={id} checked={frame === id} onChange={() => setFrame(id)} className="sr-only" />
            <span aria-hidden="true" className="flex w-14 shrink-0 justify-center"><span className="block rounded-sm border-2 border-current" style={{ width: `${Math.round(56 * option.share)}px`, aspectRatio: `${option.ratio[0]} / ${option.ratio[1]}` }} /></span>
            <span className="flex flex-col"><span className="text-body font-medium">{option.label} · {option.ratio.join(":")}</span><span className="text-caption text-muted-foreground">{option.use}{option.share < 1 ? `, shown at ${Math.round(option.share * 100)}% width` : ""}</span></span>
          </label> })}
        </fieldset> : step === "alt" ? <>
          <label htmlFor={`${id}-alt`} className="text-body">What does the image show?</label>
          <textarea id={`${id}-alt`} rows={3} className="chat-input w-full rounded-lg border border-input bg-background p-2.5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/20" value={alt} onChange={(event) => setAlt(event.target.value)} />
          <Tooltip><TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Image description help" />}><Info /></TooltipTrigger><TooltipContent>Describe the image for readers who cannot see it. Leave this empty for a decorative image.</TooltipContent></Tooltip>
        </> : <>
          {/* Shown exactly as articles show it, in its frame. */}
          <FramedImage src={withFrame(url, frame)} alt={alt} onLoad={() => setError("")} onError={() => setError("This image could not be loaded. Go Back to check its address.")} />
          <dl className="flex min-w-0 flex-col gap-2 text-body"><dt className="text-caption text-muted-foreground">Frame</dt><dd>{IMAGE_FRAMES[frame].label} · {IMAGE_FRAMES[frame].ratio.join(":")}</dd><dt className="text-caption text-muted-foreground">Image address</dt><dd className="break-all">{url}</dd><dt className="text-caption text-muted-foreground">Description</dt><dd>{alt.trim() || "Decorative image"}</dd></dl>
        </>}
        {error ? <p id={`${id}-error`} role="alert" className="text-body text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={disabled || !url.trim() || (step === "review" && !!error)}>{altOnly ? "Save alt text" : insert === "link" ? "Apply link" : step === "review" ? "Insert image" : "Next"}</Button>
          {!altOnly && step !== "url" ? <Button type="button" variant="ghost" onClick={() => { setError(""); setStep(step === "review" ? "alt" : step === "alt" ? "frame" : "url") }}>Back</Button> : null}
          <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>Cancel</Button>
        </div>
      </form> : null}
    </dialog>
  </div>
}
