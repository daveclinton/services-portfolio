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

const { AiAnswerView } = require("../components/portfolio/ai-answer-view.tsx")
const { AiTaskSuggestions } = require("../components/portfolio/ai-task-suggestions.tsx")
const { ProjectScopeForm } = require("../components/portfolio/project-scope-form.tsx")

test("grouped discovery renders accessible navigation and editable task starters", () => {
  const html = renderToStaticMarkup(React.createElement(AiTaskSuggestions, { onChoose() {} }))
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3)
  assert(html.includes('role="tabpanel"'))
  for (const label of ["Explore my work", "Hiring", "Plan a project", "AI systems", "Career timeline"]) assert(html.includes(label))
})

test("all approved interactive views render semantic controls and supporting evidence", () => {
  for (const kind of ["projects", "comparison", "architecture", "timeline", "scope"]) {
    const html = renderToStaticMarkup(React.createElement(AiAnswerView, { view: answerViewFixture(kind), onChange() {}, state: { edits: { goal: "One branch first" } } }))
    assert(html.includes("Explore the answer"), kind)
    assert(html.includes("Supporting material"), kind)
    assert(html.includes("Evidence reviewed 2026-11-24"), kind)
    assert(html.includes("Expand"), kind)
    if (kind === "comparison") assert(html.includes("<table"))
    if (kind === "architecture") assert(html.includes('aria-label="Inspect SAP Business One"'))
    if (kind === "scope") {
      assert(html.includes("One branch first"))
      assert(html.includes("Edited by you"))
      assert(html.includes("David must confirm"))
    }
    if (kind === "timeline") assert(html.includes("2024–2026"))
  }
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
  const html = renderToStaticMarkup(React.createElement(AiAnswerView, { view, onChange() {} }))
  assert(!html.includes("<script>alert("))
  assert(html.includes("&lt;script&gt;"))
})
