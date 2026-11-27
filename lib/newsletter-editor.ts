import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import { TableKit } from "@tiptap/extension-table"
import Paragraph from "@tiptap/extension-paragraph"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Markdown } from "@tiptap/markdown"
import { Placeholder } from "@tiptap/extensions"
import { marked } from "marked"
import type { Editor } from "@tiptap/react"
import type { NewsletterDraft } from "./newsletter-studio"
import { Plugin, PluginKey, type SelectionBookmark } from "@tiptap/pm/state"

export const imageUploadPositions = new PluginKey<Map<string, SelectionBookmark>>("image-upload-positions")

// Textarea edits map pending insertions just as ProseMirror maps bookmarks.
export function mapMarkdownPosition(previous: string, next: string, position: number): number {
  let start = 0, before = previous.length, after = next.length
  while (start < before && start < after && previous[start] === next[start]) start++
  while (before > start && after > start && previous[before - 1] === next[after - 1]) { before--; after-- }
  if (position < start) return position
  return position > before ? position + next.length - previous.length : after
}

export type NewsletterDocument = Pick<NewsletterDraft, "subject" | "description" | "markdown">

// A single Markdown document: its leading H1 is the title, followed by the
// post's description paragraph and the unchanged article source. Newsletters
// have no description. Empty descriptions retain their paragraph boundary.
// https://hackmd.io/features
export function newsletterDocumentMarkdown({ subject, description, markdown }: NewsletterDocument): string {
  return `# ${subject}\n\n${description === undefined ? "" : `${description}\n\n`}${markdown}`
}

export function parseNewsletterDocument(source: string, withDescription: boolean): NewsletterDocument {
  const title = /^#(?:[ \t]+([^\r\n]*))?(?:\r?\n|$)/.exec(source)
  // Removing the heading keeps all the source in the article; the existing
  // required-title validation prevents saving an accidentally untitled draft.
  if (!title) return { subject: "", markdown: source, ...(withDescription ? { description: "" } : {}) }
  let content = source.slice(title[0].length).replace(/^\r?\n/, "")
  const subject = title[1] ?? ""
  if (!withDescription) return { subject, markdown: content }
  const boundary = /\r?\n\r?\n/.exec(content)
  const description = (boundary ? content.slice(0, boundary.index) : content).replace(/\r?\n/g, " ")
  content = boundary ? content.slice(boundary.index + boundary[0].length) : ""
  return { subject, description, markdown: content }
}

export const writingBlocks = [
  { id: "paragraph", label: "Text", description: "A plain paragraph", search: "paragraph normal body" },
  { id: "heading1", label: "Heading 1", description: "A large section heading", search: "title large h1" },
  { id: "heading2", label: "Heading 2", description: "A section heading", search: "subtitle h2" },
  { id: "heading3", label: "Heading 3", description: "A smaller heading", search: "subtitle h3" },
  { id: "bulletList", label: "Bullet list", description: "A list of points", search: "unordered bullets" },
  { id: "orderedList", label: "Numbered list", description: "A sequence of steps", search: "ordered numbers" },
  { id: "blockquote", label: "Quote", description: "A passage worth calling out", search: "blockquote citation" },
  { id: "codeBlock", label: "Code block", description: "A code snippet", search: "fenced source" },
  { id: "horizontalRule", label: "Divider", description: "A break between sections", search: "line separator" },
  { id: "image", label: "Image", description: "Upload or use an image address", search: "photo picture media upload" },
] as const
export type WritingBlock = typeof writingBlocks[number]

export type MarkdownFormat = "bold" | "italic" | "strikethrough" | "heading" | "quote" | "code" | "link" | "image" | "bulletList" | "orderedList" | "taskList"

