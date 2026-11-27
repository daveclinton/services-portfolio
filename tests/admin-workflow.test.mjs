// Exercise the real owner workflow with explicit hook/API doubles. No DOM or
// browser engine, and no real owner session or email delivery is used.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const published = { slug: "a-published-post", title: "An existing article", description: "The published summary.", date: "2026-11-25" }
const baseDraft = { id: "a5cd8282-68f1-4b4a-9c19-000000000001", subject: published.title, markdown: "", revision: 1, state: "draft", campaign_id: 0, scheduled_at: null, tested_revision: 0, last_error: "", updated_at: "2026-11-25T09:00:00Z" }
const settle = () => new Promise((resolve) => setImmediate(resolve))

function desk({ failSave = false, failPublish = false, section = "newsletters", drafts = [], cached, failRemove = false, allowSend = false, search = "", openDraft, width, blockPopups = false, signedOut = false } = {}) {
  const slots = [], effects = [], calls = [], host = new Map(), announced = [], summaries = [], focused = [], toasts = []
  let cursor = 0, pending = [], tree, nodes = []
  const same = (a, b) => a && b && a.length === b.length && a.every((item, index) => item === b[index])
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value }] },
    useRef(current) { return slots[cursor++] ??= { current } },
    useCallback(callback, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { callback, deps }; return slots[index].callback },
    useDeferredValue: (value) => value,
    useEffect(callback, deps) { const index = cursor++; if (!same(effects[index]?.deps, deps)) { effects[index]?.cleanup?.(); effects[index] = { deps }; pending.push(() => { effects[index].cleanup = callback() }) } },
  }
  const api = {
    announceSaved: (id) => announced.push(id), previewPath: (id) => `/p/${id}`,
    STUDIO_SUBJECT_LIMIT: 180, STUDIO_BODY_LIMIT: 40_000,
    studioBootstrap: async () => signedOut ? { session: { authenticated: false, configured: true, csrf: "", login: "" }, drafts: [], posts: [] } : ({session:{ authenticated: true, configured: true, csrf: "owner-csrf", login: "owner" },drafts,posts:[published]}),
    studioCachedDesk: () => cached, studioUpdateDesk: (_section, list) => { cached = undefined; calls.push(["list", list.map((item) => item.id)]) }, studioWarm() {}, studioOpen: async (row) => row,
    studioRemove: async (_csrf, row, action) => { calls.push([action, row.id, row.revision]); if (failRemove) throw new Error("Removal failed"); if (action === "delete") { drafts = drafts.filter((item) => item.id !== row.id); return null } return { ...row, published_revision: action === "unpublish" ? 0 : row.revision } },
    studioDraft: async (id) => { calls.push(["draft", id]); const found = openDraft?.(id); if (!found) throw new Error("Document not found."); return found },
    studioContacts: async () => ({ contacts: [{ email: "a@example.com", status: "subscribed", joined_at: "2026-11-20T00:00:00Z", confirmed_at: null }, { email: "b@example.com", status: "subscribed", joined_at: "2026-11-20T00:00:00Z", confirmed_at: null }, { email: "gone@example.com", status: "suppressed", joined_at: "2026-11-20T00:00:00Z", confirmed_at: null }], limit: 5000 }),
    studioRecipients: async (_csrf, draft, recipients) => { calls.push(["recipients", recipients]); return { ...draft, recipients: recipients ? [...recipients].sort() : null } },
    studioFromPost: async (_csrf, slug) => {calls.push(["from-post",slug]);return {...baseDraft,markdown:`${published.description}\n\n[Read the post](<https://example.com/blog/${slug}>)`}},
    studioCreate: async (_csrf, subject, kind) => { calls.push(["create", subject, kind]); return { ...baseDraft, subject,kind } },
    studioSave: async (_csrf, draft, subject, markdown, description) => { calls.push(["save", subject, markdown]); summaries.push(description); if (failSave === "signed-out") throw new api.StudioSignedOutError("Sign in to your newsletter dashboard."); if (failSave) throw new Error("Save failed"); return { ...draft, subject, markdown, revision: draft.revision + 1, ...(description === undefined ? {} : { description }) } },
    studioPreview: async () => { calls.push(["preview"]); return { html: "<p>Rendered email</p>", preheader: "Rendered email" } },
    studioMeta: async () => ({ sender: { name: "Owner", email: "owner@example.com" }, test_email: "owner@example.com", subscribers: 1, audience: "Readers" }),
    studioAction: async (_csrf, draft, kind, when) => { calls.push([kind, when]); if (!allowSend) throw new Error("No email action expected"); return { ...draft, state: kind === "test" ? "draft" : kind === "schedule" ? "scheduled" : "sending", tested_revision: kind === "test" ? draft.revision : draft.tested_revision } },
    studioLogout: async () => { calls.push(["logout"]) },
    StudioSignedOutError: class StudioSignedOutError extends Error {}, STUDIO_SIGNIN_PATH: "/admin/signin", studioSignInHref: () => `/admin/signin?next=${encodeURIComponent(location.pathname + location.search)}`,
    studioPublish: async (_csrf, draft,slug,description)=>{calls.push(["publish",draft.revision,slug,description]);if(failPublish)throw new Error("Publication failed. Try again.");return {...draft,slug,description,published_revision:draft.revision,cache_invalidated:true}},
    newsletterStateLabel: (state) => state,
    nairobiSchedule: (value) => new Date(`${value}:00+03:00`).toISOString(),
  }
  // Next's router is one object for the life of the page.
  const router = { push: (href) => calls.push(["navigate", href]), replace: (href) => calls.push(["navigate-replace", href]) }
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const modules = {
    react: hooks, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/dynamic": {default:()=>"editor"}, "next/navigation": {useRouter:()=>router},
    "lucide-react": new Proxy({}, { get: () => "svg" }),
    "@/components/ui/button": { Button: "button" }, "@/components/ui/badge": { Badge: "badge" },
    "@/components/ui/skeleton": { Skeleton: "skeleton" }, "@/components/ui/select": { SelectField: "select-field" },
    "@/components/ui/toast": { toastManager: { add(options) { toasts.push(options); return options.id ?? String(toasts.length) } } },
    "@/components/ui/tooltip": { Tooltip: "tooltip", TooltipContent: "tooltip-content", TooltipTrigger: "tooltip-trigger" },
    "@/components/portfolio/table-pager": { TablePager: "table-pager" }, "@/components/portfolio/send-drawer": { SendDrawer: "send-drawer" }, "@/components/portfolio/live-article": { LiveArticle: "live-article" }, "@/components/portfolio/sort-header": { SortHeader: "sort-header" }, "@/components/portfolio/document-actions": { DocumentActions: "document-actions" }, "@/components/portfolio/admin-shell": { AdminShell: "shell" }, "@/components/portfolio/newsletter-editor": { NewsletterEditor: "editor" },
    "@/components/prompt-kit/markdown": { Markdown: "markdown" }, "@/lib/portfolio-data": { site: { url: "https://example.com" } },
    "@/lib/newsletter-studio": api, "@/lib/scroll": { focusElement(element) { if (element) focused.push(element) } },
  }
  // A small browser history: entries hold the query string, as the address bar would.
  const entries = [search], listeners = []
  let at = 0
  const location = { pathname: `/admin/${section}`, get search() { return entries[at] ? `?${entries[at]}` : "" }, assign: (url) => calls.push(["navigate", url]) }
  const history = {
    pushState(_s, _t, url) { entries.splice(at + 1); entries.push(url.split("?")[1] ?? ""); at++ },
    replaceState(_s, _t, url) { entries[at] = url.split("?")[1] ?? "" },
    back() { if (at > 0) { at--; listeners.forEach((listener) => listener()) } },
  }
  const tabs = []
  const window = { location, history, open: (url, target) => { const tab = { opened: [url, target], opener: "desk", location: { href: "" }, closed: false, close() { this.closed = true } }; if (!blockPopups) tabs.push(tab); return blockPopups ? null : tab }, addEventListener(type, listener) { if (type === "popstate") listeners.push(listener) }, removeEventListener() {} }
  const urlExports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../lib/desk-url.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: urlExports, window, URLSearchParams, Intl, Number, Math })
  modules["@/lib/desk-url"] = urlExports
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL("../components/portfolio/newsletter-studio.tsx", import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(source, { ResizeObserver: width ? class { constructor(callback) { this.callback = callback } observe() { this.callback([{ contentRect: { width } }]) } disconnect() {} } : undefined, exports, Error, TextEncoder, URLSearchParams, setTimeout: () => 1, clearTimeout() {}, window, require(name) { assert(name in modules, name); return modules[name] } })
  const props = { section }
  function render() {
    props.query = new URLSearchParams(location.search)
    cursor = 0; pending = []; nodes = []; tree = exports.NewsletterStudio(props)
    function visit(node) {
      if (Array.isArray(node)) { node.forEach(visit); return }
      if (!node || typeof node !== "object") return
      const key = node.props.id ?? `${node.type}:${nodes.length}`
      const element = host.get(key) ?? { select() {} }
      element.type = node.type; element.props = node.props; element.value = node.props.value
      host.set(key, element); nodes.push(element)
      if (typeof node.props.ref === "function") {
        if (element.ref !== node.props.ref) { element.ref = node.props.ref; node.props.ref(element) }
      } else if (node.props.ref) node.props.ref.current = element
      visit(node.props.children)
    }
    visit(tree); visit(tree.props.actions); pending.forEach((effect) => effect())
  }
  const text = (node) => Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : typeof node === "string" || typeof node === "number" ? String(node) : ""
  const button = (label) => { const found = nodes.find((node) => node.type === "button" && text(node.props.children) === label); assert(found, label); return found }
  render()
  return {
    calls,
    focused,
    notices: () => toasts.map((toast) => `${toast.title ?? ""} ${toast.description ?? ""}`).join(" "),
    render,
    async flush() { await settle(); render() },
    click(label) { button(label).props.onClick() },
    text: () => text(tree),
    headerButton: (label) => { const found = []; (function walk(n) { if (Array.isArray(n)) return n.forEach(walk); if (!n?.props) return; if (n.type === "button" && text(n.props.children).includes(label)) found.push(n); walk(n.props.children) })(tree.props.actions); return found[0] },
    select(value) { nodes.find((node) => node.type === "select-field" && node.props.id === "newsletter-source").props.onValueChange(value); render() },
    submit() { nodes.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }) },
    edit(value) { nodes.find((node) => node.type === "editor").props.onChange(value); render() },
    editor: () => nodes.find((node) => node.type === "editor"),
    input(id,value) { nodes.find((node)=>node.props.id===id).props.onChange({target:{value}});render() },
    node:(label)=>nodes.find((node)=>node.props["aria-label"]===label),
    rows:()=>nodes.filter((node)=>node.type==="document-actions").map((node)=>node.props),
    checkbox:(email)=>nodes.find((node)=>node.type==="input"&&node.props.type==="checkbox"&&text(nodes[nodes.indexOf(node)+1]?.props?.children)===email),
    checkboxes:()=>nodes.filter((node)=>node.type==="input"&&node.props.type==="checkbox").length,
    nodeOfType:(type)=>nodes.find((node)=>node.type===type),
    pressed:()=>nodes.filter((node)=>node.type==="button"&&node.props["aria-pressed"]).map((node)=>text(node.props.children)),
    tabs:()=>tabs, announced:()=>announced, summaries:()=>summaries, inputValue:(id)=>nodes.find((node)=>node.props.id===id)?.props.value,
    url:()=>entries[at], history:()=>[...entries], back(){ history.back(); render() },
    sortBy:(label)=>nodes.find((node)=>node.type==="sort-header"&&node.props.label===label).props.onSort(),
    sortState:()=>nodes.filter((node)=>node.type==="sort-header").map((node)=>`${node.props.label}:${node.props.active?node.props.dir:"-"}`).join(" "),
    titles:()=>nodes.filter((node)=>node.type==="document-actions").map((node)=>node.props.document.subject),
    search:(value)=>{nodes.find((node)=>node.type==="input"&&node.props.type==="search").props.onChange({target:{value}});render()},
    pager:()=>nodes.find((node)=>node.type==="table-pager").props,
    has:(label)=>nodes.some((node)=>node.type==="button"&&text(node.props.children)===label),
    button,
    header:()=>tree.props.actions,
    navigate: (href) => tree.props.onNavigate(href),
    logout: () => tree.props.onLogout(),
    drawer: () => nodes.find((node) => node.type === "send-drawer")?.props,
    toasts: () => toasts,
    setFailSave(value) { failSave = value },
    setFailPublish(value) { failPublish = value },
  }
}

