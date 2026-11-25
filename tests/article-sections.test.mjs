import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import test from "node:test"
import remarkArticleSections from "../lib/remark-article-sections.mjs"

// Reuse the compiler already installed for the Next MDX loader.
const require = createRequire(import.meta.url)
const mdxRequire = createRequire(require.resolve("@mdx-js/loader"))
const { compile } = await import(pathToFileURL(mdxRequire.resolve("@mdx-js/mdx")).href)

const paragraph = (value) => ({ type: "paragraph", children: [{ type: "text", value }] })
const heading = (value, depth = 2) => ({ type: "heading", depth, children: [{ type: "text", value }] })
const sectionSlug = (node) => node.attributes.find((attribute) => attribute.name === "id").value

test("article grouping preserves imports, exports, intro, nested headings, and rich content", () => {
  const declaration = { type: "mdxjsEsm", value: "export const metadata = {}" }
  const intro = paragraph("Original introduction")
  const code = { type: "code", lang: "js", value: "## Not a section\nconst answer = 42" }
  const visual = { type: "mdxJsxFlowElement", name: "ModelConceptVisual", attributes: [], children: [] }
  const nested = heading("Further details", 3)
  const tree = { type: "root", children: [declaration, intro, heading("1. Build **something**"), code, nested, visual, heading("Build **something**"), paragraph("Second body")] }
  remarkArticleSections()(tree, { path: "/project/content/blog/example.mdx" })
  assert.equal(tree.children[0], declaration)
  const wrapper = tree.children[1]
  assert.equal(wrapper.name, "ArticleSections")
  assert.equal(sectionSlug(wrapper), "article-example")
  assert.deepEqual(wrapper.children.map(sectionSlug), ["introduction", "build-something", "build-something-2"])
  assert.deepEqual(wrapper.children[0].children, [intro])
  assert.deepEqual(wrapper.children[1].children, [code, nested, visual])
})

test("articles without h2 headings remain a single intact section and other MDX is untouched", () => {
  const intro = paragraph("A short article")
  const tree = { type: "root", children: [intro] }
  remarkArticleSections()(tree, { path: "content/blog/short.mdx" })
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[0].children[0].children[0], intro)
  const other = { type: "root", children: [intro, heading("Heading")] }
  const original = structuredClone(other)
  remarkArticleSections()(other, { path: "/project/app/example.mdx" })
  assert.deepEqual(other, original)
})

test("every existing article compiles into numbered sections without dropping original nodes", async () => {
  const directory = new URL("../content/blog/", import.meta.url)
  for (const name of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(new URL(name, directory), "utf8")
    let preserved = false
    const capture = () => (tree, file) => {
      const original = tree.children.filter((node) => !["mdxjsEsm", "definition", "footnoteDefinition"].includes(node.type) && !(node.type === "heading" && node.depth === 2))
      remarkArticleSections()(tree, file)
      const wrapper = tree.children.find((node) => node.name === "ArticleSections")
      assert(wrapper, `${name}: section wrapper missing`)
      const content = wrapper.children.flatMap((section) => section.children)
      assert.deepEqual(content, original, `${name}: article content changed`)
      const slugs = wrapper.children.map(sectionSlug)
      assert.equal(new Set(slugs).size, slugs.length, `${name}: duplicate section IDs`)
      preserved = true
    }
    const output = await compile({ value: source, path: `content/blog/${name}` }, { remarkPlugins: [capture] })
    assert(preserved)
    assert(String(output).includes("ArticleSections"), `${name}: wrapper was not compiled`)
  }
})
