// Unit checks against explicit platform doubles: no browser or DOM engine.
import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as scrolling from "../lib/scroll.ts"
import { focusElement, revealAfterLayout, revealElement, scheduleReveal, updateViewportMetrics } from "../lib/scroll.ts"

function platform(t, { height = 400, offsetTop = 0, reduced = false } = {}) {
  const original = new Map()
  const install = (name, value) => { original.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }) }
  const frames = new Map()
  const listeners = new Map()
  let sequence = 0
  const css = new Map()
  const attributes = new Set(), cleanups = []
  const root = { toggleAttribute(key,value) { if (value) attributes.add(key); else attributes.delete(key) }, removeAttribute(key) { attributes.delete(key) }, style: { setProperty: (key, value) => css.set(key, value), removeProperty: (key) => css.delete(key) } }
  const headers = new Map()
  const doc = {
    documentElement: root, body: {},
    querySelector: (selector) => headers.get(selector) ?? null,
    addEventListener: (name, callback) => { const set = listeners.get(name) ?? new Set(); set.add(callback); listeners.set(name, set) },
    removeEventListener: (name, callback) => listeners.get(name)?.delete(callback),
  }
  class Element {
    constructor(top = 500, bottom = 550) {
      this.rect = { top, bottom, height: bottom - top }
      this.isConnected = true
      this.parentElement = doc.body
      this.clientTop = 0
      this.clientHeight = bottom - top
      this.overflowY = "visible"
      this.visibility = "visible"
      this.calls = []
      this.focusCalls = []
    }
    matches() { return this.editable ?? false }
    getBoundingClientRect() { return this.rect }
    getClientRects() { return this.isConnected ? [this.rect] : [] }
    closest(selector) { return selector === "[data-focus-region]" ? this.region ?? null : this.modal ?? null }
    scrollIntoView(options) { this.calls.push(options) }
    focus(options) { this.focusCalls.push(options); doc.activeElement = this }
  }
  const win = { innerHeight: 800, visualViewport: { offsetTop, height, scale: 1 }, matchMedia: () => ({ matches: reduced }) }
  for (const [prefix, target] of [["window", win], ["viewport", win.visualViewport]]) {
    target.addEventListener = (name, callback) => doc.addEventListener(`${prefix}:${name}`,callback)
    target.removeEventListener = (name, callback) => doc.removeEventListener(`${prefix}:${name}`,callback)
  }
  install("window", win); install("document", doc); install("HTMLElement", Element)
  install("getComputedStyle", (element) => ({ position: element.position, top: element.top, overflowY: element.overflowY, visibility: element.visibility, scrollMarginTop: element.marginTop, scrollMarginBottom: element.marginBottom }))
  install("requestAnimationFrame", (callback) => { const id = ++sequence; frames.set(id, callback); return id })
  install("cancelAnimationFrame", (id) => frames.delete(id))
  const flush = () => { const current = [...frames.values()]; frames.clear(); current.forEach((callback) => callback()) }
  t.after(() => { cleanups.reverse().forEach((cleanup) => cleanup()); flush(); for (const [key, value] of original) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key] } })
  return { Element, doc, win, root, css, headers, flush, listeners, attributes, cleanups, dispatch: (name, event) => [...(listeners.get(name) ?? [])].forEach((callback) => callback(event)) }
}

test("scrolling accounts for the keyboard, sticky navigation, and fixed reader footer", (t) => {
  const p = platform(t)
  p.headers.set(".site-nav", new p.Element(0, 64))
  p.headers.set(".signals-bar", new p.Element(300, 400))
  const field = new p.Element(280, 330)
  revealElement(field)
  assert.equal(p.root.style.scrollPaddingTop, "64px")
  assert.equal(p.root.style.scrollPaddingBottom, "500px")
  assert.equal(p.css.get("--visible-height"), "400px")
  assert.deepEqual(field.calls, [{ block: "nearest", inline: "nearest", behavior: "smooth" }])
})