test("choosing a published post creates an editable saved newsletter without sending it", async () => {
  const ui = desk(); await ui.flush()
  ui.click("New newsletter"); await ui.flush()
  ui.select(published.slug); ui.submit(); await ui.flush()
  assert.equal(ui.editor().props.value, "The published summary.\n\n[Read the post](<https://example.com/blog/a-published-post>)")
  assert.deepEqual(ui.calls.map((call) => call[0]), ["from-post"])
  ui.click("Preview"); await ui.flush()
  assert.deepEqual(ui.calls.map((call) => call[0]), ["from-post", "preview"])
})

test("a failed newsletter save retains its content, and navigation saves before leaving", async () => {
  const ui = desk({ failSave: true }); await ui.flush()
  ui.click("New newsletter"); await ui.flush(); ui.select(published.slug); ui.submit(); await ui.flush()
  ui.edit("A revised newsletter"); ui.click("Preview"); await ui.flush()
  assert.equal(ui.editor().props.value,"A revised newsletter")
  ui.setFailSave(false); ui.click("Retry save"); await ui.flush()
  ui.edit("A revised newsletter")
  await ui.navigate("/admin/posts")
  assert.deepEqual(ui.calls.slice(-2), [["save", published.title, "A revised newsletter"], ["navigate", "/admin/posts"]])
  assert(!ui.calls.some((call) => call[0] === "send"))
})

