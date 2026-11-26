"use client"

import { useEffect, useId, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import DragHandle from "@tiptap/extension-drag-handle-react"
import { Popover } from "@base-ui/react/popover"
import { Bold, Italic, Code, Link, ImagePlus, Plus, GripVertical, Undo2, Redo2, Unlink, Trash2, Info, Upload, LoaderCircle, FileCode, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { applyWritingBlock, writingBlocks, newsletterEditorExtensions, newsletterRichTextIssue } from "@/lib/newsletter-editor"
import { createWritingSlash, WritingBlockLabel } from "@/components/portfolio/newsletter-command-menu"
import { STUDIO_BODY_LIMIT, studioImageURL } from "@/lib/newsletter-studio"
import { DEFAULT_FRAME, FRAME_IDS, IMAGE_FRAMES, frameOf, withFrame, withoutFrame, type ImageFrame } from "@/lib/image-frames"
import { FramedImage } from "@/components/portfolio/framed-image"
import { focusElement } from "@/lib/scroll"

type Props = { value: string; disabled: boolean; onChange: (value: string) => void; onUpload?: (file: File) => Promise<string>; modeSwitch?: ReactNode }

// Novel's document canvas, slash commands, contextual formatting, and handles.
// https://github.com/steven-tey/novel/tree/main/apps/web/components/tailwind
export function NewsletterEditor({ value, disabled, onChange, onUpload }: Props) {
  const [mode, setMode] = useState<"rich" | "markdown">(() => newsletterRichTextIssue(value) ? "markdown" : "rich")
  const issue = newsletterRichTextIssue(value)
  const bytes = new TextEncoder().encode(value).length

  // The switch sits in the sticky formatting bar at the top, reachable at any
  // scroll position, rather than after the end of a long article.
  const modeSwitch = mode === "rich"
    ? <Button variant="ghost" disabled={disabled} onClick={() => setMode("markdown")}><FileCode /><span className="max-sm:sr-only">Edit Markdown</span></Button>
    : <Button variant="ghost" disabled={disabled || !!issue} onClick={() => setMode("rich")}><PenLine /><span className="max-sm:sr-only">Back to editor</span></Button>

  return <section className="flex min-w-0 flex-col gap-4" aria-label="Post content">
    {mode === "rich" ? <RichTextEditor value={value} disabled={disabled} onChange={onChange} onUpload={onUpload} modeSwitch={modeSwitch} /> : <>
      <div className="glass-surface sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2.5" role="group" aria-label="Markdown">
        <p className="text-caption text-muted-foreground">Markdown</p>
        <div className="ml-auto">{modeSwitch}</div>
      </div>
      {issue ? <p role="status" className="text-caption text-muted-foreground">{issue}</p> : null}
      <label htmlFor="newsletter-markdown" className="sr-only">Post Markdown</label>
      {/* Grows with the text, so the page scrolls once instead of a box inside it. */}
      <textarea id="newsletter-markdown" rows={14} spellCheck className="min-h-96 w-full resize-none bg-transparent pl-8 font-mono text-body leading-7 outline-none [field-sizing:content]" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </>}
    <p className="text-caption text-muted-foreground">{value.trim() ? value.trim().split(/\s+/).length : 0} words</p>
    {bytes > STUDIO_BODY_LIMIT ? <p role="alert" className="text-caption text-destructive">This draft is too long to save. Remove {bytes - STUDIO_BODY_LIMIT} bytes to continue.</p> : null}
  </section>
}

function RichTextEditor({ value, disabled, onChange, onUpload, modeSwitch }: Props) {
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
  const [uploading, setUploading] = useState(false)
  const extensions = useMemo(() => [...newsletterEditorExtensions, createWritingSlash(() => imageAction.current?.())], [])
  const [blockPicker, setBlockPicker] = useState(false)
  const [blockPosition, setBlockPosition] = useState(-1)
  const [insert, setInsert] = useState<"link" | "image" | null>(null)
  const [url, setURL] = useState("")
  const [alt, setAlt] = useState("")
  const [step, setStep] = useState<"url" | "frame" | "alt" | "review">("url")
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
      attributes: { class: "newsletter-editor blog-prose min-h-96 pb-6 outline-none", role: "textbox", "aria-label": "Post body", "aria-multiline": "true" },
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

  useEffect(() => { editor?.setEditable(!disabled && !uploading, false) }, [editor, disabled, uploading])
  useEffect(() => () => { uploadVersion.current++ }, [])
  useEffect(() => {
    if (!editor || value === emitted.current) return
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false })
    emitted.current = value
  }, [editor, value])
  useEffect(() => {
    imageAction.current = () => openInsert("image", imageTrigger.current)
    linkAction.current = () => openInsert("link", null)
    uploadAction.current = (file) => {
      if (disabled || uploading) return
      openInsert("image", imageTrigger.current)
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

  function openInsert(kind: "link" | "image", trigger: HTMLButtonElement | null) {
    if (!editor) return
    returnFocus.current = trigger
    const current = String(editor.getAttributes(kind).href ?? editor.getAttributes(kind).src ?? "")
    // An image's frame is kept apart from its address while editing.
    setURL(kind === "image" ? withoutFrame(current) : current)
    setFrame(kind === "image" && current ? frameOf(current) : DEFAULT_FRAME)
    setAlt(String(editor.getAttributes(kind).alt ?? ""))
    setStep("url"); setError(""); setInsert(kind)
  }
  async function upload(file: File) {
    if (!onUpload || disabled || uploading) return
    const version=++uploadVersion.current
    setUploading(true);setError("");setURL("")
    try {
      const address=await onUpload(file)
      if(version===uploadVersion.current){setURL(withoutFrame(address));setAlt("");setStep("frame")}
    } catch(failure) { if(version===uploadVersion.current)setError(failure instanceof Error ? failure.message : "Upload failed. Please try again.") }
    finally {if(version===uploadVersion.current)setUploading(false)}
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
      <TooltipTrigger render={<Button size="icon" variant={active ? "default" : "ghost"} aria-label={label} aria-pressed={active} disabled={!editor || disabled || enabled === false} onMouseDown={(event) => event.preventDefault()} onClick={run} />}><Icon /></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>)
  }

  return <div className="relative min-w-0">
    <TooltipProvider delay={300}>
      <div className="glass-surface sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-lg py-2.5" role="group" aria-label="Text formatting">
        <label htmlFor={`${id}-style`} className="sr-only">Text style</label>
        <SelectField id={`${id}-style`} ariaLabel="Text style" variant="ghost" disabled={!editor || disabled} value={state?.heading ?? "paragraph"} onValueChange={(value) => {
          if (value === "paragraph") editor?.chain().focus().setParagraph().run()
          else if (value) editor?.chain().focus().setHeading({ level: Number(value) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        }} options={[{ value: "paragraph", label: "Paragraph" }, ...[1, 2, 3, 4, 5, 6].map((level) => ({ value: String(level), label: `Heading ${level}` }))]} />
        {formatButtons()}
        <Button variant={state?.link ? "default" : "ghost"} disabled={!editor || disabled} onClick={(event) => openInsert("link", event.currentTarget)}><Link />Link</Button>
        <Button ref={imageTrigger} variant={state?.image ? "default" : "ghost"} disabled={!editor || disabled} onClick={(event) => openInsert("image", event.currentTarget)}><ImagePlus />Image</Button>
        <Popover.Root open={blockPicker} onOpenChange={setBlockPicker}>
          <Popover.Trigger render={<Button variant="ghost" disabled={!editor || disabled} />}><Plus />Insert block</Popover.Trigger>
          <Popover.Portal><Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50"><Popover.Popup className="writing-block-menu" finalFocus={false}>
            <Popover.Title className="px-2.5 py-2 text-caption text-muted-foreground">Add a block</Popover.Title>
            {writingBlocks.map((item) => <button key={item.id} type="button" className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-muted focus-visible:bg-muted" onClick={() => {
              setBlockPicker(false)
              if (item.id === "image") openInsert("image", imageTrigger.current)
              else if (editor) { editor.commands.focus(); applyWritingBlock(editor, item.id) }
            }}><WritingBlockLabel item={item} /></button>)}
          </Popover.Popup></Popover.Positioner></Popover.Portal>
        </Popover.Root>
        {state?.link ? <Button variant="ghost" aria-label="Remove link" disabled={disabled} onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}><Unlink />Remove link</Button> : null}
        <div className="ml-auto flex items-center gap-1">{modeSwitch}</div>
        <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Editor help" />}><Info /></TooltipTrigger><TooltipContent>Type / to insert blocks. Select text to format it. Drag the handle to reorder.</TooltipContent></Tooltip>
      </div>
      {editor ? <>
        <BubbleMenu editor={editor} pluginKey="writing-format-menu" className="writing-floating-toolbar" options={{ placement: "top" }} shouldShow={({ editor, state, view }) => editor.isEditable && (view.hasFocus() || !!document.activeElement?.closest(".writing-floating-toolbar")) && !state.selection.empty && !editor.isActive("image")}>
          {formatButtons(true)}
          <Button size="sm" variant="ghost" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={(event) => openInsert("link", event.currentTarget)}><Link />Link</Button>
        </BubbleMenu>
        <BubbleMenu editor={editor} pluginKey="writing-image-menu" className="writing-floating-toolbar" shouldShow={({ editor, view }) => editor.isEditable && (view.hasFocus() || !!document.activeElement?.closest(".writing-floating-toolbar")) && editor.isActive("image")}>
          <Button size="sm" variant="ghost" onClick={() => openInsert("image", imageTrigger.current)}>Edit image</Button>
          <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash2 />Remove</Button>
        </BubbleMenu>
      </> : null}
    </TooltipProvider>
    {!editor ? <div role="status" aria-label="Loading editor" className="flex min-h-96 flex-col gap-4 py-6"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div> : null}
    <EditorContent editor={editor} />
    {editor && !disabled ? <DragHandle editor={editor} className="writing-drag-handle" onNodeChange={({ pos }) => setBlockPosition(pos)}>
      <button type="button" className="flex size-8 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing" aria-label="Drag to move this block, or select it to cut and paste" onClick={() => { if (blockPosition >= 0) editor.commands.setNodeSelection(blockPosition) }}><GripVertical className="size-4" /></button>
    </DragHandle> : null}
    <dialog ref={dialog} aria-labelledby={`${id}-insert-title`} className="fixed inset-0 m-auto max-h-full w-full max-w-(--measure) overflow-y-auto rounded-lg border border-border bg-background p-4 text-foreground backdrop:bg-background/85 sm:p-6" onClose={() => { uploadVersion.current++;setUploading(false);setInsert(null); focusElement(returnFocus.current) }}>
      {insert ? <form className="flex flex-col gap-4" onSubmit={(event) => {
        event.preventDefault()
        if(uploading) return
        if (insert === "link" || step === "review") applyInsert()
        else if (step === "url" && validateURL()) setStep("frame")
        else if (step === "frame") setStep("alt")
        else if (step === "alt") setStep("review")
      }}>
        <p className="text-caption text-muted-foreground">{insert === "image" ? `${{ url: 1, frame: 2, alt: 3, review: 4 }[step]} of 4 · Image` : "Link"}</p>
        <h2 id={`${id}-insert-title`} tabIndex={-1} className="text-title">{insert === "link" ? "Where should this link go?" : step === "url" ? "Add an image" : step === "frame" ? "How should it be framed?" : step === "alt" ? "Describe the image" : "Review your image"}</h2>
        {step === "url" ? <>
          {insert === "image" && onUpload ? <><input ref={fileInput} type="file" accept="image/*" className="sr-only" aria-label="Choose image file" disabled={uploading} onChange={(event)=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value=""}}/><Button type="button" className="w-fit" disabled={uploading} onClick={()=>fileInput.current?.click()}>{uploading ? <LoaderCircle className="motion-safe:animate-spin"/> : <Upload/>}{uploading ? "Uploading…" : "Upload image"}</Button><p className="text-caption text-muted-foreground" role={uploading ? "status" : undefined}>{uploading ? "Saving image…" : "Any image. You choose its frame next."}</p></> : null}
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
          <Button type="submit" disabled={disabled || uploading || !url.trim() || (step === "review" && !!error)}>{insert === "link" ? "Apply link" : step === "review" ? "Insert image" : "Next"}</Button>
          {step !== "url" ? <Button type="button" variant="ghost" onClick={() => { setError(""); setStep(step === "review" ? "alt" : step === "alt" ? "frame" : "url") }}>Back</Button> : null}
          <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>Cancel</Button>
        </div>
      </form> : null}
    </dialog>
  </div>
}
