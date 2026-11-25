// Exercise the actual signup component's event handlers using hook and host
// doubles. This verifies gesture-time focus and asynchronous state races without
// launching a browser, emulating a keyboard, or adding a DOM dependency.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

function signup() {
  const slots = [], effects = [], host = new Map(), events = []
  let cursor = 0, tree, nodes = [], pending = []
  const requests = []
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const hooks = {
    useId: () => `signup-${cursor++}`,
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value }]
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial } },
    useCallback(callback) { cursor++; return callback },
    useEffect(callback, dependencies) {
      const index = cursor++, previous = effects[index]
      if (!previous || dependencies.some((value, i) => value !== previous[i])) pending.push(callback)
      effects[index] = dependencies
    },
  }
  const modules = {
    react: hooks,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "react-dom": { flushSync(callback) { callback(); render() } },
    "next/link": { default: "a" },
    "lucide-react": { Check: "svg", Mail: "svg" },
    "@/components/ui/button": { Button: "button" },
    "@/lib/portfolio-data": { email: { href: "mailto:owner@example.com" }, newsletter: { description: "Occasional notes", consent: "Confirm your subscription" } },
    "@/lib/newsletter": {
      newsletterAvailable() { events.push("availability"); return new Promise((resolve) => requests.push(resolve)) },
      subscribeToNewsletter() { assert.fail("These tests must never send an email") },
    },
    "@/lib/scroll": { focusElement(element) { if (element) events.push(`focus:${element.type}`) } },
  }
  const source = ts.transpileModule(readFileSync(new URL("../components/portfolio/newsletter-signup.tsx", import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(source, { exports, require(name) { assert(name in modules, name); return modules[name] }, FormData })
  function render() {
    cursor = 0; pending = []; nodes = []
    tree = exports.NewsletterSignup({})
    const seen = new Set()
    const visit = (node) => {
      if (!node || typeof node !== "object") return
      if (Array.isArray(node)) { node.forEach(visit); return }
      if (typeof node.type === "function") { visit(node.type(node.props)); return }
      const key = node.props.id ?? `${node.type}:${nodes.length}`
      const element = host.get(key) ?? { type: node.type }
      element.props = node.props
      host.set(key, element); seen.add(key)
      if (node.props.ref) node.props.ref.current = element
      nodes.push(element)
      visit(node.props.children)
    }
    visit(tree)
    for (const key of host.keys()) if (!seen.has(key)) host.delete(key)
    pending.forEach((effect) => effect())
  }
  const text = (node) => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : ""
  const button = (label) => {
    const node = nodes.find((item) => item.type === "button" && text(item.props.children) === label)
    assert(node, `Missing button ${label}`)
    return node
  }
  const input = () => nodes.find((node) => node.type === "input" && node.props.type === "email")
  render()
  return {
    events, requests, render, button, input,
    click(label) { const node = button(label); node.props.onClick({ currentTarget: node }) },
    type(value) { input().props.onChange({ target: { value } }); render() },
    async submit() { await nodes.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); render() },
  }
}

const settle = () => new Promise((resolve) => setImmediate(resolve))

test("Subscribe reveals and focuses an enabled email field before availability resolves", async () => {
  const ui = signup()
  ui.click("Subscribe")
  assert.deepEqual(ui.events, ["focus:input", "availability"])
  assert.equal(ui.input().props.disabled, false)
  assert.equal(ui.input().props.inputMode, "email")
  assert.equal(ui.input().props.autoCapitalize, "none")
  assert.equal(ui.button("Next").props.disabled, true)
  const input = ui.input()
  ui.type("reader@example.com")
  ui.requests[0](true)
  await settle(); ui.render()
  assert.equal(ui.input(), input)
  assert.equal(ui.input().props.value, "reader@example.com")
  assert.equal(ui.button("Next").props.disabled, false)
  assert.equal(ui.events.filter((event) => event === "focus:input").length, 1)
})

test("Back cancels a pending availability result without reopening the input", async () => {
  const ui = signup()
  ui.click("Subscribe")
  ui.click("Back"); ui.render()
  ui.requests[0](true)
  await settle(); ui.render()
  assert.equal(ui.input(), undefined)
  assert(ui.button("Subscribe"))
})

test("review Back restores email focus synchronously while preserving the address", async () => {
  const ui = signup()
  ui.click("Subscribe"); ui.requests[0](true)
  await settle(); ui.render()
  ui.type("reader@example.com")
  await ui.submit()
  assert(ui.button("Keep me posted"))
  assert.equal(ui.input().props.disabled, true)
  ui.click("Back")
  assert.equal(ui.events.at(-1), "focus:input")
  assert.equal(ui.input().props.disabled, false)
  assert.equal(ui.input().props.value, "reader@example.com")
})

test("unavailable signup still offers retry and refocuses within the retry tap", async () => {
  const ui = signup()
  ui.click("Subscribe"); ui.requests[0](false)
  await settle(); ui.render()
  assert.equal(ui.input(), undefined)
  ui.click("Try again")
  assert.deepEqual(ui.events.slice(-2), ["focus:input", "availability"])
  assert.equal(ui.input().props.disabled, false)
})
