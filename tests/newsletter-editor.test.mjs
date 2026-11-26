import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { marked } from "marked"
import { MarkdownManager } from "@tiptap/markdown"
import { Editor, getSchema } from "@tiptap/react"
import { applyWritingBlock, writingBlocks, newsletterEditorExtensions, newsletterRichTextIssue } from "../lib/newsletter-editor.ts"

// Exercise the real parser, serializer, and ProseMirror schema without a DOM or
// browser. These are the boundaries between the new UI and existing saved mail.
const manager = new MarkdownManager({ extensions: newsletterEditorExtensions, markedOptions: { gfm: true } })
const schema = getSchema(newsletterEditorExtensions)

function roundtrip(source) {
  const document = manager.parse(source)
  schema.nodeFromJSON(document).check()
  const output = manager.serialize(document)
  const restored = manager.parse(output)
  schema.nodeFromJSON(restored).check()
  assert.deepEqual(restored, document)
  return { document, output }
}

test("newsletter formatting survives saving and reopening in the existing Markdown format", () => {
  const source = '# Title\n\n## Section\n\nA **bold** word, *emphasis*, `code`, and [a link](https://example.com).\n\n> A quotation\n\n- First\n- Second\n\n3. Third\n4. Fourth\n\n```go\nfmt.Println("Hello")\n```\n\n---'
  assert.equal(newsletterRichTextIssue(source), null)
  const { output } = roundtrip(source)
  assert.match(output, /3\. Third/)
  assert.match(output, /```go/)
  assert.match(output, /\*\*bold\*\*/)
})

test("hosted images keep their URL, alt text, and title when saved and reopened", () => {
  const { document, output } = roundtrip('![A mountain](<https://example.com/photo_(2).png?size=large> "Mountain view")')
  const image = document.content[0].content[0]
  assert.equal(image.type, "image")
  assert.equal(image.attrs.alt, "A mountain")
  assert.equal(image.attrs.src, "https://example.com/photo_(2).png?size=large")
  assert.match(output, /photo_\(2\)\.png/)
})

test("image addresses and descriptions cannot escape their Markdown delimiters", () => {
  const attrs = { src: "https://example.com/photo_(2).png", alt: "A [draft] \\ photo", title: 'A "quoted" title' }
  const document = { type: "doc", content: [{ type: "paragraph", content: [{ type: "image", attrs }] }] }
  const output = manager.serialize(document)
  const restored = manager.parse(output)
  schema.nodeFromJSON(restored).check()
  assert.equal(restored.content.length, 1)
  const image = restored.content[0].content[0]
  assert.equal(image.type, "image")
  assert.equal(image.attrs.src, attrs.src)
  assert.equal(image.attrs.alt, attrs.alt)
  assert.equal(image.attrs.title, attrs.title)
})

// Tables, checklists, strikethrough and images within text used to force
// Markdown mode with no way back. The editor now holds them all.
const renders = (source) => marked.parse(source, { gfm: true }).replace(/\s+/g, " ").replace(/> </g, "><").trim()
test("tables, checklists, strikethrough and inline images open in the editor and keep their meaning", () => {
  for (const source of [
    '| Name | Value |\n| --- | --- |\n| One | **Two** |',
    '- [x] Finished\n- [ ] Next',
    'A ~~removed~~ word',
    '> A ~~removed~~ word',
    'Before ![photo](https://example.com/photo.png) after',
    '- Before ![photo](https://example.com/photo.png)',
  ]) {
    assert.equal(newsletterRichTextIssue(source), null, source)
    const { output } = roundtrip(source)
    assert.equal(renders(output), renders(source), source)
  }
})

test("only raw HTML stays in Markdown, because the site never publishes it", () => {
  assert(newsletterRichTextIssue('<div>Custom content</div>'))
})

test("every published article survives switching to the editor and back", () => {
  const posts = JSON.parse(readFileSync(new URL("../backend/internal/studio/posts.json", import.meta.url), "utf8"))
  // The real editor, as the desk opens it, rather than the stricter schema check above.
  for (const post of posts) {
    const editor = new Editor({ element: null, extensions: newsletterEditorExtensions, content: post.markdown, contentType: "markdown" })
    try { assert.equal(renders(editor.getMarkdown()), renders(post.markdown), post.slug) } finally { editor.destroy() }
  }
})

test("ordinary documents and literal code do not unnecessarily fall back to source mode", () => {
  for (const source of ['', 'Hello **world**.', '![photo](https://example.com/photo.png)', '```html\n<div>Example</div>\n```', '`~~literal~~`']) {
    assert.equal(newsletterRichTextIssue(source), null, source)
  }
})

test("real formatting and image commands produce saveable content without a browser", () => {
  const changes = []
  const editor = new Editor({ element: null, extensions: newsletterEditorExtensions, content: "Hello world", contentType: "markdown", onUpdate: ({ editor }) => changes.push(editor.getMarkdown()) })
  try {
    editor.commands.setTextSelection({ from: 1, to: 6 })
    editor.commands.toggleBold()
    assert.equal(editor.getMarkdown(), "**Hello** world")
    assert.equal(changes.length, 1)
    editor.commands.setTextSelection(12)
    editor.commands.setImage({ src: "https://example.com/image.png", alt: "An example" })
    roundtrip(editor.getMarkdown())
    assert.match(editor.getMarkdown(), /!\[An example\]/)
    editor.commands.setContent("A newly opened draft", { contentType: "markdown", emitUpdate: false })
    editor.setEditable(false, false)
    assert.equal(editor.getMarkdown(), "A newly opened draft")
    assert.equal(changes.length, 2, "Opening drafts and disabling controls must not trigger autosave")
  } finally { editor.destroy() }
})

test("the block picker and slash commands retain text and round-trip through saved drafts", () => {
  for (const block of writingBlocks.filter((block) => block.id !== "image")) {
    const editor = new Editor({ element: null, extensions: newsletterEditorExtensions, content: "A paragraph", contentType: "markdown" })
    try {
      editor.commands.setTextSelection(editor.state.doc.content.size - 1)
      applyWritingBlock(editor, block.id)
      const expected = block.id.startsWith("heading") ? "heading" : block.id === "horizontalRule" ? "paragraph" : block.id
      assert.equal(editor.getJSON().content[0].type, expected)
      const markdown = editor.getMarkdown()
      assert(markdown.includes("A paragraph"), block.id)
      roundtrip(markdown)
    } finally { editor.destroy() }
  }
})

test("an image's frame survives the editor, Markdown and reopening", () => {
  for (const frame of ["landscape", "wide", "square", "portrait"]) {
    const source = `![A chart](<https://res.cloudinary.com/my-cloud/image/upload/v17/blog/c.png#frame=${frame}>)`
    const { document, output } = roundtrip(source)
    assert.equal(document.content[0].content[0].attrs.src, `https://res.cloudinary.com/my-cloud/image/upload/v17/blog/c.png#frame=${frame}`)
    assert(output.includes(`#frame=${frame}`), frame)
  }
})