test("preview and one-click publication stay in the editor and publish the saved description", async()=>{
 const ui=desk({section:"posts"});await ui.flush();ui.click("New post");await ui.flush()
 ui.input("post-title","An article");ui.edit("A draft body")
 ui.input("post-summary-line","A useful summary.")
 assert(ui.header(),"editor controls must be passed to the shell header")
 assert.equal(ui.node("Article editor").props.className,"admin-editor-scroll")
 ui.headerButton("Preview").props.onClick();await ui.flush();await ui.flush()
 assert.equal(ui.tabs()[0].location.href,`/p/${baseDraft.id}`,"preview opens the public layout in a new tab")
 assert.equal(ui.tabs()[0].opener,null,"the preview tab cannot reach back into the desk")
 assert.deepEqual([...ui.announced()],[baseDraft.id],"saving tells open preview tabs to reload")
 assert.deepEqual(ui.tabs()[0].opened,["","_blank"],"the tab opens during the click so it is not blocked")
 assert(!ui.calls.some((call)=>call[0]==="publish"),"preview must not publish")
 ui.headerButton("Publish").props.onClick();await ui.flush();await ui.flush()
 assert.deepEqual(ui.calls.filter((call)=>call[0]==="publish").at(-1),["publish",2,"an-article","A useful summary."])
 assert(!ui.calls.some((call)=>call[0]==="send"))
 assert(ui.editor(),"publishing keeps the document mounted in the editor")
 assert(ui.notices().includes("Post published."))
 assert(ui.headerButton("Update"),"the same header now offers Update")
 assert(!ui.nodeOfType("form"),"there is no URL, summary, review or success page")
})

