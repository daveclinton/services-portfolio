import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import { marked } from "marked"
import { MarkdownManager } from "@tiptap/markdown"
import { Editor, getSchema } from "@tiptap/react"
import { applyWritingBlock, writingBlocks, newsletterEditorExtensions, newsletterRichTextIssue, formatMarkdown, newsletterImageMarkdown, newsletterDocumentMarkdown, parseNewsletterDocument } from "../lib/newsletter-editor.ts"

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

function formatted(source, start, end, kind) {
  const edit = formatMarkdown(source, start, end, kind)
  const value = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  assert(edit.selectionStart >= 0 && edit.selectionEnd <= value.length, "selection stays inside the edited draft")
  return { value, selected: value.slice(edit.selectionStart, edit.selectionEnd), ...edit }
}

test("whole-document Markdown round trips title, optional description and the exact article source", () => {
  const bodies = ["", "\n\nOpening **paragraph**.\n\n## Section\n\nBody\n", "---\n\n# A body heading\n\n> A quotation", "```js\nconst source = '# Not a title'\n```\n\n- [ ] Task", "\r\nA paragraph\r\n\r\nAnother\r\n"]
  for (const markdown of bodies) for (const description of [undefined, "", "A description with **formatting**, : and Unicode — habari 👋"]) {
    const document = { subject: "A title with #, quotes and Unicode 👋", markdown, ...(description === undefined ? {} : { description }) }
    assert.deepEqual(parseNewsletterDocument(newsletterDocumentMarkdown(document), description !== undefined), document)
  }
  const posts = JSON.parse(readFileSync(new URL("../backend/internal/studio/posts.json", import.meta.url), "utf8"))
  for (const post of posts) {
    const document = { subject: post.title, description: post.description, markdown: post.markdown }
    assert.deepEqual(parseNewsletterDocument(newsletterDocumentMarkdown(document), true), document, post.slug)
  }
})

test("editing full Markdown changes title, description and body together without consuming newsletter body paragraphs", () => {
  assert.deepEqual(parseNewsletterDocument("# Changed title\n\nChanged description\n\nFirst body paragraph\n\n## Section\n\nLast", true), {
    subject: "Changed title", description: "Changed description", markdown: "First body paragraph\n\n## Section\n\nLast",
  })
  assert.deepEqual(parseNewsletterDocument("# Newsletter title\n\nFirst body paragraph\n\nLast", false), { subject: "Newsletter title", markdown: "First body paragraph\n\nLast" })
  assert.deepEqual(parseNewsletterDocument("# Changed\n\n\n\nBody", true), { subject: "Changed", description: "", markdown: "Body" })
  assert.deepEqual(parseNewsletterDocument("# Changed\r\n\r\nSummary\r\n\r\nBody\r\n", true), { subject: "Changed", description: "Summary", markdown: "Body\r\n" })
  const source = "A missing title marker\n\n## Section\n\nBody"
  assert.deepEqual(parseNewsletterDocument(source, true), { subject: "", description: "", markdown: source }, "removing a title marker never drops the source")
})

test("switching to whole-document source and back retains metadata edits and never duplicates the article", () => {
  const slots = [], exports = {}
  let cursor = 0
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const hooks = { useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], (value) => { slots[index] = value }] } }
  const source = ts.transpileModule(readFileSync(new URL("../components/portfolio/newsletter-editor.tsx", import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(source, { exports, TextEncoder, require(name) {
    if (name === "react") return hooks
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx }
    if (name === "@/lib/newsletter-editor") return { newsletterDocumentMarkdown, parseNewsletterDocument, newsletterRichTextIssue }
    if (name === "@/lib/newsletter-studio") return { STUDIO_BODY_LIMIT: 40_000 }
    return new Proxy({}, { get: (_object, key) => key })
  } })
  const props = { subject: "Original title", description: "Original description", value: "Opening.\n\n## Section\n\nBody.", disabled: false, children: "Visual title and description fields", onChange(value) { props.value = value }, onDocumentChange(document) { props.subject = document.subject; props.description = document.description; props.value = document.markdown } }
  function render() { cursor = 0; return exports.NewsletterEditor(props).props.children[0] }
  function modeButton(node) {
    if (Array.isArray(node)) return node.map(modeButton).find(Boolean)
    if (!node?.props) return null
    if (node.props["aria-label"] === "Edit Markdown" || node.props["aria-label"] === "Back to editor") return node
    return modeButton(node.props.render) ?? modeButton(node.props.children)
  }
  let editor = render()
  assert.equal(editor.type.name, "RichTextEditor")
  modeButton(editor.props.modeSwitch).props.onClick()
  editor = render()
  assert.equal(editor.type.name, "MarkdownEditor")
  assert.equal(editor.props.children, undefined, "source mode has no separate metadata fields")
  assert.equal(editor.props.value, "# Original title\n\nOriginal description\n\nOpening.\n\n## Section\n\nBody.")
  const changed = "# New title\n\nNew description\n\n\nAn edited **body**.\n\n## Section\n\nKeep me.\n"
  editor.props.onChange(changed)
  editor = render()
  assert.equal(editor.props.value, changed, "parent draft updates do not rewrite the source or its whitespace while typing")
  modeButton(editor.props.modeSwitch).props.onClick()
  editor = render()
  assert.equal(editor.type.name, "RichTextEditor")
  assert.equal(props.subject, "New title")
  assert.equal(props.description, "New description")
  assert.equal(editor.props.value, "\nAn edited **body**.\n\n## Section\n\nKeep me.\n")
  for (let index = 0; index < 3; index++) {
    modeButton(editor.props.modeSwitch).props.onClick(); editor = render()
    assert.equal(editor.props.value, changed)
    modeButton(editor.props.modeSwitch).props.onClick(); editor = render()
    assert.equal(editor.props.value, props.value)
  }
})

