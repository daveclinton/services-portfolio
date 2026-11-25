import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import { Markdown } from "@tiptap/markdown"
import { Placeholder } from "@tiptap/extensions"
import { marked } from "marked"

// Keep the first release within the existing Go renderer's CommonMark schema.
// https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage
// https://tiptap.dev/docs/editor/markdown/advanced-usage/custom-serializing
export const newsletterEditorExtensions = [
  StarterKit.configure({
    underline: false,
    strike: false,
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
  }).configure({ HTMLAttributes: { class: "my-4 h-auto max-w-full rounded-lg" } }),
  Markdown.configure({ markedOptions: { gfm: false } }),
  Placeholder.configure({ placeholder: "Start writing your newsletter…" }),
]

// Opening a legacy draft must never silently remove unsupported formatting.
// https://marked.js.org/using_pro#walk-tokens
export function newsletterRichTextIssue(source: string): string | null {
  let issue: string | null = null
  marked.walkTokens(marked.lexer(source), (token) => {
    if (["html", "table", "del"].includes(token.type) || (token.type === "list_item" && token.task)) {
      issue = "This draft uses formatting that is currently available in Markdown mode. Keep editing there to preserve it."
    }
    if ("tokens" in token && token.tokens?.some((inline) => inline.type === "image") && (token.tokens.length > 1 || token.type !== "paragraph")) {
      issue = "This draft has images within text. Keep editing in Markdown mode to preserve their placement."
    }
  })
  return issue
}
