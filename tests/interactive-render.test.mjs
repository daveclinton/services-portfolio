// Render real React components in Node. This uses no DOM, browser, screenshot,
// or additional test dependency; the loader only transpiles this repo's TSX.
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { createRequire, registerHooks } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import test from "node:test"
import vm from "node:vm"
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
    if (url.endsWith("/public/david.webp")) {
      return { format: "commonjs", shortCircuit: true, source: 'exports.default = { src: "/david.webp", width: 40, height: 40 }' }
    }
    if (url.startsWith(pathToFileURL(root).href) && !url.includes("/node_modules/") && /\.tsx?$/.test(url)) {
      return { format: "commonjs", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText }
    }
    return nextLoad(url, context)
  },
})

const { AiAnswerView, AiAnswerContent, EvidenceDetails } = require("../components/portfolio/ai-answer-view.tsx")
const { AiTaskSuggestions } = require("../components/portfolio/ai-task-suggestions.tsx")
const { ProjectScopeForm } = require("../components/portfolio/project-scope-form.tsx")
const { NewsletterSignup, NewsletterConfirmation } = require("../components/portfolio/newsletter-signup.tsx")
const { newsletterAvailable, subscribeToNewsletter } = require("../lib/newsletter.ts")
const { TONE_COLORS, toneScript } = require("../lib/tone.ts")
const { NewsletterStudio } = require("../components/portfolio/newsletter-studio.tsx")
const { studioSession, studioSave, studioAction, studioPreview, nairobiSchedule } = require("../lib/newsletter-studio.ts")
const { Signals } = require("../components/portfolio/signals.tsx")
const { ArticleSections } = require("../components/portfolio/article-sections.tsx")
const { default: LegacyStudioPage } = require("../app/(standard)/admin/newsletters/page.tsx")

test("the old desk link redirects to Writing while preserving a failed login", async () => {
  for (const [query, target] of [[{}, "/admin/writing"], [{ login: "failed" }, "/admin/writing?login=failed"]]) {
    await assert.rejects(() => LegacyStudioPage({ searchParams: Promise.resolve(query) }), (error) => error.digest?.includes(target))
  }
})

test("admin boot uses the neutral theme while public pages retain the saved signal color", () => {
  for (const path of ["/admin/writing", "/admin/newsletters", "/blog"]) {
    const attributes = new Map([["data-tone", "0"]])
    const icons = [], meta = { content: "#1557c0", setAttribute(name, value) { this.content = value } }
    const document = {
      documentElement: { setAttribute: (key, value) => attributes.set(key, value), removeAttribute: (key) => attributes.delete(key), getAttribute: (key) => attributes.get(key), hasAttribute: (key) => attributes.has(key) },
      head: { appendChild: (element) => icons.push(element) }, body: {}, readyState: "complete",
      createElement: () => ({ setAttribute() {} }),
      querySelectorAll: (selector) => selector.startsWith("meta") ? [meta] : icons,
    }
    vm.runInNewContext(toneScript, { document, location: { pathname: path, hash: "" }, localStorage: { getItem: () => "3" }, getComputedStyle: () => ({ backgroundColor: "rgb(251, 250, 248)" }), MutationObserver: class { observe() {} } }, { timeout: 1000 })
    assert.equal(attributes.get("data-tone"), path.startsWith("/admin/") ? undefined : "3")
    assert.equal(meta.content, path.startsWith("/admin/") ? "rgb(251, 250, 248)" : TONE_COLORS[3])
  }
})