const row = (index, extra = {}) => ({ ...baseDraft, id: `a5cd8282-68f1-4b4a-9c19-${String(index).padStart(12, "0")}`, subject: `Post ${index}`, kind: "post", slug: "", published_revision: 0, ...extra })

test("posts lists drafts and published articles together, a page at a time", async () => {
  const ui = desk({ section: "posts", drafts: Array.from({ length: 45 }, (_, index) => row(index + 1, index % 2 ? { published_revision: 1, slug: `post-${index}` } : {})) })
  await ui.flush()
  assert.equal(ui.rows().length, 20)
  assert(ui.rows().some((item) => item.document.published_revision) && ui.rows().some((item) => !item.document.published_revision))
  const pager = () => ui.pager()
  assert.deepEqual([pager().page, pager().pages, pager().total], [0, 3, 45])
  for (let turn = 0; turn < 2; turn++) { pager().onPage(pager().page + 1); await ui.flush() }
  assert.equal(ui.rows().length, 5)
  assert.deepEqual([pager().first, pager().shown, pager().page], [40, 5, 2])
})

test("deleting acts on the chosen revision, updates the list and keeps it on failure", async () => {
  const drafts = [row(1, { revision: 3 }), row(2)]
  const ui = desk({ section: "posts", drafts }); await ui.flush()
  assert.equal(await ui.rows().find((item) => item.document.revision === 3).onRemove("delete"), true); await ui.flush()
  assert.deepEqual(ui.calls.find((call) => call[0] === "delete"), ["delete", drafts[0].id, 3])
  assert.deepEqual(ui.rows().map((item) => item.document.id), [drafts[1].id])
  const failing = desk({ section: "posts", drafts, failRemove: true }); await failing.flush()
  assert.equal(await failing.rows()[0].onRemove("delete"), false); await failing.flush()
  assert.equal(failing.rows().length, 2)
})

test("deleting from the editor returns to the list without saving the removed document", async () => {
  const ui = desk({ section: "posts" }); await ui.flush()
  ui.click("New post"); await ui.flush(); ui.edit("Abandoned")
  await ui.rows()[0].onRemove("delete"); await ui.flush()
  assert(!ui.calls.some((call) => call[0] === "save"))
  assert(ui.has("New post"))
})

test("a remembered list is shown immediately on returning to a section", async () => {
  const cached = { session: { authenticated: true, configured: true, csrf: "owner-csrf", login: "owner" }, drafts: [row(1)], posts: [] }
  const ui = desk({ section: "posts", cached, drafts: [row(1), row(2)] }); await ui.flush()
  assert.equal(ui.rows().length, 2, "the fresh response replaces the remembered list")
})

