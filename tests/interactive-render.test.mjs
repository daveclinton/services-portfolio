// Render real React components in Node. This uses no DOM, browser, screenshot,
// or additional test dependency; the loader only transpiles this repo's TSX.
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import test from "node:test"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { answerViewFixture } from "./fixtures/answer-views.mjs"

const root = fileURLToPath(new URL("../", import.meta.url))
const require = createRequire(import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    let candidate
    if (specifier.startsWith("@/")) candidate = root + specifier.slice(2)
    else if (specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(root).href)) candidate = fileURLToPath(new URL(specifier, context.parentURL))
    if (candidate) {
      for (const extension of ["", ".ts", ".tsx"]) if (existsSync(candidate + extension)) return nextResolve(candidate + extension, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith(pathToFileURL(root).href) && !url.includes("/node_modules/") && /\.tsx?$/.test(url)) {
      return { format: "commonjs", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText }
    }
    return nextLoad(url, context)
  },
})

const { AiAnswerView, AiAnswerContent, EvidenceDetails } = require("../components/portfolio/ai-answer-view.tsx")
const { AiTaskSuggestions } = require("../components/portfolio/ai-task-suggestions.tsx")
const { ProjectScopeForm } = require("../components/portfolio/project-scope-form.tsx")

test("discovery starts with only three categories and reveals one group at a time", () => {
  const props = { groupId: null, onGroupChange() {}, onChoose() {} }
  const html = renderToStaticMarkup(React.createElement(AiTaskSuggestions, props))
  assert.equal((html.match(/<button/g) ?? []).length, 3)
  for (const label of ["Explore my work", "Hiring", "Plan a project"]) assert(html.includes(label))
  for (const label of ["AI systems", "Career timeline", "Business outcomes", "Compare a role", "Follow a project from the problem"]) assert(!html.includes(label))
  assert(!html.includes('viewBox="0 0 640 220"'))

  const explore = renderToStaticMarkup(React.createElement(AiTaskSuggestions, { ...props, groupId: "explore" }))
  assert(explore.includes("Back to all tasks"))
  for (const label of ["AI systems", "Career timeline", "Business outcomes", "Architecture"]) assert(explore.includes(label))
  assert(!explore.includes("Prepare an interview"))
  assert(!explore.includes("Explore the assistants and automation"))

  const hiring = renderToStaticMarkup(React.createElement(AiTaskSuggestions, { ...props, groupId: "hiring" }))
  assert(hiring.includes("Compare a role"))
  assert(!hiring.includes("AI systems"))
  assert(!hiring.includes("Scope an idea"))
})

test("result cards preview choices and offer direct sources without mounting full details", () => {
  for (const kind of ["projects", "comparison", "architecture", "timeline", "scope"]) {
    const html = renderToStaticMarkup(React.createElement(AiAnswerView, { view: answerViewFixture(kind), onChange() {}, state: { edits: { goal: "One branch first" } } }))
    assert(html.includes("Explore the answer"))
    assert(html.includes("<dialog"))
    assert(!html.includes("Supporting material"))
    assert(html.includes('aria-label="Result preview"'))
    assert(html.includes("Sources (1)"))
    assert(html.includes("Order processing") || kind === "scope")
    assert(!html.includes("The integration keeps uncertain records for human review."))
    assert(!html.includes("One branch first"))
    assert(!html.includes("<textarea"))
    assert(!html.includes('aria-label="Inspect SAP Business One"'))
  }
})

