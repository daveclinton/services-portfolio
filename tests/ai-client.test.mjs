import assert from "node:assert/strict"
import test from "node:test"
import { AiApiError, CHAT_LIMITS, historyThroughQuestion, prepareChatMessages, streamChat } from "../lib/ai-client.ts"

const question = [{ role: "user", content: "What has David built?" }]
const wire = (event, payload) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
async function collect(options) {
  const events = []
  for await (const event of streamChat(options)) events.push(event)
  return events
}

test("long histories retain complete recent exchanges without changing visible history", () => {
  const history = []
  for (let index = 0; index < 50; index++) {
    history.push({ role: "user", content: `Question ${index}` }, { role: "assistant", content: `Answer ${index}` })
  }
  history.push(...question)
  const recent = prepareChatMessages(history)
  assert.equal(recent.length, 11)
  assert.equal(history.length, 101)
  assert.equal(recent.at(-1).content, question[0].content)
  assert(recent.every((turn, index) => turn.role === (index % 2 ? "assistant" : "user")))
  assert.deepEqual(prepareChatMessages([{ role: "user", content: "Failed question" }, { role: "assistant", content: "" }, ...question]), question)
  assert.throws(() => prepareChatMessages([{ role: "user", content: "x".repeat(8001) }]), AiApiError)
})

test("selected workflow and Unicode request bytes remain within the server contract", async (t) => {
  let payload
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert(new TextEncoder().encode(options.body).length <= CHAT_LIMITS.requestBytes)
    payload = JSON.parse(options.body)
    return new Response(wire("delta", { text: "Answer" }) + wire("done", { finish_reason: "stop" }))
  })
  const history = []
  for (let index = 0; index < 4; index++) history.push({ role: "user", content: "漢".repeat(4000) }, { role: "assistant", content: "字".repeat(4000) })
  await collect({ messages: [...history, ...question], workflow: "role_fit" })
  assert.equal(payload.workflow, "role_fit")
  assert.equal(payload.messages.length, 3)
  assert.equal(payload.messages.at(-1).content, question[0].content)
})

test("question revisions preserve earlier exchanges and original context without sending later answers", async (t) => {
  const history = Object.freeze([
    Object.freeze({ id: "q1", role: "user", content: "First question" }),
    Object.freeze({ id: "a1", role: "assistant", content: "First answer" }),
    Object.freeze({ id: "q2", role: "user", content: "Original question", interactionContext: "Original selected project", workflow: "role_fit" }),
    Object.freeze({ id: "a2", role: "assistant", content: "Later answer that must be replaced" }),
    Object.freeze({ id: "q3", role: "user", content: "Later question", interactionContext: "Future brief context" }),
  ])
  const revision = historyThroughQuestion([...history], "q2")
  assert.deepEqual(revision.map((turn) => turn.id), ["q1", "a1", "q2"])
  assert.equal(history.length, 5)
  assert.equal(history[2].content, "Original question")
  assert.deepEqual(historyThroughQuestion([...history], "missing"), [])
  assert.deepEqual(historyThroughQuestion([...history], "a1"), [])

  let payload
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    payload = JSON.parse(options.body)
    return new Response(wire("delta", { text: "Revised answer" }) + wire("done", { finish_reason: "stop" }))
  })
  const original = revision.at(-1)
  await collect({ messages: [...revision.slice(0, -1), { ...original, content: "Revised question" }], workflow: original.workflow, interactionContext: original.interactionContext })
  assert.deepEqual(payload.messages.map((turn) => turn.content), ["First question", "First answer", "Revised question"])
  assert.equal(payload.interactionContext, "Original selected project")
  assert.equal(payload.workflow, "role_fit")
  assert(!JSON.stringify(payload).includes("Future brief context"))
})

test("fragmented CRLF and UTF-8 streams stop reading after the terminal event", async (t) => {
  let cancelled = false
  const data = (wire("delta", { text: "こんにちは" }) + wire("done", { finish_reason: "stop" })).replaceAll("\n", "\r\n")
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) {
      for (const byte of new TextEncoder().encode(data)) controller.enqueue(new Uint8Array([byte]))
    },
    cancel() { cancelled = true },
  })))
  assert.deepEqual(await collect({ messages: question }), [{ type: "delta", text: "こんにちは" }, { type: "done", finish_reason: "stop" }])
  assert(cancelled)
})

test("evidence links are confirmed, unique and use safe public-link protocols", async (t) => {
  const citations = [
    { title: "Verified work", source_url: "https://example.com/project", confidence: "confirmed" },
    { title: "Duplicate", source_url: "https://example.com/project", confidence: "confirmed" },
    { title: "Unverified", source_url: "https://example.com/unverified", confidence: "unverified" },
    { title: "Unsafe", source_url: "javascript:alert(1)", confidence: "confirmed" },
    { title: "Credentials", source_url: "https://user:password@example.com", confidence: "confirmed" },
  ]
  t.mock.method(globalThis, "fetch", async () => new Response(wire("citations", { sources: [{ citations }] }) + wire("done", { finish_reason: "evidence_only" })))
  const events = await collect({ messages: question })
  assert.deepEqual(events[0], { type: "citations", sources: [{ title: "Verified work", url: "https://example.com/project" }] })
  assert.equal(events[1].finish_reason, "evidence_only")
})

test("HTTP 200 without a terminal event is an interrupted response", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(wire("delta", { text: "Partial answer" })))
  const events = []
  await assert.rejects(async () => { for await (const event of streamChat({ messages: question })) events.push(event) }, /response was interrupted/)
  assert.deepEqual(events, [{ type: "delta", text: "Partial answer" }])
})

test("rate-limit feedback preserves the provider retry interval", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Too many questions." }), { status: 429, headers: { "Retry-After": "10" } }))
  await assert.rejects(() => collect({ messages: question }), /10 seconds/)
})