test("a newsletter is tested and sent from a drawer over its preview, with one confirmation", async () => {
  const ui = desk({ allowSend: true }); await ui.flush()
  ui.click("New newsletter"); await ui.flush(); ui.select(published.slug); ui.submit(); await ui.flush()
  ui.click("Preview"); await ui.flush(); await ui.flush()
  assert(ui.text().includes("All subscribers · 1"), "the inbox header names the audience")
  assert(ui.text().includes("Rendered email"), "the preview text is shown")
  assert.equal(ui.drawer().open, false)
  ui.headerButton("Send test").props.onClick(); await ui.flush()
  assert.deepEqual(ui.calls.at(-1), ["test", undefined])
  assert(ui.text().includes("A test was sent to owner@example.com"))
  ui.headerButton("Send…").props.onClick(); await ui.flush()
  const drawer = ui.drawer()
  assert.equal(drawer.open, true, "sending opens over the preview instead of a new step")
  assert(ui.text().includes("Rendered email"), "the preview stays on the page")
  assert.equal(drawer.audience, "all"); assert.equal(drawer.later, false); assert.equal(drawer.tested, true)
  assert(!ui.calls.some((call) => call[0] === "send"), "opening the drawer never sends")
  drawer.onSend(); await ui.flush()
  assert.deepEqual(ui.calls.at(-1), ["send", undefined])
  assert.equal(ui.drawer()?.open ?? false, false, "the drawer closes once the email is on its way")
})

test("specific contacts come from confirmed subscribers and are saved before sending", async () => {
  const ui = desk({ allowSend: true }); await ui.flush()
  ui.click("New newsletter"); await ui.flush(); ui.select(published.slug); ui.submit(); await ui.flush()
  ui.click("Preview"); await ui.flush(); await ui.flush()
  ui.headerButton("Send…").props.onClick(); await ui.flush()
  ui.drawer().onAudience("selected"); await ui.flush(); await ui.flush()
  assert.deepEqual(ui.drawer().subscribers.map((contact) => contact.email), ["a@example.com", "b@example.com"], "only confirmed subscribers can be picked")
  ui.drawer().onPicked(["b@example.com"]); await ui.flush()
  assert(!ui.calls.some((call) => call[0] === "recipients" || call[0] === "send"), "choosing never saves or sends")
  ui.drawer().onSend(); await ui.flush(); await ui.flush()
  assert.deepEqual(ui.calls.filter((call) => call[0] === "recipients" || call[0] === "send").map((call) => call[0]), ["recipients", "send"])
  assert.equal(JSON.stringify(ui.calls.find((call) => call[0] === "recipients")), JSON.stringify(["recipients", ["b@example.com"]]))
})

test("scheduling suggests tomorrow morning in Nairobi and schedules that time", async () => {
  const ui = desk({ allowSend: true }); await ui.flush()
  ui.click("New newsletter"); await ui.flush(); ui.select(published.slug); ui.submit(); await ui.flush()
  ui.click("Preview"); await ui.flush(); await ui.flush()
  ui.headerButton("Send…").props.onClick(); await ui.flush()
  ui.drawer().onLater(true); await ui.flush()
  const tomorrow = new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString().slice(0, 10)
  assert.equal(ui.drawer().schedule, `${tomorrow}T09:00`)
  ui.drawer().onSend(); await ui.flush()
  assert.deepEqual(ui.calls.at(-1), ["schedule", new Date(`${tomorrow}T09:00:00+03:00`).toISOString()])
})

test("opening a document records it in the address, and Back returns to the list", async () => {
  const letters = [row(1, { kind: "newsletter" }), row(2, { kind: "newsletter" })]
  const ui = desk({ section: "newsletters", drafts: letters }); await ui.flush()
  await ui.rows()[0].onOpen(); await ui.flush()
  assert.equal(ui.url(), `doc=${row(1).id}`)
  ui.edit("Changed body"); ui.click("Preview"); await ui.flush()
  assert.equal(ui.url(), `doc=${row(1).id}&view=preview`)
  ui.back(); await ui.flush()
  assert.equal(ui.url(), `doc=${row(1).id}`)
  assert(ui.has("Preview"), "Back from the preview returns to writing")
  ui.back(); await ui.flush(); await ui.flush()
  assert.equal(ui.url(), "")
  assert(ui.has("New newsletter"), "Back from writing returns to the list")
  assert(ui.calls.some((call) => call[0] === "save"), "leaving saves the draft")
})

