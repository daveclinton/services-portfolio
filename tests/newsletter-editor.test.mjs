import assert from "node:assert/strict"
import test from "node:test"
import { MarkdownManager } from "@tiptap/markdown"
import { Editor, getSchema } from "@tiptap/react"
import { newsletterEditorExtensions, newsletterRichTextIssue } from "../lib/newsletter-editor.ts"

// Exercise the real parser, serializer, and ProseMirror schema without a DOM or
// browser. These are the boundaries between the new UI and existing saved mail.
const manager = new MarkdownManager({ extensions: newsletterEditorExtensions, markedOptions: { gfm: false } })
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
  assert.equal(document.content[0].type, "image")
  assert.equal(document.content[0].attrs.alt, "A mountain")
  assert.equal(document.content[0].attrs.src, "https://example.com/photo_(2).png?size=large")
  assert.match(output, /photo_\(2\)\.png/)
})

test("image addresses and descriptions cannot escape their Markdown delimiters", () => {
  const document = { type: "doc", content: [{ type: "image", attrs: { src: "https://example.com/photo_(2).png", alt: "A [draft] \\ photo", title: 'A "quoted" title' } }] }
  const output = manager.serialize(document)
  const restored = manager.parse(output)
  schema.nodeFromJSON(restored).check()
  assert.equal(restored.content.length, 1)
  assert.equal(restored.content[0].type, "image")
  assert.equal(restored.content[0].attrs.src, document.content[0].attrs.src)
  assert.equal(restored.content[0].attrs.alt, document.content[0].attrs.alt)
  assert.equal(restored.content[0].attrs.title, document.content[0].attrs.title)
})

test("legacy formats the editor cannot preserve are kept in source mode", () => {
  for (const source of [
    '| Name | Value |\n| --- | --- |\n| One | Two |',
    '- [x] Finished',
    'A ~~removed~~ word',
    '> A ~~removed~~ word',
    '<div>Custom content</div>',
    'Before ![photo](https://example.com/photo.png) after',
    '## ![photo](https://example.com/photo.png)',
    '- Before ![photo](https://example.com/photo.png)',
  ]) assert(newsletterRichTextIssue(source), source)
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