test("leaving the writing desk restores the public palette without overwriting its preference", () => {
  const source = ts.transpileModule(readFileSync(new URL("../components/portfolio/site-nav.tsx", import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  const attributes = new Map([["data-tone", "2"]]), effects = [], exports = {}
  const modules = {
    react: { useLayoutEffect: (effect) => effects.push(effect) },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
    "next/link": { default: "a" }, "next/navigation": { usePathname: () => "/admin/writing" },
    "@/lib/portfolio-data": { askAi: { href: "/ask-ai" }, site: { name: "David" } },
    "@/lib/tone": { TONE_STORAGE_KEY: "site-tone", toneOf: (index) => String(index % TONE_COLORS.length) },
  }
  vm.runInNewContext(source, { exports, require: (name) => modules[name], document: { documentElement: { getAttribute: (key) => attributes.get(key), removeAttribute: (key) => attributes.delete(key), setAttribute: (key, value) => attributes.set(key, value) } }, localStorage: { getItem: () => "4" } })
  exports.SiteNav()
  const cleanup = effects[0]()
  assert(!attributes.has("data-tone"))
  cleanup()
  assert.equal(attributes.get("data-tone"), "4")
})


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

test("newsletter begins with one invitation and a start button, without mounting later steps", () => {
  const html = renderToStaticMarkup(React.createElement(NewsletterSignup))
  assert.equal((html.match(/<button/g) ?? []).length, 1)
  assert(html.includes("Subscribe"))
  assert(html.includes("Subscribe to my weekly newsletter for instant updates."))
  assert(!html.includes("<form"))
  assert(!html.includes("<input"))
  assert(!html.includes("Unsubscribe anytime"))
  assert(!html.includes('href="/privacy"'))
  assert(!html.includes("1 of 2"))
  const embedded = renderToStaticMarkup(React.createElement(NewsletterSignup, { showHeading: false }))
  assert(!embedded.includes("<h2"))
  assert.equal((embedded.match(/<button/g) ?? []).length, 1)
  const confirmation = renderToStaticMarkup(React.createElement(NewsletterConfirmation))
  assert(confirmation.includes("You’re in."))
  assert(confirmation.includes("Back to reading"))
  const email = readFileSync(new URL("../backend/internal/sendy/templates/note.html", import.meta.url), "utf8")
  assert(email.includes(TONE_COLORS[0]))
  assert(email.includes("Georgia,'Times New Roman',serif"))
})

test("newsletter endings show only the actual result and its next action", () => {
  const pending = renderToStaticMarkup(React.createElement(NewsletterConfirmation, { status: "pending", onChangeEmail() {} }))
  assert(pending.includes("Check your inbox."))
  assert(pending.includes("Spam/Junk"))
  assert(!pending.includes("already subscribed"))
  assert(!pending.includes("Still no email?"))
  const subscribed = renderToStaticMarkup(React.createElement(NewsletterConfirmation, { status: "subscribed" }))
  assert(subscribed.includes("You’re already subscribed."))
  assert(!subscribed.includes("Check your inbox"))
  assert(!subscribed.includes("Spam/Junk"))
  const suppressed = renderToStaticMarkup(React.createElement(NewsletterConfirmation, { status: "suppressed" }))
  assert(suppressed.includes("Contact David to subscribe"))
  assert(suppressed.includes('href="mailto:'))
  assert(!suppressed.includes("You’re already subscribed"))
  assert(!suppressed.includes("Check your inbox"))
})

test("newsletter requests explicitly opt in and only report a pending confirmation", async (t) => {
  const requests = []
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options })
    return new Response(JSON.stringify(url.endsWith("/status") ? { enabled: true } : { status: "pending" }), { status: url.endsWith("/status") ? 200 : 202 })
  })
  assert.equal(await newsletterAvailable(), true)
  assert.equal(await subscribeToNewsletter(" reader@example.com "), "pending")
  assert(requests[1].url.endsWith("/newsletter/subscribe"))
  assert.deepEqual(JSON.parse(requests[1].options.body), { email: "reader@example.com", consent: true, website: "" })
  assert.equal(requests[1].options.cache, "no-store")
})

test("newsletter client preserves confirmed-membership and suppressed results", async (t) => {
  let status = "subscribed"
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ status }), { status: 202 }))
  assert.equal(await subscribeToNewsletter("reader@example.com"), "subscribed")
  status = "suppressed"
  assert.equal(await subscribeToNewsletter("reader@example.com"), "suppressed")
})