test("a shared document link opens it, and a newsletter link under Posts moves to Newsletters", async () => {
  const post = row(1), letter = { ...row(2), kind: "newsletter" }
  const ui = desk({ section: "posts", drafts: [post], search: `doc=${post.id}&view=preview`, openDraft: (id) => [post, letter].find((d) => d.id === id) })
  await ui.flush(); await ui.flush(); await ui.flush()
  assert.deepEqual(ui.calls.filter((call) => call[0] === "draft").map((call) => call[1]), [post.id])
  assert(ui.has("Publish"), "the preview opens from the link")
  const other = desk({ section: "posts", drafts: [post], search: `doc=${letter.id}`, openDraft: (id) => [post, letter].find((d) => d.id === id) })
  await other.flush(); await other.flush()
  assert.deepEqual(other.calls.filter((call) => call[0] === "replace"), [])
  assert(other.calls.some((call) => call[0] === "navigate-replace" && call[1] === `/admin/newsletters?doc=${letter.id}`), "a newsletter opens in its own section")
  const missing = desk({ section: "posts", drafts: [post], search: "doc=a5cd8282-68f1-4b4a-9c19-999999999999", openDraft: () => null })
  await missing.flush(); await missing.flush()
  assert.equal(missing.url(), "", "a broken link falls back to the list")
})

test("search, sort and page live in the address without adding history entries", async () => {
  const ui = desk({ section: "posts", drafts: [row(1, { subject: "Banana" }), row(2, { subject: "apple" }), row(3, { subject: "Cherry" })] }); await ui.flush()
  assert.equal(ui.sortState(), "Title:- Status:- Date:desc")
  ui.sortBy("Title"); await ui.flush()
  assert.equal(ui.url(), "sort=title")
  assert.deepEqual(ui.titles(), ["apple", "Banana", "Cherry"])
  ui.sortBy("Title"); await ui.flush()
  assert.equal(ui.url(), "sort=title&dir=desc")
  assert.deepEqual(ui.titles(), ["Cherry", "Banana", "apple"])
  ui.search("an"); await ui.flush()
  assert.equal(ui.url(), "sort=title&dir=desc&q=an")
  assert.deepEqual(ui.titles(), ["Banana"])
  ui.sortBy("Date"); await ui.flush()
  assert.equal(ui.url(), "q=an", "the default order leaves the address")
  assert.equal(ui.history().length, 1, "table settings replace the entry instead of adding one")
  const linked = desk({ section: "posts", drafts: Array.from({ length: 30 }, (_, i) => row(i + 1)), search: "page=2&sort=bogus" }); await linked.flush()
  assert.equal(linked.pager().page, 1, "a page in a link is honoured")
  assert.equal(linked.sortState(), "Title:- Status:- Date:desc", "an unknown sort falls back to the default")
})

test("a blocked preview tab is explained, and post links to the old preview step stay on writing", async () => {
  const ui = desk({ section: "posts", blockPopups: true }); await ui.flush()
  ui.click("New post"); await ui.flush()
  ui.headerButton("Preview").props.onClick(); await ui.flush()
  assert(ui.notices().includes("Your browser blocked the preview tab"))
  const post = row(7)
  const linked = desk({ section: "posts", drafts: [post], search: `doc=${post.id}&view=preview`, openDraft: (id) => id === post.id ? post : null })
  await linked.flush(); await linked.flush(); await linked.flush()
  assert.equal(linked.url(), `doc=${post.id}`)
  assert(linked.headerButton("Publish"), "the post opens for writing with Publish at hand")
})

test("the editor and its live view sit side by side, with no layout switch to manage", async () => {
  const ui = desk({ section: "posts", width: 1200 }); await ui.flush()
  ui.click("New post"); await ui.flush()
  ui.input("post-title", "Live title"); ui.edit("A **live** paragraph"); await ui.flush()
  const live = () => ui.nodeOfType("live-article")
  assert(live(), "the live view is shown beside the editor")
  assert.equal(live().props.subject, "Live title")
  assert.equal(live().props.markdown, "A **live** paragraph", "it follows every edit")
  assert.deepEqual(ui.pressed(), [], "there is no Write / Split / Live view switch")
  for (const label of ["Write", "Split", "Live view"]) assert(!ui.has(label), label)

  const narrow = desk({ section: "posts", width: 700 }); await narrow.flush()
  narrow.click("New post"); await narrow.flush(); await narrow.flush()
  assert(!narrow.nodeOfType("live-article"), "a narrow desk shows the editor alone and does not render the live view")
  assert(narrow.headerButton("Preview"), "the full preview stays one click away")
})

test("the editor and live view have independent scroll regions", async () => {
  const ui = desk({ section: "posts", width: 1200 }); await ui.flush()
  ui.click("New post"); await ui.flush()
  assert.equal(ui.node("Article editor").props.onScroll, undefined, "editor scrolling must not move the preview")
  assert.equal(ui.nodeOfType("live-article").props.onScroll, undefined, "preview scrolling must not move the editor")
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
  for (const selector of ["admin-editor-scroll", "admin-live-preview"]) {
    const rule = css.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))[1]
    assert(rule.includes("overflow-y-auto") && rule.includes("overscroll-contain"), `${selector} contains its own scrolling`)
    assert(rule.includes("scrollbar-width: none"), `${selector} scrolls without a visible scrollbar`)
  }
})

