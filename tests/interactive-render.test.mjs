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
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js"
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
const { studioSession, studioSave, studioAction, studioPreview, studioFromPost, studioUpload, studioPublish, nairobiSchedule, safeReturnPath, studioSignInHref, studioLoginHref, studioLoginURL } = require("../lib/newsletter-studio.ts")
const { Signals } = require("../components/portfolio/signals.tsx")
const { ArticleSections } = require("../components/portfolio/article-sections.tsx")
const { default: LegacyStudioPage } = require("../app/(desk)/admin/writing/page.tsx")
const { AdminShell } = require("../components/portfolio/admin-shell.tsx")
const { SelectField } = require("../components/ui/select.tsx")
const { PublishedPostContent } = require("../components/portfolio/published-post-content.tsx")

test("the writing shortcut redirects to Posts, and a failed login to the sign-in page", async () => {
  for (const [query, target] of [[{}, "/admin/posts"], [{ login: "failed" }, "/admin/signin?login=failed"]]) {
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
  const source = ts.transpileModule(readFileSync(new URL("../lib/tone.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const attributes = new Map([["data-tone", "2"]]), exports = {}
  vm.runInNewContext(source, { exports, require: () => require("../lib/mark.ts"), document: { documentElement: { getAttribute: (key) => attributes.get(key), removeAttribute: (key) => attributes.delete(key), setAttribute: (key, value) => attributes.set(key, value) } }, localStorage: { getItem: () => "4" } })
  const cleanup = exports.enterAdminTheme()
  assert(!attributes.has("data-tone"))
  cleanup()
  assert.equal(attributes.get("data-tone"), "4")
})

test("the admin shell has content navigation and a closed profile menu without public navigation", () => {
  const html = renderToStaticMarkup(React.createElement(AdminShell, { section: "posts", session: { authenticated: true, login: "daveclinton" }, loading: false, busy: false, onNavigate: async () => {}, onLogout() {} }, "Post content"))
  assert(html.includes('href="/admin/posts"'))
  assert(html.includes('href="/admin/newsletters"'))
  assert(html.includes('aria-label="Open profile menu"'))
  assert(html.includes('class="admin-sidebar-footer"'))
  assert(!html.includes("Sign out"), "account actions stay inside the closed profile menu")
  assert(!html.includes("Experience"))
  assert(!html.includes("Ask AI"))
  assert(!html.includes("Blog publishing comes next"))
})

test("shared select fields use an accessible custom trigger rather than a native select", () => {
  const html = renderToStaticMarkup(React.createElement(SelectField, { ariaLabel: "Text style", value: "paragraph", options: [{ value: "paragraph", label: "Paragraph" }], onValueChange() {} }))
  assert(html.includes('role="combobox"'))
  assert(html.includes("Paragraph"))
  assert(!html.includes("<select"))
})

test("newsletter creation sends a published URL to the backend and uses the saved server document", async(t) => {
  let sent
  t.mock.method(globalThis,"fetch",async(url,options)=>{sent={url,options};return Response.json(studioDraft)})
  const draft=await studioFromPost("owner-csrf","published-article")
  assert.equal(draft.id,studioDraft.id)
  assert(sent.url.endsWith("/from-post"))
  assert.deepEqual(JSON.parse(sent.options.body),{slug:"published-article"})
  assert.equal(sent.options.headers["X-CSRF-Token"],"owner-csrf")
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
  // Emails follow the reader's own light or dark mail theme rather than the site's colour.
  assert(!email.includes(TONE_COLORS[0]) && !email.includes("background-color") && email.includes('content="light dark"'))
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

test("without Cloudinary, uploads keep using the API's own storage and its limits", async (t) => {
 const calls = []
 t.mock.method(globalThis, "fetch", async (url, options) => { calls.push({ url: String(url), options }); return Response.json(String(url).endsWith("/media/sign") ? { configured: false } : { url: "https://api.example.com/media/image" }) })
 await assert.rejects(() => studioUpload("csrf", new File(["<svg/>"], "image.svg", { type: "image/svg+xml" })), /set up Cloudinary/)
 assert.deepEqual(calls.map((call) => call.url.split("/admin/newsletters/")[1]), ["media/sign"], "nothing is uploaded once the fallback refuses")
 const url = await studioUpload("csrf", new File(["png bytes"], "image.png", { type: "image/png" }))
 assert.equal(url, "https://api.example.com/media/image")
 const sent = calls.at(-1).options
 assert(sent.body instanceof FormData)
 assert.equal(sent.headers["Content-Type"], undefined, "fetch supplies the multipart boundary")
 assert.equal(sent.headers["X-CSRF-Token"], "csrf")
 assert.equal(sent.credentials, "include")
})

test("with Cloudinary, any image goes straight to it with the signed parameters, and only its own address is accepted", async (t) => {
 const params = { allowed_formats: "avif,gif,heic,heif,jpeg,jpg,png,webp", folder: "blog", public_id: "a5cd8282-68f1-4b4a-9c19-000000000001", timestamp: "1700000000" }
 let uploaded, reply = { secure_url: `https://res.cloudinary.com/my-cloud/image/upload/v17/blog/${params.public_id}.heic` }
 t.mock.method(globalThis, "fetch", async (url, options) => {
  if (String(url).endsWith("/media/sign")) { assert.equal(options.headers["X-CSRF-Token"], "csrf"); return Response.json({ configured: true, cloud_name: "my-cloud", api_key: "123", signature: "sig", params }) }
  uploaded = { url: String(url), options }
  return Response.json(reply)
 })
 const huge = new File([new Uint8Array(12 * 1024 * 1024)], "phone.heic", { type: "image/heic" })
 assert.equal(await studioUpload("csrf", huge), reply.secure_url, "large and uncommon formats are not refused by the desk")
 assert.equal(uploaded.url, "https://api.cloudinary.com/v1_1/my-cloud/image/upload")
 assert.equal(uploaded.options.credentials, undefined, "no desk cookie goes to Cloudinary")
 const form = Object.fromEntries([...uploaded.options.body.entries()].filter(([name]) => name !== "file"))
 assert.deepEqual(form, { api_key: "123", signature: "sig", ...params })
 for (const address of ["https://res.cloudinary.com/other-cloud/image/upload/v17/blog/x.jpg", `https://res.cloudinary.com/my-cloud/image/upload/v17/elsewhere/${params.public_id}.jpg`, "https://evil.example/x.jpg"]) {
  reply = { secure_url: address }
  await assert.rejects(() => studioUpload("csrf", huge), /confirm/, address)
 }
 reply = { error: { message: "Invalid image file" } }
 t.mock.method(globalThis, "fetch", async (url) => String(url).endsWith("/media/sign") ? Response.json({ configured: true, cloud_name: "my-cloud", api_key: "123", signature: "sig", params }) : Response.json(reply, { status: 400 }))
 await assert.rejects(() => studioUpload("csrf", huge), /Cloudinary: Invalid image file/)
})

test("every image is contained in a padded frame without cropping, with responsive Cloudinary derivatives", () => {
 const { framedSource, frameOf, withFrame } = require("../lib/image-frames.ts")
 const { FramedImage } = require("../components/portfolio/framed-image.tsx")
 const cloud = "https://res.cloudinary.com/my-cloud/image/upload/v17/blog/x.jpg"
 assert.equal(frameOf(cloud), "landscape", "images without a frame use Landscape")
 assert.equal(frameOf(`${cloud}#frame=bogus`), "landscape")
 assert.equal(withFrame(`${cloud}#frame=wide`, "portrait"), `${cloud}#frame=portrait`)
 const wide = framedSource(`${cloud}#frame=wide`)
 assert.equal(wide.src, "https://res.cloudinary.com/my-cloud/image/upload/c_pad,ar_16:9,b_transparent,w_960/f_auto,q_auto/v17/blog/x.jpg")
 assert.equal(wide.srcSet.split(", ").length, 5)
 assert.match(wide.srcSet, /w_1840\/f_auto,q_auto\/v17\/blog\/x\.jpg 1840w$/)
 assert.equal(wide.height / wide.width, 9 / 16, "space is reserved in the frame's shape")
 const square = framedSource(`${cloud}#frame=square`)
 assert.equal(square.sizes, "(min-width: 1280px) 607px, 66vw", "taller frames are shown narrower")
 const local = framedSource("https://api.example.com/media/abc#frame=portrait")
 assert.equal(local.src, "https://api.example.com/media/abc")
 assert.equal(local.srcSet, undefined)
 const html = renderToStaticMarkup(React.createElement(FramedImage, { src: `${cloud}#frame=portrait`, alt: "A phone" }))
 assert.match(html, /data-frame="portrait"/)
 assert.match(html, /class="framed-image"/)
 assert.match(html, /alt="A phone"/)
 const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
 for (const rule of [/\.framed-image\[data-frame="wide"\][^{]*\{\s*aspect-ratio: 16 \/ 9;/, /\[data-frame="square"\][^{]*\{\s*width: 66%;\s*aspect-ratio: 1 \/ 1;/, /\[data-frame="portrait"\][^{]*\{\s*width: 56%;\s*aspect-ratio: 4 \/ 5;/, /:is\(\.framed-image, \.blog-prose img, \.newsletter-editor img\) \{[^}]*aspect-ratio: 3 \/ 2;[^}]*object-fit: contain;/]) assert.match(css, rule)
 assert.match(css, /bg-muted p-4 shadow-sm sm:p-6/, "the canvas reuses the theme and spacing tokens")
})

test("article Markdown renders its images framed on the public page, preview and live view", () => {
 const { PostMarkdown } = require("../components/portfolio/published-post-content.tsx")
 const html = renderToStaticMarkup(React.createElement(PostMarkdown, { markdown: "![Chart](https://res.cloudinary.com/my-cloud/image/upload/v17/blog/c.png#frame=wide)" }))
 assert.match(html, /data-frame="wide"/)
 assert.match(html, /srcSet="[^"]*c_pad,ar_16:9/i)
})

test("publication requires acknowledgement of the saved revision",async(t)=>{
 let body={...studioDraft,slug:"a-note",published_revision:0}
 t.mock.method(globalThis,"fetch",async()=>Response.json(body))
 await assert.rejects(()=>studioPublish("csrf",studioDraft,"a-note","Summary"),/not confirmed/)
 body={...body,published_revision:1}
 assert.equal((await studioPublish("csrf",studioDraft,"a-note","Summary")).published_revision,1)
})

test("newsletter studio mounts no private data or send controls before owner verification", () => {
  const html = renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){}}},React.createElement(NewsletterStudio)))
  assert(html.includes('aria-label="Loading posts"'))
  assert(html.includes('data-slot="skeleton"'))
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

test("database articles retain sections, tables and trusted imported widgets without evaluating arbitrary MDX",()=>{
 const markdown='Intro **text**.\n\n## First section\n\n| A | B |\n| --- | --- |\n| One | Two |\n\n```portfolio-widget\n'+JSON.stringify({name:"YouTubePreview",props:{videoId:"v12aSIZIXUs",title:"A video"}})+'\n```\n\n## First section\n\n<script>alert(1)</script>'
 const html=renderToStaticMarkup(React.createElement(PublishedPostContent,{slug:"stored-post",markdown}))
 for(const value of ['id="first-section"','id="first-section-2"',"<strong>text</strong>","<table>","youtube-nocookie.com/embed/v12aSIZIXUs"])assert(html.includes(value),value)
 assert(!html.includes("<script>"))
 const imported=JSON.parse(readFileSync(new URL("../backend/internal/studio/posts.json",import.meta.url),"utf8"))
 const models=imported.find((post)=>post.slug==="understanding-ai-models")
 const modelHtml=renderToStaticMarkup(React.createElement(PublishedPostContent,{slug:models.slug,markdown:models.markdown}))
 assert(modelHtml.includes("Study this at university"))
 assert(modelHtml.includes("Artificial Intelligence Applications"))
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

test("the desk pager reports the visible range and stops at both ends", () => {
  const { TablePager } = require("../components/portfolio/table-pager.tsx")
  const html = renderToStaticMarkup(React.createElement(TablePager, { first: 20, shown: 5, total: 25, page: 1, pages: 2, onPage() {} }))
  assert(html.includes("21–25 of 25"))
  assert(html.includes("Page 2 of 2"))
  const button = (label) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))[0]
  assert.match(button("Next page"), / disabled=""/)
  assert.doesNotMatch(button("Previous page"), / disabled=""/)
})

test("contacts are read only from a validated owner response", async (t) => {
  const { studioContacts } = require("../lib/newsletter-studio.ts")
  let body = { contacts: [{ email: "reader@example.com", status: "subscribed", joined_at: "2026-11-20T10:00:00Z", confirmed_at: "2026-11-20T10:05:00Z" }], limit: 5000 }, seen
  t.mock.method(globalThis, "fetch", async (url, options) => { seen = { url, options }; return Response.json(body) })
  assert.equal((await studioContacts()).contacts[0].email, "reader@example.com")
  assert(seen.url.endsWith("/admin/newsletters/contacts"))
  assert.equal(seen.options.credentials, "include")
  body = { contacts: [{ email: "x@example.com", status: "everyone", joined_at: "", confirmed_at: null }], limit: 5000 }
  await assert.rejects(() => studioContacts(), /contacts/)
})

test("the admin shell links to contacts", () => {
  const html = renderToStaticMarkup(React.createElement(AdminShell, { section: "contacts", session: { authenticated: true, login: "owner" }, loading: false, busy: false, onNavigate: async () => {}, onLogout() {} }, "List"))
  assert.match(html, /href="\/admin\/contacts" aria-current="page"/)
})

test("recipient choices must come back exactly as chosen", async (t) => {
  const { studioRecipients } = require("../lib/newsletter-studio.ts")
  let body = { ...studioDraft, recipients: ["a@example.com"] }, sent
  t.mock.method(globalThis, "fetch", async (_url, options) => { sent = JSON.parse(options.body); return Response.json(body) })
  assert.deepEqual((await studioRecipients("csrf", studioDraft, ["A@example.com"])).recipients, ["a@example.com"])
  assert.deepEqual(sent, { revision: 1, recipients: ["A@example.com"] })
  body = { ...studioDraft, recipients: null }
  await assert.rejects(() => studioRecipients("csrf", studioDraft, ["a@example.com"]), /not confirmed/)
})

test("table sort settings read safely from the address and keep defaults out of it", () => {
  const { readSort, readPage, nextSort } = require("../lib/desk-url.ts")
  const keys = ["email", "status", "date"], dir = (key) => key === "date" ? "desc" : "asc"
  assert.deepEqual(readSort(new URLSearchParams("sort=email&dir=desc"), keys, "date", dir), { key: "email", dir: "desc" })
  assert.deepEqual(readSort(new URLSearchParams("sort=password&dir=sideways"), keys, "date", dir), { key: "date", dir: "desc" })
  assert.equal(readPage(new URLSearchParams("page=-4")), 0)
  assert.equal(readPage(new URLSearchParams("page=3")), 2)
  assert.deepEqual(nextSort({ key: "date", dir: "desc" }, "email", "date", dir), { sort: "email", dir: null, page: null })
  assert.deepEqual(nextSort({ key: "date", dir: "desc" }, "date", "date", dir), { sort: "date", dir: "asc", page: null })
  assert.deepEqual(nextSort({ key: "date", dir: "asc" }, "date", "date", dir), { sort: null, dir: null, page: null })
})

test("sortable headers announce only the sorted column", () => {
  const { SortHeader } = require("../components/portfolio/sort-header.tsx")
  const on = renderToStaticMarkup(React.createElement("tr", null, React.createElement(SortHeader, { label: "Email", active: true, dir: "asc", onSort() {} })))
  const off = renderToStaticMarkup(React.createElement("tr", null, React.createElement(SortHeader, { label: "Date", active: false, dir: "asc", onSort() {} })))
  assert.match(on, /<th scope="col" aria-sort="ascending"><button type="button"/)
  assert(!off.includes("aria-sort"))
})

test("wide code and tables in rendered Markdown scroll inside themselves on small screens", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
  const rule = (selector) => css.match(new RegExp(`${selector.replace(/[.*]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? ""
  assert.match(rule(".chat-markdown pre"), /overflow-x: auto/)
  assert.match(rule(".chat-markdown table"), /overflow-x: auto/)
  assert.match(rule(".chat-markdown table"), /display: block/)
})

test("phones keep document actions in the header and the date beside each title", () => {
  const html = renderToStaticMarkup(React.createElement(AdminShell, { section: "posts", title: "A long article title", compactTitle: true, session: { authenticated: true, login: "owner" }, loading: false, busy: false, onNavigate: async () => {}, onLogout() {} }, "Body"))
  assert.match(html, /max-sm:sr-only[^>]*>A long article title/)
  const list = renderToStaticMarkup(React.createElement(AdminShell, { section: "posts", title: "Posts", session: { authenticated: true, login: "owner" }, loading: false, busy: false, onNavigate: async () => {}, onLogout() {} }, "Body"))
  assert(!/max-sm:sr-only[^>]*>Posts/.test(list), "list pages keep their title on phones")
})

test("Markdown edits the whole document on an open canvas without separate title fields or footer prompts", () => {
  const { NewsletterEditor } = require("../components/portfolio/newsletter-editor.tsx")
  const html = renderToStaticMarkup(React.createElement(NewsletterEditor, { value: "<div>raw</div>", subject: "Document title", description: "A description", disabled: false, onChange() {}, onDocumentChange() {}, onUpload: async () => "https://example.com/image.png" }, React.createElement("h2", null, "Separate title field")))
  assert(html.includes('aria-label="Markdown formatting"'), "Markdown mode has its own sticky bar")
  assert.match(html, /role="tab"[^>]*aria-label="Write"/)
  assert.match(html, /role="tab"[^>]*aria-label="Preview"/)
  for (const label of ["Bold", "Italic", "Code", "Link", "Upload image", "Bullet list", "Numbered list", "Task list"]) assert(html.includes(`aria-label="${label}"`), label)
  assert(html.indexOf("Back to editor") < html.indexOf("Document title"), "the toolbar comes before the title")
  assert(html.indexOf("Back to editor") < html.indexOf("<textarea"), "the switch comes before the text, not after it")
  const back = html.match(/<button[^>]*aria-label="Back to editor"[^>]*>[\s\S]*?<\/button>/)?.[0]
  assert(back?.includes('disabled=""'), "raw HTML keeps the draft in Markdown until it is removed")
  assert(html.includes("raw HTML"))
  assert(html.includes("&lt;div&gt;raw&lt;/div&gt;"), "source is kept verbatim and escaped")
  assert(html.includes("# Document title\n\nA description\n\n&lt;div&gt;raw&lt;/div&gt;"), "title, description and body share one source")
  assert(!html.includes("Separate title field"), "visual metadata fields are absent in source mode")
  assert.equal((html.match(/<textarea/g) ?? []).length, 1)
  assert(!html.includes("Markdown is supported") && !html.includes("attach an image"))
  const field = html.match(/<textarea[^>]*>/)?.[0]
  assert(field && !/border-|rounded-|p-4/.test(field), "source has no input box treatment")
  assert(field.includes("data-native-scroll"), "clicking Markdown must leave caret scrolling to the editor")
  const picker = html.match(/<input[^>]*type="file"[^>]*>/)?.[0]
  assert(picker?.includes(".avif,.gif,.heic,.heif,.jpeg,.jpg,.png,.webp"), "the picker accepts the signed upload's image formats")
  assert(!picker.includes("image/*"), "unsupported image types are not offered by the file filter")
  assert(html.includes('role="tabpanel"'))
})

test("rich editing keeps a single row of icon controls above the title and inserts blocks through slash commands", () => {
  const { NewsletterEditor } = require("../components/portfolio/newsletter-editor.tsx")
  const html = renderToStaticMarkup(React.createElement(NewsletterEditor, { value: "A draft", subject: "Document title", disabled: false, onChange() {}, onDocumentChange() {} }, React.createElement("h2", null, "Document title")))
  assert(html.indexOf('aria-label="Text formatting"') < html.indexOf("Document title"))
  assert(html.indexOf("Edit Markdown") < html.indexOf("Document title"))
  assert(!html.includes("Insert block"), "block insertion stays in the slash command menu")
  assert(html.includes('aria-label="More formatting tools"'))
  const mode = html.match(/<button[^>]*aria-label="Edit Markdown"[^>]*>([\s\S]*?)<\/button>/)?.[1]
  assert(mode?.includes("<svg") && !mode.includes("Edit Markdown"), "the mode switch shows only an accessible icon")
  const toolbar = html.slice(html.indexOf('class="writing-toolbar '), html.indexOf("Document title"))
  assert(!toolbar.includes("shadow-sm") && !toolbar.includes("border-border"))
  assert(toolbar.includes("data-native-scroll"), "sticky toolbar focus must not reveal its original position at the draft's top")
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
  assert.match(css, /\.writing-toolbar \{[^}]*flex-nowrap[^}]*overflow-x-auto/)
  assert.match(css, /\.writing-toolbar button \{[^}]*border-0 bg-transparent shadow-none/)
  assert.match(css, /@container writing[^]*\.writing-toolbar-rich \.writing-toolbar-secondary \{\s*@apply hidden/)
})

test("the desktop sidebar collapses to icons and keeps labels for assistive technology", () => {
  const html = renderToStaticMarkup(React.createElement(AdminShell, { section: "posts", session: { authenticated: true, login: "owner" }, loading: false, busy: false, onNavigate: async () => {}, onLogout() {} }, "Body"))
  assert.match(html, /aria-label="Collapse sidebar" aria-controls="admin-sidebar" aria-expanded="true"/)
  assert(html.includes('id="admin-sidebar"'))
  assert.match(html, /<span class="admin-sidebar-text">Posts<\/span>/)
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
  assert.match(css, /\[data-desk-sidebar="collapsed"\] \.admin-sidebar \.admin-sidebar-text \{\s*@apply sr-only;/)
  const layout = readFileSync(new URL("../app/(desk)/admin/layout.tsx", import.meta.url), "utf8")
  assert(layout.includes('localStorage.getItem("desk-sidebar")'), "the saved width applies before the desk paints")
})

test("the draft preview page uses the public article layout and says it is a preview", () => {
  const { DraftPreview } = require("../components/portfolio/draft-preview.tsx")
  const { PathnameContext } = require("next/dist/shared/lib/hooks-client-context.shared-runtime.js")
  const html = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: { push() {}, prefetch() {} } }, React.createElement(PathnameContext.Provider, { value: "/p/a5cd8282-68f1-4b4a-9c19-000000000001" }, React.createElement(DraftPreview, { id: "a5cd8282-68f1-4b4a-9c19-000000000001" }))))
  assert(html.includes('class="preview-banner"'))
  assert(html.includes("Not published yet"))
  assert(html.includes('class="page numbered"'))
  assert(html.includes('aria-label="Loading preview"'))
})

test("the live view is the blog's article in the desk's colours, with sections closed until opened", () => {
  const { LiveArticle } = require("../components/portfolio/live-article.tsx")
  const { PathnameContext } = require("next/dist/shared/lib/hooks-client-context.shared-runtime.js")
  const html = renderToStaticMarkup(React.createElement(PathnameContext.Provider, { value: "/admin/posts" }, React.createElement(LiveArticle, { subject: "A title", description: "What a bubble is.", date: "2026-11-26", markdown: "Opening line.\n\n## First part\n\nBody with **bold**.\n\n```portfolio-widget\n{\"name\":\"YouTubePreview\",\"props\":{\"videoId\":\"dQw4w9WgXcQ\",\"title\":\"A talk\"}}\n```" })))
  assert(html.includes('aria-label="Live view"'))
  assert(html.includes('class="page live-page"'), "the article layout without the blog's page tone")
  assert(!html.includes("numbered"), "no blog colour class")
  assert.match(html, /<h1 class="font-bold">A title<\/h1>/)
  assert(html.includes("November 26, 2026"))
  assert(html.includes("What a bubble is."), "the summary shows under the title")
  assert.match(html, /00\.<\/span> <h2>Introduction<\/h2>/, "numbered from 00, exactly like the blog")
  assert.match(html, /01\.<\/span> <h2>First part<\/h2>/)
  assert(!html.includes("<details open"), "sections start closed, as on the blog")
  assert.equal((html.match(/<details name="live-article"/g) ?? []).length, 2, "one open at a time, as on the blog")
  assert(!html.includes("signals-dot"), "the embedded preview omits the next-section control")
  assert(!html.includes("signals-bar"), "the preview has no empty navigation footer")
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
  assert(!css.includes("live-tone"), "no blog tone in the desk")
  assert.match(css, /\.admin-live-preview \.live-page \.signals \{\s*font-size: clamp\(1\.125rem, 4\.2cqi, 2\.05rem\);/)
  assert.match(css, /@container write \(min-width: 56rem\)/)
})

test("sign-in returns only to the desk's own pages, matching the API's check", () => {
  const cases = {
    "/admin/posts": "/admin/posts", "/admin/newsletters?doc=abc&view=send": "/admin/newsletters?doc=abc&view=send", "/p/a5cd8282": "/p/a5cd8282",
    "": "", "/": "", "/blog/post": "", "/admin/signin": "", "/admin/signin?next=/admin/posts": "",
    "//evil.example/admin/posts": "", "https://evil.example/admin/posts": "", "/admin//evil.example": "", "/admin/%2F%2Fevil.example": "",
    "/admin/..//evil.example": "", "/admin/../blog": "", "/admin/%2e%2e/blog": "", "/admin/\\evil.example": "", "/admin/posts\r\nSet-Cookie: x=1": "",
    ["/admin/" + "a".repeat(600)]: "",
  }
  for (const [path, want] of Object.entries(cases)) assert.equal(safeReturnPath(path), want, path)
  assert.equal(studioSignInHref("/admin/newsletters?doc=abc"), "/admin/signin?next=%2Fadmin%2Fnewsletters%3Fdoc%3Dabc")
  assert.equal(studioSignInHref("https://evil.example"), "/admin/signin")
  assert.equal(studioLoginHref("/admin/contacts"), `${studioLoginURL}?next=%2Fadmin%2Fcontacts`)
  assert.equal(studioLoginHref("//evil.example"), studioLoginURL)
})
