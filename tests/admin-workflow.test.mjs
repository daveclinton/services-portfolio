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

function desk({ failSave = false } = {}) {
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
    studioSession: async () => ({ authenticated: true, configured: true, csrf: "owner-csrf", login: "owner" }),
    studioDrafts: async () => [],
    studioCreate: async (_csrf, subject) => { calls.push(["create", subject]); return { ...baseDraft, subject } },
    studioSave: async (_csrf, draft, subject, markdown) => { calls.push(["save", subject, markdown]); if (failSave) throw new Error("Save failed"); return { ...draft, subject, markdown, revision: draft.revision + 1 } },
    studioPreview: async () => { calls.push(["preview"]); return "<p>Rendered email</p>" },
    studioMeta: async () => ({ sender: { name: "Owner", email: "owner@example.com" }, test_email: "owner@example.com", subscribers: 1, audience: "Readers" }),
    studioAction: async () => { calls.push(["send"]); throw new Error("No email action expected") },
    studioLogout: async () => { calls.push(["logout"]) },
    newsletterStateLabel: (state) => state,
    newsletterFromPost: (post, siteURL) => ({ subject: post.title, markdown: `${post.description}\n\n[Read the post](<${siteURL}/blog/${post.slug}>)` }),
  }
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const modules = {
    react: hooks, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
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
  const props = { section: "newsletters", publishedPosts: [published] }
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
    visit(tree); pending.forEach((effect) => effect())
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
    navigate: (href) => tree.props.onNavigate(href),
    setFailSave(value) { failSave = value },
  }
}

test("choosing a published post creates an editable saved newsletter without sending it", async () => {
  const ui = desk(); await ui.flush()
  ui.click("New newsletter"); await ui.flush()
  ui.select(published.slug); ui.submit(); await ui.flush()
  assert.equal(ui.editor().props.value, "The published summary.\n\n[Read the post](<https://example.com/blog/a-published-post>)")
  assert.deepEqual(ui.calls.map((call) => call[0]), ["create", "save"])
  ui.click("Preview"); await ui.flush()
  assert.deepEqual(ui.calls.map((call) => call[0]), ["create", "save", "preview"])
})

test("a failed newsletter save retains its content, and navigation saves before leaving", async () => {
  const ui = desk({ failSave: true }); await ui.flush()
  ui.click("New newsletter"); await ui.flush(); ui.select(published.slug); ui.submit(); await ui.flush()
  assert(ui.editor().props.value.includes(published.description))
  ui.setFailSave(false); ui.click("Retry save"); await ui.flush()
  ui.edit("A revised newsletter")
  await ui.navigate("/admin/posts")
  assert.deepEqual(ui.calls.slice(-2), [["save", published.title, "A revised newsletter"], ["navigate", "/admin/posts"]])
  assert(!ui.calls.some((call) => call[0] === "send"))
})