// GitHub's selection-based toolbar: return a replacement range so the textarea
// can insert it through native editing, retaining its undo history.
// https://github.com/github/markdown-toolbar-element
export function formatMarkdown(source: string, start: number, end: number, format: MarkdownFormat) {
  let selected = source.slice(start, end)
  let text: string
  let selectionStart = start
  let selectionEnd = end
  if (["heading", "quote", "bulletList", "orderedList", "taskList"].includes(format)) {
    start = start === 0 ? 0 : source.lastIndexOf("\n", start - 1) + 1
    const lineEnd = end > start && source[end - 1] === "\n" ? end - 1 : end
    const nextBreak = source.indexOf("\n", lineEnd)
    end = nextBreak < 0 ? source.length : nextBreak
    const lines = source.slice(start, end).split("\n")
    const pattern = format === "heading" ? /^#{1,6} / : format === "quote" ? /^> / : format === "bulletList" ? /^[-+*] (?!\[[ xX]\] )/ : format === "orderedList" ? /^\d+\. / : /^- \[[ xX]\] /
    const remove = lines.every((line) => pattern.test(line.trimStart()))
    text = lines.map((line, index) => {
      const indent = line.match(/^\s*/)?.[0] ?? ""
      const body = line.slice(indent.length)
      if (remove) return indent + body.replace(pattern, "")
      const prefix = format === "heading" ? "### " : format === "quote" ? "> " : format === "orderedList" ? `${index + 1}. ` : format === "taskList" ? "- [ ] " : "- "
      const clean = ["bulletList", "orderedList", "taskList"].includes(format) ? body.replace(/^(?:[-+*] \[[ xX]\] |[-+*] |\d+\. )/, "") : body.replace(pattern, "")
      return indent + prefix + clean
    }).join("\n")
    selectionStart = start; selectionEnd = start + text.length
  } else if (format === "link" || format === "image") {
    const isURL = /^https?:\/\/\S+$/.test(selected)
    const label = isURL ? "" : selected
    const prefix = format === "image" ? "![" : "["
    text = `${prefix}${label}](${isURL ? selected : "url"})`
    selectionStart = isURL ? start + prefix.length : start + prefix.length + label.length + 2
    selectionEnd = isURL ? selectionStart : selectionStart + 3
  } else {
    const marker = format === "bold" ? "**" : format === "italic" ? "_" : format === "strikethrough" ? "~~" : "`"
    let prefix = marker, suffix = marker
    if (format === "code" && selected.includes("\n")) {
      const fence = "`".repeat(Math.max(3, ...Array.from(selected.matchAll(/`+/g), (match) => match[0].length + 1)))
      // A selected fenced block toggles back to source, like an inline mark.
      const wrapped = selected.match(/^(`{3,})\n([\s\S]*)\n\1$/)
      if (wrapped) { prefix = `${wrapped[1]}\n`; suffix = `\n${wrapped[1]}` }
      else { prefix = `${fence}\n`; suffix = `\n${fence}` }
    }
    else if (format === "code" && selected.includes("`")) {
      const wrapped = selected.match(/^(`+)( ?)([\s\S]*?)\2\1$/)
      if (wrapped) { prefix = wrapped[1] + wrapped[2]; suffix = wrapped[2] + wrapped[1] }
      else {
        const longest = Math.max(...Array.from(selected.matchAll(/`+/g), (match) => match[0].length))
        prefix = "`".repeat(longest + 1) + " "; suffix = " " + "`".repeat(longest + 1)
      }
    }
    if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length >= prefix.length + suffix.length) {
      selected = selected.slice(prefix.length, -suffix.length)
      text = selected; selectionStart = start; selectionEnd = start + text.length
    } else if (source.slice(Math.max(0, start - prefix.length), start) === prefix && source.slice(end, end + suffix.length) === suffix) {
      start -= prefix.length; end += suffix.length
      text = selected; selectionStart = start; selectionEnd = start + text.length
    } else {
      text = prefix + selected + suffix
      selectionStart = start + prefix.length; selectionEnd = selectionStart + selected.length
    }
  }
  return { start, end, text, selectionStart, selectionEnd }
}