test("project previews are bounded and source counts include only referenced passages", () => {
  const view = answerViewFixture()
  view.items.push(...[3, 4].map((index) => ({ ...view.items[0], id: `project-${index}`, title: `Project ${index}` })))
  view.evidence.push({ id: 2, title: "Unused retrieval result", excerpt: "Unreferenced passage", links: [] })
  const html = renderToStaticMarkup(React.createElement(AiAnswerView, { view, onChange() {} }))
  assert(html.includes("4 projects"))
  assert(html.includes("View contributions and evidence"))
  assert(html.includes("Published contribution with a bounded outcome."))
  assert(html.includes("Project 3"))
  assert(!html.includes("Project 4"))
  assert(html.includes("Sources (1)"))
  assert(!html.includes("Unused retrieval result"))

  const sources = renderToStaticMarkup(React.createElement(EvidenceDetails, { ids: [1], view, open: true }))
  assert(sources.includes('<details open=""'))
  assert(sources.includes("Referenced by: Order processing; SAP Business One"))
  assert(sources.includes(view.evidence[0].excerpt))
  assert(sources.includes("Evidence reviewed 2026-11-24"))
  assert(!sources.includes("Unreferenced passage"))
})

test("opened results disclose one selected item and retain evidence and saved edits", () => {
  for (const kind of ["projects", "comparison", "architecture", "timeline", "scope"]) {
    const view = answerViewFixture(kind)
    view.items[1].summary = "Unopened item details stay hidden"
    const html = renderToStaticMarkup(React.createElement(AiAnswerContent, { view, onChange() {}, state: { selectedId: kind === "scope" ? "goal" : "orders", edits: { goal: "One branch first" } } }))
    assert(html.includes("Supporting material"), kind)
    assert(html.includes("Evidence reviewed 2026-11-24"), kind)
    assert(!html.includes("Unopened item details stay hidden"), kind)
    if (kind !== "architecture") assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 1)
    if (kind === "comparison") assert(html.includes("Related experience"))
    if (kind === "architecture") assert(html.includes('aria-label="Inspect SAP Business One"'))
    if (kind === "scope") {
      assert(html.includes("One branch first"))
      assert(html.includes("Edited by you"))
      assert(html.includes("David must confirm"))
    }
    if (kind === "timeline") assert(html.includes("2024–2026"))
  }
})

test("plain answers offer source inspection without a result card or eagerly mounted excerpts", () => {
  const view = { ...answerViewFixture("text"), items: [], connections: [] }
  const html = renderToStaticMarkup(React.createElement(AiAnswerView, { view, onChange() {} }))
  assert(html.includes('aria-label="Answer sources"'))
  assert(html.includes("Inspect sources (1)"))
  assert(html.includes("<dialog"))
  assert(!html.includes('data-slot="card"'))
  assert(!html.includes('aria-label="Result preview"'))
  assert(!html.includes(view.evidence[0].excerpt))

  const sources = renderToStaticMarkup(React.createElement(EvidenceDetails, { ids: [1], view, open: true }))
  assert(sources.includes("Retrieved passages (1)"))
  assert(sources.includes("They do not verify every statement in the answer."))
  assert(sources.includes(view.evidence[0].excerpt))
  assert(sources.includes('href="https://example.com/project"'))
  assert(sources.includes("Evidence reviewed 2026-11-24"))
  assert(!sources.includes("Referenced by:"))
})

test("plain answers without retrieved material do not advertise an empty inspector", () => {
  const view = { ...answerViewFixture("text"), items: [], connections: [], evidence: [] }
  assert.equal(renderToStaticMarkup(React.createElement(AiAnswerView, { view, onChange() {} })), "")
})

test("discovery seeds are editable and no unreviewed answer is sent by rendering", () => {
  let submitted = false
  const html = renderToStaticMarkup(React.createElement(ProjectScopeForm, { initialProblem: "Connect our order systems", onGenerate() { submitted = true }, onCancel() {}, consent: null }))
  assert.equal((html.match(/<textarea/g) ?? []).length, 1)
  assert(html.includes("Connect our order systems"))
  assert(html.includes("Question 1 of 6"))
  assert.equal(submitted, false)
})

test("generated text remains escaped React content", () => {
  const view = answerViewFixture()
  view.items[0].title = "<script>alert('unsafe')</script>"
  const html = renderToStaticMarkup(React.createElement(AiAnswerContent, { view, onChange() {}, state: { selectedId: "orders" } }))
  assert(!html.includes("<script>alert("))
  assert(html.includes("&lt;script&gt;"))
})
