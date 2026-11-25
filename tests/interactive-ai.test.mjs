import assert from "node:assert/strict"
import test from "node:test"
import { answerViewFixture } from "./fixtures/answer-views.mjs"
import { answerConversationText, CHAT_LIMITS, INTERACTION_CONTEXT_LIMIT, parseAnswerView, parseViewState, streamChat, viewInteractionContext, viewTranscript } from "../lib/ai-client.ts"

const wire = (event, payload) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`

test("interactive streams retain real phases, a validated view, and the submitted selection", async (t) => {
  const view = answerViewFixture("architecture")
  const interactionContext = "Visitor selected Order processing."
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    const body = JSON.parse(options.body)
    assert.equal(body.interactive, true)
    assert.equal(body.interactionContext, interactionContext)
    return new Response(wire("status", { phase: "planning" }) + wire("status", { phase: "retrieving" }) + wire("delta", { text: "The systems exchange orders." }) + wire("view", view) + wire("done", { finish_reason: "stop" }))
  })
  const events = []
  for await (const event of streamChat({ messages: [{ role: "user", content: "Explain this connection" }], interactive: true, interactionContext })) events.push(event)
  assert.deepEqual(events.slice(0, 2), [{ type: "status", phase: "planning" }, { type: "status", phase: "retrieving" }])
  assert.equal(events[3].view.kind, "architecture")
  assert.equal(events[3].view.evidence[0].links[0].verified_at, "2026-11-24")
  assert.equal(events.at(-1).finish_reason, "stop")
})

test("views discard unsafe links, forged references, unsupported diagram edges, and invalid renderers", () => {
  assert.equal(parseAnswerView({ kind: "execute-javascript", items: [] }), null)
  const raw = answerViewFixture("architecture")
  raw.items.push({ ...raw.items[0], id: "invented", source_ids: [999] })
  raw.evidence[0].links.push({ title: "Unsafe", url: "javascript:alert(1)" }, { title: "Credentials", url: "https://u:p@example.com" })
  raw.connections.push({ from: "orders", to: "invented", source_ids: [1] }, { from: "sap", to: "orders", source_ids: [999] })
  const parsed = parseAnswerView(raw)
  assert.equal(parsed.items.length, 2)
  assert.equal(parsed.connections.length, 1)
  assert.equal(parsed.evidence[0].links.length, 1)
  raw.connections = []
  assert.equal(parseAnswerView(raw).kind, "text")
  const comparison = answerViewFixture("comparison")
  comparison.items = [{ ...comparison.items[0], id: "missing", status: "not_established", source_ids: [] }]
  assert.equal(parseAnswerView(comparison).items.length, 1)
  assert.equal(parseAnswerView({ ...answerViewFixture("timeline"), items: [{ ...comparison.items[0], period: "", source_ids: [1] }] }).kind, "text")
})

test("reviewed briefs and node selections survive serialization without gaining evidence authority", () => {
  const scope = parseAnswerView(answerViewFixture("scope"))
  const state = parseViewState(scope, JSON.parse(JSON.stringify({ edits: { goal: "Limit the pilot to one branch.", release: { invalid: true }, unknown: "Drop me" }, selectedId: "missing" })))
  assert.equal(state.edits.goal, "Limit the pilot to one branch.")
  assert.equal(state.edits.release, undefined)
  assert.equal(state.edits.unknown, undefined)
  assert.equal(state.selectedId, undefined)
  const context = viewInteractionContext(scope, state)
  assert(context.includes("edited by visitor"))
  assert(context.includes("not verified facts"))
  assert(context.includes(state.edits.goal))
  const copied = viewTranscript(scope, state)
  assert(copied.includes("David must confirm"))
  assert(copied.includes(state.edits.goal))
  const diagram = parseAnswerView(answerViewFixture("architecture"))
  const selected = parseViewState(diagram, { selectedId: "sap", edits: { sap: "Not a visitor-editable brief" } })
  assert(viewInteractionContext(diagram, selected).includes("SAP Business One"))
  assert.deepEqual(selected.edits, {})
  assert.equal(viewInteractionContext(diagram, {}), "")
})

test("maximum edited Unicode and escape-heavy briefs fit context and history budgets", () => {
  const view = parseAnswerView(answerViewFixture("scope"))
  const edits = Object.fromEntries(view.items.map((item) => [item.id, "\\\"\n🛠".repeat(100)]))
  const state = parseViewState(view, { edits })
  assert([...viewInteractionContext(view, state)].length < INTERACTION_CONTEXT_LIMIT)
  const history = answerConversationText("🛠".repeat(9000), view)
  assert([...history].length <= CHAT_LIMITS.messageChars)
  assert(history.includes("Interactive answer:"))
  assert(history.includes(view.items.at(-1).title))
})

test("invalid phases and views are ignored while prose remains usable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(wire("status", { phase: "imaginary-tool" }) + wire("view", { kind: "html", html: "<script>bad()</script>" }) + wire("delta", { text: "A readable answer." }) + wire("done", { finish_reason: "stop" })))
  const events = []
  for await (const event of streamChat({ messages: [{ role: "user", content: "Question" }] })) events.push(event)
  assert.deepEqual(events, [{ type: "delta", text: "A readable answer." }, { type: "done", finish_reason: "stop" }])
})