test("posts have a summary under the title that saves with the draft and shows in the live view", async () => {
  const ui = desk({ section: "posts", width: 1200 }); await ui.flush()
  ui.click("New post"); await ui.flush()
  ui.input("post-title", "Bubbles"); ui.input("post-summary-line", "What a bubble is,\nand what a burst would change."); await ui.flush()
  ui.edit("A draft body.")
  assert.equal(ui.nodeOfType("live-article").props.description, "What a bubble is, and what a burst would change.", "line breaks become spaces, and the live view follows")
  assert(ui.text().includes("Unsaved changes"), "a summary change is an unsaved change")
  ui.headerButton("Publish").props.onClick(); await ui.flush(); await ui.flush()
  assert.deepEqual([...ui.summaries()], ["What a bubble is, and what a burst would change."], "the summary is saved with the post")
  assert.deepEqual(ui.calls.find((call) => call[0] === "publish"), ["publish", 2, "bubbles", "What a bubble is, and what a burst would change."], "publishing reuses the saved summary in place")
  assert(ui.editor(), "publication keeps the editor open")

  const letters = desk({ section: "newsletters" }); await letters.flush()
  letters.click("New newsletter"); await letters.flush(); letters.select("a-published-post"); letters.submit(); await letters.flush()
  assert(!letters.has("post-summary-line") && !letters.text().includes("Add a summary"), "newsletters have no summary field")
  letters.edit("A newsletter body"); letters.click("Preview"); await letters.flush()
  assert.deepEqual([...letters.summaries()], [undefined], "newsletter saves leave the summary out")
})

test("whole-document source edits update the live metadata and save title, description and article together", async () => {
  const ui = desk({ section: "posts", width: 1200 }); await ui.flush()
  ui.click("New post"); await ui.flush()
  ui.editor().props.onDocumentChange({ subject: "Changed in Markdown", description: "A source description", markdown: "## A section\n\nAn updated body." })
  await ui.flush()
  assert.equal(ui.editor().props.subject, "Changed in Markdown")
  assert.equal(ui.editor().props.description, "A source description")
  assert.equal(ui.nodeOfType("live-article").props.subject, "Changed in Markdown")
  assert.equal(ui.nodeOfType("live-article").props.description, "A source description")
  assert.equal(ui.nodeOfType("live-article").props.markdown, "## A section\n\nAn updated body.")
  ui.headerButton("Publish").props.onClick(); await ui.flush(); await ui.flush()
  assert.deepEqual(ui.calls.find((call) => call[0] === "save"), ["save", "Changed in Markdown", "## A section\n\nAn updated body."])
  assert.deepEqual([...ui.summaries()], ["A source description"])
})

test("actions that leave the draft open do not refocus the heading or title when their busy state changes", async () => {
  const ui = desk({ section: "posts" }); await ui.flush()
  ui.click("New post"); await ui.flush(); await ui.flush()
  assert.equal(ui.focused.at(-1)?.props.id, "post-title", "opening a document still focuses its title")
  ui.input("post-title", "A long draft"); ui.edit("Body\n\n".repeat(100))
  ui.focused.length = 0
  ui.headerButton("Preview").props.onClick()
  ui.render()
  await ui.flush(); await ui.flush()
  assert.equal(ui.focused.length, 0, "preview completion must not send the draft back to its title")
  await ui.navigate("/admin/contacts")
  await ui.flush()
  assert.equal(ui.focused.length, 0, "a completed action must not refocus the editor being left")
})

test("Update saves and publishes in place once, preserving the URL after a title change", async () => {
  const saved = { ...baseDraft, subject: "Published title", kind: "post", slug: "existing-url", published_revision: 1, description: "Saved summary", markdown: "Original body" }
  const ui = desk({ section: "posts", search: `doc=${saved.id}`, openDraft: () => saved }); await ui.flush(); await ui.flush()
  ui.input("post-title", "A different title"); ui.input("post-summary-line", "Updated summary"); ui.edit("An updated article")
  ui.focused.length = 0
  const update = ui.headerButton("Update")
  update.props.onClick(); update.props.onClick(); ui.render()
  await ui.flush(); await ui.flush()
  assert.deepEqual(ui.calls.filter((call) => call[0] === "publish"), [["publish", 2, "existing-url", "Updated summary"]])
  assert(ui.editor() && ui.node("Article editor"), "Update keeps the same writing view")
  assert(ui.notices().includes("Post updated."))
  assert.equal(ui.inputValue("post-slug"), "existing-url")
  assert.equal(ui.focused.length, 0, "publishing must not bring the editor back to the title")
  assert(!ui.nodeOfType("form") && !ui.calls.some((call) => call[0] === "navigate"))
})