test("admin fields stay clear of the private workspace header", (t) => {
  const p = platform(t)
  const header = new p.Element(0, 64)
  header.position = "sticky"; header.top = "0px"
  p.headers.set(".admin-header", header)
  revealElement(new p.Element(40, 80))
  assert.equal(p.root.style.scrollPaddingTop, "64px")
})

test("visible fields stay still, while clipped fields reveal in their native scroller", (t) => {
  const p = platform(t)
  const field = new p.Element(200, 240)
  revealElement(field)
  assert.equal(field.calls.length, 0)
  const scroller = new p.Element(100, 200)
  scroller.overflowY = "auto"
  field.parentElement = scroller
  revealElement(field)
  assert.equal(field.calls.length, 1)
})

test("a label/input region is revealed together only when it fits above the keyboard", (t) => {
  const p = platform(t)
  const field = new p.Element(450, 490)
  const region = new p.Element(410, 510)
  field.region = region
  revealElement(field)
  assert.equal(region.calls.length, 1)
  assert.equal(field.calls.length, 0)
  region.rect = { top: 100, bottom: 900, height: 800 }
  revealElement(field)
  assert.equal(field.calls.length, 1)
})

test("reduced motion uses an explicit instant scroll despite global smooth-scroll CSS", (t) => {
  const p = platform(t, { reduced: true })
  const field = new p.Element()
  revealElement(field)
  assert.equal(field.calls[0].behavior, "instant")
})

test("keyboard resize correction is instant and pinch zoom never triggers a pan", (t) => {
  const p = platform(t)
  const field = new p.Element()
  revealElement(field, { animate: false })
  assert.equal(field.calls[0].behavior, "instant")
  p.win.visualViewport.scale = 2
  revealElement(field)
  assert.equal(field.calls.length, 1)
  assert.equal(p.css.has("--visible-height"), false)
})

test("focus stays synchronous and repeated requests result in one final scroll", (t) => {
  const p = platform(t)
  const first = new p.Element(), latest = new p.Element()
  focusElement(first)
  assert.deepEqual(first.focusCalls, [{ preventScroll: true }])
  assert.equal(first.calls.length, 0)
  focusElement(latest)
  scheduleReveal(latest, { block: "start" })
  p.flush()
  assert.equal(first.calls.length, 0)
  assert.deepEqual(latest.calls, [{ block: "start", inline: "nearest", behavior: "smooth" }])
})

test("modal focus ignores background bars but still respects the visual viewport", (t) => {
  const p = platform(t, { height: 300, offsetTop: 40 })
  p.headers.set(".site-nav", new p.Element(40, 120))
  p.headers.set(".signals-bar", new p.Element(220, 340))
  const field = new p.Element(250, 290)
  field.modal = {}
  assert.deepEqual(updateViewportMetrics(field), { top: 40, bottom: 340 })
  revealElement(field)
  assert.equal(field.calls.length, 0)
})

test("disclosure scrolling waits for layout transitions without waiting on decorative animation", async (t) => {
  const p = platform(t)
  const target = new p.Element()
  let finish
  const height = new Promise((resolve) => { finish = resolve })
  const scope = { getAnimations: () => [{ transitionProperty: "height", finished: height }, { transitionProperty: "opacity", finished: new Promise(() => {}) }] }
  revealAfterLayout(target, scope, () => true)
  p.flush()
  assert.equal(target.focusCalls.length, 0)
  finish()
  await new Promise((resolve) => setImmediate(resolve))
  p.flush()
  assert.equal(target.focusCalls.length, 1)
  assert.equal(target.calls[0].block, "start")
  p.dispatch("scrollend", { target: p.doc })
  assert.equal(p.listeners.get("wheel").size, 0)
})

test("a reader's wheel action cancels pending disclosure repositioning", async (t) => {
  const p = platform(t)
  const target = new p.Element()
  let finish
  const scope = { getAnimations: () => [{ transitionProperty: "height", finished: new Promise((resolve) => { finish = resolve }) }] }
  revealAfterLayout(target, scope, () => true)
  p.flush()
  p.dispatch("wheel")
  finish()
  await new Promise((resolve) => setImmediate(resolve))
  p.flush()
  assert.equal(target.focusCalls.length, 0)
  assert.equal(target.calls.length, 0)
  assert.equal(p.listeners.get("pointerdown").size, 0)
})