export function newsletterImageMarkdown(src: string, alt = "", title = "") {
  const label = alt.replace(/[\\\[\]]/g, "\\$&").replace(/\r?\n/g, " ")
  const address = src.replace(/[<>\s]/g, encodeURIComponent)
  const caption = title.replace(/[\\"]/g, "\\$&").replace(/\r?\n/g, " ")
  return `![${label}](<${address}>${caption ? ` "${caption}"` : ""})`
}

// Commands shared by the insert menu, slash menu, and keyboard-accessible UI.
export function applyWritingBlock(editor: Editor, id: WritingBlock["id"]): boolean {
  if (id === "paragraph") return editor.chain().clearNodes().setParagraph().run()
  if (id === "heading1" || id === "heading2" || id === "heading3") return editor.chain().clearNodes().setHeading({ level: Number(id.at(-1)) as 1 | 2 | 3 }).run()
  if (id === "bulletList") return editor.chain().clearNodes().toggleBulletList().run()
  if (id === "orderedList") return editor.chain().clearNodes().toggleOrderedList().run()
  if (id === "blockquote") return editor.chain().clearNodes().toggleBlockquote().run()
  if (id === "codeBlock") return editor.chain().clearNodes().setCodeBlock().run()
  if (id === "horizontalRule") return editor.commands.setHorizontalRule()
  return false // Images open the existing media form before inserting content.
}

// GitHub-flavoured Markdown, matching the Go renderer's Table, Strikethrough and
// TaskList extensions, so switching between the editor and Markdown loses nothing.
// https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage
// https://tiptap.dev/docs/editor/markdown/advanced-usage/custom-serializing
export const newsletterEditorExtensions = [
  StarterKit.configure({
    paragraph: false,
    underline: false,
    link: { openOnClick: false, autolink: false, defaultProtocol: "https" },
  }),
  Image.extend({
    addProseMirrorPlugins() {
      return [...(this.parent?.() ?? []), new Plugin({
        key: imageUploadPositions,
        state: {
          init: () => new Map<string, SelectionBookmark>(),
          apply(transaction, positions: Map<string, SelectionBookmark>) {
            const mapped = new Map(Array.from(positions, ([id, bookmark]) => [id, bookmark.map(transaction.mapping)]))
            const change = transaction.getMeta(imageUploadPositions) as { id: string; bookmark?: SelectionBookmark } | undefined
            if (change?.bookmark) mapped.set(change.id, change.bookmark)
            else if (change) mapped.delete(change.id)
            return mapped
          },
        },
      })]
    },
    parseMarkdown(token, helpers) {
      const alt = token.tokens ? helpers.parseInline(token.tokens).map((node) => node.text ?? "").join("") : token.text
      return helpers.createNode("image", { src: token.href, title: token.title, alt })
    },
    renderMarkdown(node) {
      return newsletterImageMarkdown(String(node.attrs?.src ?? ""), String(node.attrs?.alt ?? ""), String(node.attrs?.title ?? ""))
    },
  // Inline, so an image inside a sentence keeps its place; on its own line it still stands alone.
  }).configure({ inline: true }),
  // Tiptap unwraps a paragraph holding only an image into a block image. Images
  // are inline here, so they stay inside their paragraph instead.
  Paragraph.extend({
    parseMarkdown(token, helpers) {
      const tokens = token.tokens ?? []
      if (tokens.length === 1 && tokens[0].type === "image") return helpers.createNode("paragraph", undefined, helpers.parseInline(tokens))
      return this.parent ? this.parent(token, helpers) : helpers.createNode("paragraph", undefined, helpers.parseInline(tokens))
    },
  }),
  TableKit.configure({ table: { resizable: false } }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Markdown.configure({ markedOptions: { gfm: true } }),
  Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "Heading" : "Write something, or type / for blocks…" }),
]

// Opening a legacy draft must never silently remove unsupported formatting.
// https://marked.js.org/using_pro#walk-tokens
export function newsletterRichTextIssue(source: string): string | null {
  let issue: string | null = null
  marked.walkTokens(marked.lexer(source), (token) => {
    // Raw HTML is the one thing the editor cannot hold; the site never renders it either.
    if (token.type === "html") issue = "This draft contains raw HTML, which the site does not publish. Remove it in Markdown to use the editor."
  })
  return issue
}
