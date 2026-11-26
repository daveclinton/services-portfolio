import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import { TableKit } from "@tiptap/extension-table"
import Paragraph from "@tiptap/extension-paragraph"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Markdown } from "@tiptap/markdown"
import { Placeholder } from "@tiptap/extensions"
import { marked } from "marked"
import type { Editor } from "@tiptap/react"

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
    parseMarkdown(token, helpers) {
      const alt = token.tokens ? helpers.parseInline(token.tokens).map((node) => node.text ?? "").join("") : token.text
      return helpers.createNode("image", { src: token.href, title: token.title, alt })
    },
    renderMarkdown(node) {
      const alt = String(node.attrs?.alt ?? "").replace(/[\\\[\]]/g, "\\$&").replace(/\r?\n/g, " ")
      const src = String(node.attrs?.src ?? "").replace(/[<>\s]/g, encodeURIComponent)
      const title = String(node.attrs?.title ?? "").replace(/[\\"]/g, "\\$&").replace(/\r?\n/g, " ")
      return `![${alt}](<${src}>${title ? ` "${title}"` : ""})`
    },
  // Inline, so an image inside a sentence keeps its place; on its own line it still stands alone.
  }).configure({ inline: true, HTMLAttributes: { class: "my-4 inline-block h-auto max-w-full rounded-lg align-middle" } }),
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