test("the app-wide coordinator corrects keyboard resize but does not chase a reader's scroll", (t) => {
  const p = platform(t)
  const source = ts.transpileModule(readFileSync(new URL("../components/portfolio/visible-viewport.tsx", import.meta.url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(source, { exports, HTMLElement: p.Element, window: p.win, document: p.doc, requestAnimationFrame, cancelAnimationFrame, require(name) {
    if (name === "react") return { useEffect(callback) { p.cleanups.push(callback()) } }
    if (name === "react/jsx-runtime") return {}
    if (name === "@/lib/scroll") return scrolling
    assert.fail(name)
  } })
  exports.ViewportFocus()
  p.flush()
  const input = new p.Element()
  input.editable = true
  p.doc.activeElement = input
  p.dispatch("focusin", { target: input })
  p.flush()
  assert.equal(input.calls.length, 1)
  assert(p.attributes.has("data-input-active"))
  p.dispatch("viewport:scroll")
  p.flush(); p.flush()
  assert.equal(input.calls.length, 1, "reading with the keyboard open must not trigger another scroll")
  p.dispatch("viewport:resize")
  // Safari may pan the viewport in the same frame as the keyboard resize.
  p.dispatch("viewport:scroll")
  p.flush(); p.flush()
  assert.equal(input.calls.length, 2)
  assert.equal(input.calls.at(-1).behavior, "instant")
  p.dispatch("click", { target: input })
  p.flush()
  assert.equal(input.calls.length, 3, "tapping an already-focused email field must reveal it again")
  p.doc.activeElement = p.doc.body
  p.dispatch("focusout")
  p.flush()
  assert(!p.attributes.has("data-input-active"))
})


test("a field's focus margin must also clear sticky controls", (t) => {
  const p = platform(t)
  p.headers.set(".site-nav", new p.Element(0,64))
  const field = new p.Element(64,110)
  field.marginTop = "16px"
  field.marginBottom = "16px"
  revealElement(field)
  assert.equal(field.calls.length,1)
})

test("a partially clipped sticky nav reserves its full height before scrolling a title", (t) => {
  const p = platform(t)
  const nav = new p.Element(-24, 40)
  nav.position = "sticky"
  nav.top = "0px"
  p.headers.set(".site-nav", nav)
  revealElement(new p.Element(), { block: "start" })
  assert.equal(p.root.style.scrollPaddingTop, "64px")
})

test("long titles prioritize their beginning when they cannot fit below navigation", (t) => {
  const p = platform(t, { height: 200 })
  p.headers.set(".site-nav", new p.Element(0, 64))
  const title = new p.Element(20, 220)
  revealElement(title)
  assert.equal(title.calls[0].block, "start")
})

test("disclosure scroll completion rechecks a title obscured by the final sticky layout", async (t) => {
  const p = platform(t)
  p.headers.set(".site-nav", new p.Element(0, 64))
  const title = new p.Element()
  revealAfterLayout(title, { getAnimations: () => [] }, () => true)
  p.flush()
  await new Promise((resolve) => setImmediate(resolve))
  p.flush()
  assert.equal(title.calls[0].behavior, "smooth")
  title.rect = { top: 40, bottom: 90, height: 50 }
  p.dispatch("scrollend", { target: p.doc })
  assert.equal(title.calls.at(-1).behavior, "instant")
  assert.equal(title.calls.length, 2)
  assert.equal(p.listeners.get("scrollend").size, 0)
})

test("a reader taking over during smooth disclosure scrolling cancels final correction", async (t) => {
  const p = platform(t)
  const title = new p.Element()
  revealAfterLayout(title, { getAnimations: () => [] }, () => true)
  p.flush()
  await new Promise((resolve) => setImmediate(resolve))
  p.flush()
  p.dispatch("wheel")
  p.dispatch("scrollend", { target: p.doc })
  assert.equal(title.calls.length, 1)
  assert.equal(p.listeners.get("scrollend").size, 0)
})
