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

function desk({ failSave = false, section = "newsletters" } = {}) {
  const slots = [], effects = [], calls = [], host = new Map()
  let cursor = 0, pending = [], tree, nodes = []
  const same = (a, b) => a && b && a.length === b.length && a.every((item, index) => item === b[index])
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial; return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value }] },
    useRef(current) { return slots[cursor++] ??= { current } },
    useCallback(callback, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { callback, deps }; return slots[index].callback },
    useEffect(callback, deps) { const index = cursor++; if (!same(effects[index]?.deps, deps)) { effects[index]?.cleanup?.(); effects[index] = { deps }; pending.push(() => { effects[index].cleanup = callback() }) } },
  }
  const api = {
    STUDIO_SUBJECT_LIMIT: 180, STUDIO_BODY_LIMIT: 40_000,
    studioBootstrap: async () => ({session:{ authenticated: true, configured: true, csrf: "owner-csrf", login: "owner" },drafts:[],posts:[published]}),
    studioFromPost: async (_csrf, slug) => {calls.push(["from-post",slug]);return {...baseDraft,markdown:`${published.description}\n\n[Read the post](<https://example.com/blog/${slug}>)`}},
    studioCreate: async (_csrf, subject, kind) => { calls.push(["create", subject, kind]); return { ...baseDraft, subject,kind } },
    studioSave: async (_csrf, draft, subject, markdown) => { calls.push(["save", subject, markdown]); if (failSave) throw new Error("Save failed"); return { ...draft, subject, markdown, revision: draft.revision + 1 } },
    studioPreview: async () => { calls.push(["preview"]); return "<p>Rendered email</p>" },
    studioMeta: async () => ({ sender: { name: "Owner", email: "owner@example.com" }, test_email: "owner@example.com", subscribers: 1, audience: "Readers" }),
    studioAction: async () => { calls.push(["send"]); throw new Error("No email action expected") },
    studioLogout: async () => { calls.push(["logout"]) },
    studioPublish: async (_csrf, draft,slug,description)=>{calls.push(["publish",draft.revision,slug,description]);return {...draft,slug,description,published_revision:draft.revision,cache_invalidated:true}},
    newsletterStateLabel: (state) => state,
  }
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const modules = {
    react: hooks, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/dynamic": {default:()=>"editor"}, "next/navigation": {useRouter:()=>({push:(href)=>calls.push(["navigate",href])})},
    "lucide-react": new Proxy({}, { get: () => "svg" }),
    "@/components/ui/button": { Button: "button" }, "@/components/ui/badge": { Badge: "badge" },
    "@/components/ui/skeleton": { Skeleton: "skeleton" }, "@/components/ui/select": { SelectField: "select-field" },
    "@/components/ui/tooltip": { Tooltip: "tooltip", TooltipContent: "tooltip-content", TooltipTrigger: "tooltip-trigger" },
    "@/components/portfolio/admin-shell": { AdminShell: "shell" }, "@/components/portfolio/newsletter-editor": { NewsletterEditor: "editor" },
    "@/components/prompt-kit/markdown": { Markdown: "markdown" }, "@/lib/portfolio-data": { site: { url: "https://example.com" } },
    "@/lib/newsletter-studio": api, "@/lib/scroll": { focusElement() {} },
  }
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL("../components/portfolio/newsletter-studio.tsx", import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(source, { exports, TextEncoder, URLSearchParams, setTimeout: () => 1, clearTimeout() {}, window: { location: { search: "", assign: (url) => calls.push(["navigate", url]) }, addEventListener() {}, removeEventListener() {} }, require(name) { assert(name in modules, name); return modules[name] } })
  const props = { section }
  function render() {
    cursor = 0; pending = []; nodes = []; tree = exports.NewsletterStudio(props)
    function visit(node) {
      if (Array.isArray(node)) { node.forEach(visit); return }
      if (!node || typeof node !== "object") return
      const key = node.props.id ?? `${node.type}:${nodes.length}`
      const element = host.get(key) ?? { select() {} }
      element.type = node.type; element.props = node.props; element.value = node.props.value
      host.set(key, element); nodes.push(element)
      if (node.props.ref) node.props.ref.current = element
      visit(node.props.children)
    }
    visit(tree); visit(tree.props.actions); pending.forEach((effect) => effect())
  }
  const text = (node) => Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : typeof node === "string" ? node : ""
  const button = (label) => { const found = nodes.find((node) => node.type === "button" && text(node.props.children) === label); assert(found, label); return found }
  render()
  return {
    calls,
    async flush() { await settle(); render() },
    click(label) { button(label).props.onClick() },
    select(value) { nodes.find((node) => node.type === "select-field" && node.props.id === "newsletter-source").props.onValueChange(value); render() },
    submit() { nodes.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }) },
    edit(value) { nodes.find((node) => node.type === "editor").props.onChange(value); render() },
    editor: () => nodes.find((node) => node.type === "editor"),
    input(id,value) { nodes.find((node)=>node.props.id===id).props.onChange({target:{value}});render() },
    node:(label)=>nodes.find((node)=>node.props["aria-label"]===label),
    header:()=>tree.props.actions,
    navigate: (href) => tree.props.onNavigate(href),
    setFailSave(value) { failSave = value },
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

test("post preview lives in the top bar, the document has its own scroll region, and publication requires review", async()=>{
 const ui=desk({section:"posts"});await ui.flush();ui.click("New post");await ui.flush()
 ui.input("post-title","An article");ui.edit("A draft body")
 assert(ui.header(),"editor controls must be passed to the shell header")
 assert.equal(ui.node("Article editor").props.className,"admin-editor-scroll")
 ui.click("Preview");await ui.flush()
 assert(!ui.calls.some((call)=>call[0]==="publish"),"preview must not publish")
 ui.click("Publish");await ui.flush();ui.submit();await ui.flush()
 ui.input("post-summary","A useful summary.");ui.submit();await ui.flush()
 assert(!ui.calls.some((call)=>call[0]==="publish"),"review must precede publication")
 ui.click("Publish post");await ui.flush()
 assert.deepEqual(ui.calls.at(-1),["publish",2,"an-article","A useful summary."])
 assert(!ui.calls.some((call)=>call[0]==="send"))
})
