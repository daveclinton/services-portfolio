"use client"

import { useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import DragHandle from "@tiptap/extension-drag-handle-react"
import { Popover } from "@base-ui/react/popover"
import { Bold, Italic, Code, Link, ImagePlus, Plus, GripVertical, Undo2, Redo2, Unlink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Markdown } from "@/components/prompt-kit/markdown"
import { applyWritingBlock, writingBlocks, newsletterEditorExtensions, newsletterRichTextIssue } from "@/lib/newsletter-editor"
import { createWritingSlash, WritingBlockLabel } from "@/components/portfolio/newsletter-command-menu"
import { STUDIO_BODY_LIMIT } from "@/lib/newsletter-studio"
import { focusElement } from "@/lib/scroll"

type Props = { value: string; disabled: boolean; onChange: (value: string) => void }

// Novel's document canvas, slash commands, contextual formatting, and handles.
// https://github.com/steven-tey/novel/tree/main/apps/web/components/tailwind
export function NewsletterEditor({ value, disabled, onChange }: Props) {
  const [mode, setMode] = useState<"rich" | "markdown">(() => newsletterRichTextIssue(value) ? "markdown" : "rich")
  const issue = newsletterRichTextIssue(value)
  const bytes = new TextEncoder().encode(value).length

  return <section className="flex min-w-0 flex-col gap-4" aria-label="Post content">
    {issue ? <p className="text-caption text-muted-foreground">{issue}</p> : null}
    {mode === "rich" ? <RichTextEditor value={value} disabled={disabled} onChange={onChange} /> : <>
      <label htmlFor="newsletter-markdown" className="sr-only">Post Markdown</label>
      <textarea id="newsletter-markdown" rows={14} className="min-h-96 w-full resize-y rounded-2xl border border-input bg-background p-4 font-mono text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/20" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer text-caption">Formatted preview</summary><Markdown className="mt-4">{value || "Your post will appear here."}</Markdown></details>
    </>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
      <p className="text-caption text-muted-foreground">{value.trim() ? value.trim().split(/\s+/).length : 0} words</p>
      <Button size="sm" variant="ghost" disabled={disabled || (mode === "markdown" && !!issue)} onClick={() => setMode(mode === "rich" ? "markdown" : "rich")}>{mode === "rich" ? "Edit Markdown" : "Back to editor"}</Button>
    </div>
    {bytes > STUDIO_BODY_LIMIT ? <p role="alert" className="text-caption text-destructive">This draft is too long to save. Remove {bytes - STUDIO_BODY_LIMIT} bytes to continue.</p> : null}
  </section>
}

function RichTextEditor({ value, disabled, onChange }: Props) {
  const id = useId()
  const [initial] = useState(value)
  const emitted = useRef(value)
  const dialog = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const imageTrigger = useRef<HTMLButtonElement>(null)
  const imageAction = useRef<(() => void) | null>(null)
  const linkAction = useRef<(() => void) | null>(null)
  const extensions = useMemo(() => [...newsletterEditorExtensions, createWritingSlash(() => imageAction.current?.())], [])
  const [blockPicker, setBlockPicker] = useState(false)
  const [blockPosition, setBlockPosition] = useState(-1)
  const [insert, setInsert] = useState<"link" | "image" | null>(null)
  const [url, setURL] = useState("")
  const [alt, setAlt] = useState("")
  const [step, setStep] = useState<"url" | "alt" | "review">("url")
  const [error, setError] = useState("")
  const [mediaNotice, setMediaNotice] = useState("")
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
        setMediaNotice("To add this image, choose Image and paste its hosted HTTPS address. Device uploads are not available yet.")
        return true
      },
      handleDrop: (_view, event) => {
        if (!event.dataTransfer?.files.length) return false
        setMediaNotice("To add this image, choose Image and paste its hosted HTTPS address. Device uploads are not available yet.")
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
    imageAction.current = () => openInsert("image", imageTrigger.current)
    linkAction.current = () => openInsert("link", null)
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
    setURL(String(editor.getAttributes(kind).href ?? editor.getAttributes(kind).src ?? ""))
    setAlt(String(editor.getAttributes(kind).alt ?? ""))
    setStep("url"); setError(""); setMediaNotice(""); setInsert(kind)
  }
  function validateURL(): string | null {
    try {
      const parsed = new URL(url.trim())
      if (parsed.username || parsed.password || !["https:", ...(insert === "link" ? ["http:", "mailto:"] : [])].includes(parsed.protocol)) throw new Error()
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
      if (editor.isActive("image")) editor.chain().focus().updateAttributes("image", { src: address, alt: alt.trim() }).run()
      else editor.chain().focus().setImage({ src: address, alt: alt.trim() }).run()
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
      <TooltipTrigger render={<Button size="icon" variant={active ? "secondary" : "ghost"} aria-label={label} aria-pressed={active} disabled={!editor || disabled || enabled === false} onMouseDown={(event) => event.preventDefault()} onClick={run} />}><Icon /></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>)
  }

  return <div className="relative min-w-0">
    <TooltipProvider delay={300}>
      <div className="flex flex-wrap items-center gap-1 border-y border-border py-2.5" role="group" aria-label="Text formatting">
        <label htmlFor={`${id}-style`} className="sr-only">Text style</label>
        <select id={`${id}-style`} className="h-8 max-w-full rounded-lg bg-background px-2.5 text-caption text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/20" disabled={!editor || disabled} value={state?.heading ?? "paragraph"} onChange={(event) => {
          if (event.target.value === "paragraph") editor?.chain().focus().setParagraph().run()
          else editor?.chain().focus().setHeading({ level: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        }}>
          <option value="paragraph">Paragraph</option>
          {[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>Heading {level}</option>)}
        </select>
        {formatButtons()}
        <Button variant={state?.link ? "secondary" : "ghost"} disabled={!editor || disabled} onClick={(event) => openInsert("link", event.currentTarget)}><Link />Link</Button>
        <Button ref={imageTrigger} variant={state?.image ? "secondary" : "ghost"} disabled={!editor || disabled} onClick={(event) => openInsert("image", event.currentTarget)}><ImagePlus />Image</Button>
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
    <p className="py-3 text-caption text-muted-foreground">Type / to add a block. Select text to format it. Drag the handle to reorder.</p>
    {!editor ? <p role="status" className="p-4 text-caption text-muted-foreground">Loading editor…</p> : null}
    <EditorContent editor={editor} />
    {editor && !disabled ? <DragHandle editor={editor} className="writing-drag-handle" onNodeChange={({ pos }) => setBlockPosition(pos)}>
      <button type="button" className="flex size-8 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing" aria-label="Drag to move this block, or select it to cut and paste" onClick={() => { if (blockPosition >= 0) editor.commands.setNodeSelection(blockPosition) }}><GripVertical className="size-4" /></button>
    </DragHandle> : null}
    {mediaNotice ? <p role="status" className="px-4 pb-4 text-caption text-muted-foreground">{mediaNotice}</p> : null}
    <dialog ref={dialog} aria-labelledby={`${id}-insert-title`} className="fixed inset-0 m-auto max-h-full w-full max-w-(--measure) overflow-y-auto rounded-lg border border-border bg-background p-4 text-foreground backdrop:bg-background/85 sm:p-6" onClose={() => { setInsert(null); focusElement(returnFocus.current) }}>
      {insert ? <form className="flex flex-col gap-4" onSubmit={(event) => {
        event.preventDefault()
        if (insert === "link" || step === "review") applyInsert()
        else if (step === "url" && validateURL()) setStep("alt")
        else if (step === "alt") setStep("review")
      }}>
        <p className="text-caption text-muted-foreground">{insert === "image" ? `${step === "url" ? 1 : step === "alt" ? 2 : 3} of 3 · Image` : "Link"}</p>
        <h2 id={`${id}-insert-title`} tabIndex={-1} className="text-title">{insert === "link" ? "Where should this link go?" : step === "url" ? "Add an image" : step === "alt" ? "Describe the image" : "Review your image"}</h2>
        {step === "url" ? <>
          <label htmlFor={`${id}-url`} className="text-body">{insert === "image" ? "HTTPS image address" : "Link address"}</label>
          <input id={`${id}-url`} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="chat-input min-h-8 w-full min-w-0 rounded-lg border border-input bg-background p-2.5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/20" required value={url} onChange={(event) => { setURL(event.target.value); setError("") }} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
          {insert === "image" ? <p className="text-caption text-muted-foreground">Use an image already hosted online. Uploading from your device is not available yet.</p> : null}
        </> : step === "alt" ? <>
          <label htmlFor={`${id}-alt`} className="text-body">What does the image show?</label>
          <textarea id={`${id}-alt`} rows={3} className="chat-input w-full rounded-lg border border-input bg-background p-2.5 text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/20" value={alt} onChange={(event) => setAlt(event.target.value)} />
          <p className="text-caption text-muted-foreground">This description helps readers who cannot see the image. Leave it empty if the image is decorative.</p>
        </> : <>
          {/* Remote editor media has no known dimensions; render it as the email does. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt} className="h-auto max-w-full rounded-lg" onLoad={() => setError("")} onError={() => setError("This image could not be loaded. Go Back to check its address.")} />
          <dl className="flex min-w-0 flex-col gap-2 text-body"><dt className="text-caption text-muted-foreground">Image address</dt><dd className="break-all">{url}</dd><dt className="text-caption text-muted-foreground">Description</dt><dd>{alt.trim() || "Decorative image"}</dd></dl>
        </>}
        {error ? <p id={`${id}-error`} role="alert" className="text-body text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={disabled || !url.trim() || (step === "review" && !!error)}>{insert === "link" ? "Apply link" : step === "review" ? "Insert image" : "Next"}</Button>
          {step !== "url" ? <Button type="button" variant="ghost" onClick={() => { setError(""); setStep(step === "review" ? "alt" : "url") }}>Back</Button> : null}
          <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>Cancel</Button>
        </div>
      </form> : null}
    </dialog>
  </div>
}
