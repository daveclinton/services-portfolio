import assert from "node:assert/strict"
import test from "node:test"
import { CHAT_LIMITS, streamChat } from "../lib/ai-client.ts"
import { buildProjectScopeRequest, PROJECT_SCOPE_ANSWER_LIMIT, projectScopeQuestions } from "../lib/project-scope.ts"

test("discovery requires a real problem and preserves unknowns instead of inventing requirements", () => {
  assert.throws(() => buildProjectScopeRequest([]), /six project questions/)
  assert.throws(() => buildProjectScopeRequest(projectScopeQuestions.map(() => "   ")), /describe the problem/)
  const answers = ["  Reduce time looking up orders.  ", "", "SAP Business One", "", "", "Fewer calls to a manager"]
  const request = buildProjectScopeRequest(answers)
  assert(request.includes("What problem should this project solve?\nReduce time looking up orders."))
  assert(request.includes("Which systems does it need to work with?\nSAP Business One"))
  assert.equal(request.match(/Not provided — clarify before agreeing scope\./g).length, 3)
  assert.equal(answers[0], "  Reduce time looking up orders.  ")
  assert.throws(() => buildProjectScopeRequest(["x".repeat(PROJECT_SCOPE_ANSWER_LIMIT + 1), "", "", "", "", ""]), /shorten each answer/)
})

test("maximum Unicode discovery answers fit the chat API including consent and identifiers", async (t) => {
  const request = buildProjectScopeRequest(projectScopeQuestions.map(() => "🛠".repeat(PROJECT_SCOPE_ANSWER_LIMIT)))
  assert([...request].length < CHAT_LIMITS.messageChars)
  let payload
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert(new TextEncoder().encode(options.body).length < CHAT_LIMITS.requestBytes)
    payload = JSON.parse(options.body)
    return new Response('event: done\ndata: {"finish_reason":"stop"}\n\n')
  })
  for await (const event of streamChat({
    messages: [{ role: "user", content: request }],
    workflow: "project_scope",
    improvementLogging: true,
    conversationId: "0b6d3f0e-6f3a-4c1e-9a55-2f5d8c7e1a90",
    turnId: "1b6d3f0e-6f3a-4c1e-9a55-2f5d8c7e1a90",
  })) assert.equal(event.type, "done")
  assert.equal(payload.workflow, "project_scope")
  assert.equal(payload.improvementLogging, true)
  assert.equal(payload.messages[0].content, request)
})