test("new posts can choose their URL in the editor and validation stays on that page", async () => {
  const ui = desk({ section: "posts" }); await ui.flush(); ui.click("New post"); await ui.flush()
  ui.input("post-title", "A new title"); ui.edit("Draft body")
  assert.equal(ui.inputValue("post-slug"), "a-new-title")
  ui.headerButton("Publish").props.onClick(); await ui.flush()
  assert(ui.editor() && ui.text().includes("Add a summary in the editor before publishing."))
  assert(!ui.calls.some((call) => call[0] === "publish"))
  ui.input("post-summary-line", "An existing summary"); ui.input("post-slug", "INVALID URL")
  ui.headerButton("Publish").props.onClick(); await ui.flush()
  assert(ui.editor() && ui.text().includes("Use lowercase words and dashes"))
  assert(!ui.calls.some((call) => call[0] === "publish"))
  ui.input("post-slug", "custom-post-url")
  ui.headerButton("Publish").props.onClick(); await ui.flush(); await ui.flush()
  assert.deepEqual(ui.calls.find((call) => call[0] === "publish"), ["publish", 2, "custom-post-url", "An existing summary"])
  assert(ui.editor() && ui.notices().includes("Post published."))
})

test("save and publication failures retain the draft in the editor and can be retried there", async () => {
  const ui = desk({ section: "posts", failSave: true }); await ui.flush(); ui.click("New post"); await ui.flush()
  ui.input("post-title", "An article"); ui.input("post-summary-line", "A summary"); ui.edit("Keep this body")
  ui.headerButton("Publish").props.onClick(); await ui.flush(); await ui.flush()
  assert(ui.editor() && ui.text().includes("Save failed"), ui.text())
  assert(!ui.calls.some((call) => call[0] === "publish"), "a failed save must never publish")
  ui.setFailSave(false); ui.setFailPublish(true)
  ui.headerButton("Publish").props.onClick(); await ui.flush(); await ui.flush()
  assert(ui.editor() && ui.text().includes("Publication failed"))
  assert.equal(ui.editor().props.value, "Keep this body")
  assert.equal(ui.editor().props.description, "A summary")
  assert(!ui.notices().includes("Post published."))
  ui.setFailPublish(false)
  ui.headerButton("Publish").props.onClick(); await ui.flush(); await ui.flush()
  assert(ui.editor() && ui.notices().includes("Post published."))
  assert.equal(ui.calls.filter((call) => call[0] === "publish").length, 2)
})

test("a signed-out desk sends the owner to the sign-in page and remembers where they were", async () => {
  const ui = desk({ section: "posts", signedOut: true, search: "doc=a5cd8282-68f1-4b4a-9c19-000000000001" }); await ui.flush()
  assert.deepEqual(ui.calls, [["navigate-replace", "/admin/signin?next=%2Fadmin%2Fposts%3Fdoc%3Da5cd8282-68f1-4b4a-9c19-000000000001"]])
  assert.doesNotMatch(ui.text(), /Continue with GitHub/)
})

test("signing out saves first, still signs out when the session already ended, and keeps work on other failures", async () => {
  const open = async (failSave) => {
    const ui = desk(); await ui.flush()
    ui.click("New newsletter"); await ui.flush()
    ui.select(published.slug); ui.submit(); await ui.flush()
    ui.edit("Unsaved words"); ui.setFailSave(failSave)
    ui.logout(); await ui.flush(); await ui.flush()
    return ui
  }
  const ended = await open("signed-out")
  assert.deepEqual(ended.calls.slice(-3).map((call) => call[0]), ["save", "logout", "navigate-replace"])
  assert.deepEqual(ended.calls.at(-1), ["navigate-replace", "/admin/signin"])
  const offline = await open(true)
  assert.equal(offline.calls.some((call) => call[0] === "logout"), false)
  assert.equal(offline.editor().props.value, "Unsaved words")
  assert.match(offline.notices(), /Save failed/)
})

test("a save refused for an ended session keeps the draft and offers sign-in in a new tab", async () => {
  const ui = desk(); await ui.flush()
  ui.click("New newsletter"); await ui.flush()
  ui.select(published.slug); ui.submit(); await ui.flush()
  ui.edit("Unsaved words"); ui.setFailSave("signed-out")
  ui.click("Preview"); await ui.flush()
  const notice = ui.toasts().at(-1)
  assert.equal(notice.title, "You’ve been signed out")
  assert.equal(ui.editor().props.value, "Unsaved words")
  notice.actionProps.onClick()
  assert.deepEqual(ui.tabs().at(-1).opened, ["/admin/signin", "_blank"])
})