test("newsletter failures and malformed success responses do not pretend to subscribe", async (t) => {
  let response = new Response("Unavailable", { status: 503 })
  t.mock.method(globalThis, "fetch", async () => response)
  await assert.rejects(() => subscribeToNewsletter("reader@example.com"), /unavailable/)
  response = new Response(JSON.stringify({ status: "confirmed" }), { status: 200 })
  await assert.rejects(() => subscribeToNewsletter("reader@example.com"), /couldn’t confirm/)
  response = new Response("{}", { status: 429 })
  await assert.rejects(() => subscribeToNewsletter("reader@example.com"), /wait a little/)
})

const studioDraft = { id: "a5cd8282-68f1-4b4a-9c19-000000000001", subject: "A note", markdown: "Hello", revision: 1, state: "draft", campaign_id: 0, scheduled_at: null, tested_revision: 0, last_error: "", updated_at: "2026-11-25T09:00:00Z" }

test("newsletter studio mounts no private data or send controls before owner verification", () => {
  const html = renderToStaticMarkup(React.createElement(NewsletterStudio))
  assert(html.includes("Loading your posts"))
  assert(!html.includes("<textarea"))
  assert(!html.includes("Confirm send"))
  assert(!html.includes("A note"))
})

test("studio writes include credentials, CSRF and revision, and confirm actual saved content", async (t) => {
  let seen
  t.mock.method(globalThis, "fetch", async (url, options) => {
    seen = { url, options }
    return new Response(JSON.stringify({ ...studioDraft, subject: "Updated", markdown: "New body", revision: 2 }))
  })
  const result = await studioSave("csrf-token", studioDraft, "Updated", "New body")
  assert.equal(result.revision, 2)
  assert.equal(seen.options.credentials, "include")
  assert.equal(seen.options.headers["X-CSRF-Token"], "csrf-token")
  assert.deepEqual(JSON.parse(seen.options.body), { subject: "Updated", markdown: "New body", revision: 1 })
})

test("studio rejects stale save acknowledgements, stale previews and invalid sign-in responses", async (t) => {
  let body = studioDraft
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(body)))
  await assert.rejects(() => studioSave("csrf", studioDraft, "Updated", "New body"), /not confirmed as saved/)
  body = { html: "<p>Old</p>", revision: 0 }
  await assert.rejects(() => studioPreview("csrf", studioDraft), /latest saved/)
  body = { authenticated: true, configured: true, csrf: "", login: "owner" }
  await assert.rejects(() => studioSession(), /sign-in/)
})

test("studio never interprets submitted or unknown delivery states as sent", async (t) => {
  let body = { ...studioDraft, state: "sending", campaign_id: 41 }
  let seen
  t.mock.method(globalThis, "fetch", async (url, options) => { seen = { url, options }; return new Response(JSON.stringify(body)) })
  assert.equal((await studioAction("csrf", studioDraft, "send")).state, "sending")
  assert(seen.url.endsWith("/send"))
  assert.equal(JSON.parse(seen.options.body).revision, 1)
  body = { ...body, state: "maybe-sent" }
  await assert.rejects(() => studioAction("csrf", studioDraft, "refresh"), /saved newsletter/)
})

test("studio preserves conflict messages and requires an explicit valid Nairobi schedule", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Reload this changed draft." }), { status: 409 }))
  await assert.rejects(() => studioSave("csrf", studioDraft, "Changed", "Body"), /Reload this changed draft/)
  assert.equal(nairobiSchedule("2100-01-15T12:30"), "2100-01-15T09:30:00.000Z")
  for (const invalid of ["", "2100-02-30T12:00", "2020-01-01T12:00", "2100-01-15T12:30Z"]) assert.throws(() => nairobiSchedule(invalid))
})