test("Markdown formatting preserves surrounding prose, selects the content, and toggles off", () => {
  for (const kind of ["bold", "italic", "strikethrough", "code"]) {
    const result = formatted("Before hello after", 7, 12, kind)
    assert.equal(result.selected, "hello")
    assert(result.value.startsWith("Before ") && result.value.endsWith(" after"))
    assert.equal(formatted(result.value, result.selectionStart, result.selectionEnd, kind).value, "Before hello after")
    assert.equal(formatted(result.value, result.start, result.start + result.text.length, kind).value, "Before hello after")
  }
  const empty = formatted("Draft", 5, 5, "bold")
  assert.equal(empty.value, "Draft****")
  assert.equal(empty.selectionStart, 7)
})

test("Markdown block commands expand to complete lines without changing the following paragraph", () => {
  const source = "Before\nFirst\nSecond\nAfter"
  for (const [kind, expected] of [["heading", "### First\n### Second"], ["quote", "> First\n> Second"], ["bulletList", "- First\n- Second"], ["orderedList", "1. First\n2. Second"], ["taskList", "- [ ] First\n- [ ] Second"]]) {
    const result = formatted(source, 9, 20, kind)
    assert.equal(result.value, `Before\n${expected}\nAfter`)
    assert.equal(formatted(result.value, result.selectionStart, result.selectionEnd, kind).value, source)
    roundtrip(result.value)
  }
  assert.equal(formatted("\nAfter", 0, 0, "quote").value, "> \nAfter")
  assert.equal(formatted("  First\n  Second", 3, 16, "bulletList").value, "  - First\n  - Second")
  assert.equal(formatted("- [ ] First\n- [x] Second", 0, 24, "bulletList").value, "- First\n- Second")
  assert.equal(formatted("- First\n- Second", 0, 16, "orderedList").value, "1. First\n2. Second")
})

test("Markdown links and images select the URL placeholder for immediate replacement", () => {
  for (const kind of ["link", "image"]) {
    const result = formatted("Before label after", 7, 12, kind)
    assert.equal(result.value, `Before ${kind === "image" ? "!" : ""}[label](url) after`)
    assert.equal(result.selected, "url")
    const address = "https://example.com"
    const linked = formatted(address, 0, address.length, kind)
    assert.equal(linked.value, `${kind === "image" ? "!" : ""}[](${address})`)
    assert.equal(linked.selectionStart, kind === "image" ? 2 : 1)
  }
})

test("Markdown code formatting retains embedded backticks and multiline source", () => {
  for (const source of ["a `quoted` name", "First\nSecond", "First\n```js\ncode\n```\nLast"]) {
    const result = formatted(source, 0, source.length, "code")
    assert.equal(result.selected, source)
    assert.equal(formatted(result.value, 0, result.value.length, "code").value, source)
    const tokens = marked.lexer(result.value)
    if (source.includes("\n")) assert.equal(tokens[0].text, source)
    else assert.equal(tokens[0].tokens[0].text, source)
  }
})

test("Markdown image attachments reuse the rich editor serializer and preserve escaped descriptions", () => {
  const address = "https://example.com/a_(2).png#frame=landscape"
  const alt = "A [draft] \\ image"
  const { document } = roundtrip(newsletterImageMarkdown(address, alt))
  assert.equal(document.content[0].content[0].attrs.src, address)
  assert.equal(document.content[0].content[0].attrs.alt, alt)
})