test("shared lists start completely closed and the next control starts at item zero", () => {
  const items = [
    { slug: "first", title: "First item", body: "First body" },
    { slug: "second", title: "Second item", body: "Second body" },
  ]
  for (const id of ["home", "experience", "writing"]) {
    const html = renderToStaticMarkup(React.createElement(Signals, { id, items, listPath: "/", basePath: "", footer: "Contact" }))
    assert.equal((html.match(/<details\b/g) ?? []).length, 2)
    assert(!/<details\b[^>]*\bopen(?:=|\s|>)/.test(html))
    assert(html.includes("Next: First item"))
  }
  for (const initial of [0, 1]) {
    const html = renderToStaticMarkup(React.createElement(Signals, { id: "home", items, listPath: "/", basePath: "", initial, footer: "Contact" }))
    assert.equal((html.match(/<details[^>]* open=""/g) ?? []).length, 1)
    const target = html.slice(html.indexOf(`id="${items[initial].slug}"`))
    assert(/^id="[^"]+"><details[^>]* open=""/.test(target))
    assert(html.includes(`Next: ${items[(initial + 1) % 2].title}`))
  }
})

test("articles reuse the closed numbered list and preserve rich section content", () => {
  const html = renderToStaticMarkup(React.createElement(ArticleSections, { id: "article-example" }, [
    React.createElement("section", { key: "intro", id: "introduction", "data-section-title": "Introduction" }, React.createElement("p", null, "Original introduction")),
    React.createElement("section", { key: "content", id: "example", "data-section-title": "An example" }, React.createElement("pre", null, React.createElement("code", null, "const amount = 42")), React.createElement("details", null, React.createElement("summary", null, "Study units"), "Supporting material")),
  ]))
  assert.equal((html.match(/name="article-example"/g) ?? []).length, 2)
  assert(!/<details\b[^>]*\bopen(?:=|\s|>)/.test(html))
  for (const value of ["00.", "01.", "Original introduction", "const amount = 42", "Study units", "Supporting material", "All writing", "Next: Introduction"]) assert(html.includes(value))
  assert(html.includes('id="example"'))
})

test("article section links and selections preserve the page color while other lists still change it", () => {
  const article = ArticleSections({ id: "article-example", children: [
    React.createElement("section", { key: "intro", id: "introduction", "data-section-title": "Introduction" }, "Intro"),
    React.createElement("section", { key: "example", id: "example", "data-section-title": "Example" }, "Body"),
  ] })
  const source = ts.transpileModule(readFileSync(new URL("../components/portfolio/signals.tsx", import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const props of [article.props, { ...article.props, changeTone: undefined }]) {
    const effects = [], colors = [], saved = [], addresses = []
    const exports = {}
    const location = { hash: "#introduction", href: "https://example.com/blog/example#introduction" }
    const modules = {
      react: { useState: (initial) => [initial, () => {}], useRef: (current) => ({ current }), useEffect: (effect) => effects.push(effect) },
      "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      "next/image": { default: "img" }, "next/navigation": { usePathname: () => "/blog/example" },
      "@/lib/tone": { TONE_STORAGE_KEY: "site-tone", toneOf: (index) => String(index % 6) },
      "@/lib/scroll": { revealAfterLayout: () => () => {} }, "@/public/david.webp": { default: {} },
    }
    vm.runInNewContext(source, { exports, URL, require(name) { assert(name in modules, name); return modules[name] },
      document: { documentElement: { setAttribute: (key, value) => colors.push([key, value]) } },
      localStorage: { setItem: (key, value) => saved.push([key, value]) },
      window: { location, addEventListener() {}, removeEventListener() {}, history: { replaceState: (_, __, address) => addresses.push(address) } },
    })
    const tree = exports.Signals(props)
    const ol = tree.props.children[0]
    const entries = ol.props.children.map(() => ({ open: false, querySelector: () => ({}) }))
    ol.props.ref.current = { querySelectorAll: () => entries }
    effects.forEach((effect) => effect())
    assert.equal(entries[0].open, true, "a linked section opens without changing the article color")
    const details = ol.props.children[1].props.children
    details.props.children[0].props.onClick()
    entries[0].open = false
    entries[1].open = true
    details.props.onToggle({ target: entries[1], currentTarget: entries[1] })
    assert.equal(addresses.at(-1), "/blog/example#example")
    if (props.changeTone === false) {
      assert.equal(colors.length, 0)
      assert.equal(saved.length, 0)
    } else {
      assert.equal(colors.at(-1)[1], "1")
      assert.equal(saved.at(-1)[1], "1")
    }
  }
})
