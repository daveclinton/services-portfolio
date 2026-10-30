import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { after, type NextRequest } from "next/server"

import {
  claimConversationAlert,
  conversationLogContext,
  logConversationTurn,
  releaseConversationAlert,
  type ConversationTurnLog,
} from "@/lib/conversation-logging"
import { sendConversationAlert } from "@/lib/conversation-alerts"

import {
  buildMessages,
  buildSources,
  DEFAULT_MODEL,
  NO_EVIDENCE_MESSAGE,
  personName,
  type ChatTurn,
} from "@/lib/knowledge/generation"
import {
  MODES,
  search,
  type FiltersPayload,
  type SearchMode,
} from "@/lib/knowledge/retrieval"
import { selectChatWorkflow } from "@/lib/knowledge/intent"
import { classifyQuestionHybrid } from "@/lib/knowledge/intent-classifier"
import {
  acquireChatLock,
  enforceRateLimit,
  rateLimitResponse,
  releaseChatLock,
  withRateLimitHeaders,
} from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

const MISSING_KEY_DETAIL =
  "OPENAI_API_KEY is not configured on the server, so grounded answers cannot be generated"
const CREDITS_EXHAUSTED_DETAIL =
  "My OpenAI credits are exhausted. While I top them up, you can contact me or explore the homepage."
const GENERATION_UNAVAILABLE_DETAIL =
  "Ask AI could not complete that response. Please try again later, contact me, or explore the homepage."

function errorText(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  const seen = new Set<unknown>()
  while (current && !seen.has(current)) {
    seen.add(current)
    if (current instanceof Error) parts.push(current.message)
    if (typeof current === "object") {
      const value = current as Record<string, unknown>
      for (const key of ["code", "type", "responseBody"]) {
        if (typeof value[key] === "string") parts.push(value[key])
      }
      current = value.cause
    } else {
      parts.push(String(current))
      break
    }
  }
  return parts.join(" ").toLowerCase()
}

function isCreditExhaustionError(error: unknown): boolean {
  const detail = errorText(error)
  return [
    "credit_balance_exhausted",
    "insufficient_quota",
    "organization_usage_limit_exceeded",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "exceeded your current quota",
  ].some((marker) => detail.includes(marker))
}

async function storeAndAlertConversation(entry: ConversationTurnLog): Promise<void> {
  try {
    await logConversationTurn(entry)
  } catch (error) {
    console.error("Failed to store opted-in conversation", error)
    return
  }

  let claimed = false
  try {
    claimed = await claimConversationAlert(entry.conversationId)
    if (!claimed) return
    await sendConversationAlert(entry)
  } catch (error) {
    console.error("Failed to send conversation-session alert", error)
    if (claimed) {
      await releaseConversationAlert(entry.conversationId).catch((releaseError) => {
        console.error("Failed to release conversation-session alert claim", releaseError)
      })
    }
  }
}

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

interface ChatRequest {
  messages: ChatTurn[]
  mode: SearchMode
  limit: number
  logging: { conversationId: string; turnId: string }
}

const MAX_TURNS = 12
const MAX_MESSAGE_CHARS = 8_000
const MAX_CONVERSATION_CHARS = 24_000
const MAX_REQUEST_CHARS = 32_000
const MAX_OUTPUT_TOKENS = 500
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function badRequest(detail: string, errors?: unknown): Response {
  return Response.json({ detail, errors }, { status: 400 })
}

function parseRequest(body: unknown): ChatRequest | Response {
  if (typeof body !== "object" || body === null) {
    return badRequest("request body must be a JSON object")
  }
  const payload = body as Record<string, unknown>

  const messages = payload.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return badRequest("invalid request", { messages: ["at least one message is required"] })
  }
  if (messages.length > MAX_TURNS) {
    return badRequest("invalid request", {
      messages: [`conversation is too long (max ${MAX_TURNS} turns)`],
    })
  }
  const turns: ChatTurn[] = []
  let conversationChars = 0
  for (const turn of messages) {
    if (typeof turn !== "object" || turn === null) {
      return badRequest("invalid request", { messages: ["each message needs a role and content"] })
    }
    const { role, content } = turn as Record<string, unknown>
    if (role !== "user" && role !== "assistant") {
      return badRequest("invalid request", { messages: ["role must be user or assistant"] })
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return badRequest("invalid request", { messages: ["content must not be blank"] })
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return badRequest("invalid request", {
        messages: [`content is too long (max ${MAX_MESSAGE_CHARS} chars)`],
      })
    }
    conversationChars += content.length
    turns.push({ role, content })
  }
  if (conversationChars > MAX_CONVERSATION_CHARS) {
    return badRequest("invalid request", {
      messages: [`conversation is too large (max ${MAX_CONVERSATION_CHARS} chars)`],
    })
  }
  if (turns[turns.length - 1].role !== "user") {
    return badRequest("invalid request", { messages: ["the last message must come from the user"] })
  }

  const mode = payload.mode ?? "hybrid"
  if (typeof mode !== "string" || !(MODES as readonly string[]).includes(mode)) {
    return badRequest("invalid request", { mode: [`mode must be one of ${MODES.join(", ")}`] })
  }

  const limit: unknown = payload.limit ?? 8
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 20) {
    return badRequest("invalid request", { limit: ["limit must be an integer between 1 and 20"] })
  }

  const improvementLogging = payload.improvementLogging
  if (improvementLogging !== true) {
    return badRequest("invalid request", {
      improvementLogging: ["conversation-storage consent is required to use Ask AI"],
    })
  }

  const conversationId = payload.conversationId
  const turnId = payload.turnId
  if (
    typeof conversationId !== "string" ||
    typeof turnId !== "string" ||
    !UUID_PATTERN.test(conversationId) ||
    !UUID_PATTERN.test(turnId)
  ) {
    return badRequest("invalid request", {
      logging: ["valid conversationId and turnId UUIDs are required"],
    })
  }

  return {
    messages: turns,
    mode: mode as SearchMode,
    limit,
    logging: { conversationId, turnId },
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const startedAt = Date.now()
  let gate
  try {
    gate = await enforceRateLimit(request, "chat")
  } catch (error) {
    console.error("Chat rate limiting is unavailable", error)
    return Response.json(
      { detail: "The assistant is temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Retry-After": "30" } },
    )
  }
  if (!gate.allowed) return rateLimitResponse(gate)

  let body: unknown
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0)
    if (contentLength > MAX_REQUEST_CHARS) {
      return withRateLimitHeaders(badRequest("request body is too large"), gate)
    }
    const rawBody = await request.text()
    if (rawBody.length > MAX_REQUEST_CHARS) {
      return withRateLimitHeaders(badRequest("request body is too large"), gate)
    }
    body = JSON.parse(rawBody)
  } catch {
    return withRateLimitHeaders(badRequest("request body must be valid JSON"), gate)
  }

  const parsed = parseRequest(body)
  if (parsed instanceof Response) return withRateLimitHeaders(parsed, gate)

  const { messages, mode, limit, logging } = parsed
  const question = messages[messages.length - 1].content
  const history = messages.slice(0, -1)
  const workflow = selectChatWorkflow(question)

  if (workflow.action === "reply") {
    const requestContext = conversationLogContext(request)
    const latencyMs = Math.max(0, Date.now() - startedAt)
    after(async () => {
      await storeAndAlertConversation({
        ...requestContext,
        ...logging,
        question,
        answer: workflow.response,
        status: "completed",
        intent: workflow.intent,
        intentSource: "rules",
        intentConfidence: 1,
        model: "",
        sourceCount: 0,
        latencyMs,
      })
    })

    const stream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue(
          sse("retrieval", {
            notes: ["Handled by the conversational workflow."],
            strategies: { conversational: 1 },
            intent: workflow.intent,
          }),
        )
        controller.enqueue(sse("citations", { sources: [] }))
        controller.enqueue(sse("delta", { text: workflow.response }))
        controller.enqueue(sse("done", { finish_reason: "conversation" }))
        controller.close()
      },
    })
    return withRateLimitHeaders(
      new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      }),
      gate,
    )
  }

  let lockToken: string | null
  try {
    lockToken = await acquireChatLock(gate.visitorId)
  } catch (error) {
    console.error("Chat concurrency control is unavailable", error)
    return withRateLimitHeaders(
      Response.json(
        { detail: "The assistant is temporarily unavailable. Please try again shortly." },
        { status: 503, headers: { "Retry-After": "30" } },
      ),
      gate,
    )
  }
  if (!lockToken) {
    return withRateLimitHeaders(
      Response.json(
        { detail: "A response is already being generated. Please wait for it to finish." },
        { status: 429, headers: { "Retry-After": "2" } },
      ),
      gate,
    )
  }

  const intentDecision = await classifyQuestionHybrid(question, history)
  let outcome
  try {
    outcome = await search(question, {
      mode,
      limit,
      intent: intentDecision.intent,
      retrievalQueries: intentDecision.plan.retrievalQueries,
    })
  } catch (error) {
    await releaseChatLock(gate.visitorId, lockToken).catch((releaseError) => {
      console.error("Failed to release chat lock", releaseError)
    })
    console.error("Chat retrieval failed", error)
    return withRateLimitHeaders(
      Response.json({ detail: "The assistant could not retrieve an answer." }, { status: 500 }),
      gate,
    )
  }

  const sources = buildSources(outcome.results)

  let finishLog: (result: Pick<ConversationTurnLog, "answer" | "status" | "model">) => void
  const requestContext = conversationLogContext(request)
  const completion = new Promise<Pick<ConversationTurnLog, "answer" | "status" | "model">>(
    (resolve) => {
      finishLog = resolve
    },
  )
  after(async () => {
    const completed = await completion
    await storeAndAlertConversation({
      ...requestContext,
      ...logging,
      ...completed,
      question,
      intent: outcome.intent,
      intentSource: intentDecision.source,
      intentConfidence: intentDecision.confidence,
      sourceCount: sources.length,
      latencyMs: Math.max(0, Date.now() - startedAt),
    })
  })

  const stream = new ReadableStream<string>({
    async start(controller) {
      const enqueue = (frame: string) => controller.enqueue(frame)
      let loggedAnswer = ""
      let loggedStatus: ConversationTurnLog["status"] = "error"
      let loggedModel = ""
      try {
        enqueue(
          sse("retrieval", {
            notes: [
              ...outcome.notes,
              `Response plan selected by ${intentDecision.source}.`,
              `Goal: ${intentDecision.plan.goal}; response mode: ${intentDecision.plan.responseMode}.`,
            ],
            strategies: outcome.strategies,
            intent: outcome.intent,
          }),
        )
        enqueue(sse("citations", { sources }))

        if (sources.length === 0) {
          loggedAnswer = NO_EVIDENCE_MESSAGE
          loggedStatus = "no_evidence"
          enqueue(sse("delta", { text: NO_EVIDENCE_MESSAGE }))
          enqueue(sse("done", { finish_reason: "no_evidence" }))
          return
        }

        if (!process.env.OPENAI_API_KEY?.trim()) {
          loggedAnswer = MISSING_KEY_DETAIL
          enqueue(sse("error", { detail: MISSING_KEY_DETAIL }))
          enqueue(sse("done", { finish_reason: "error" }))
          return
        }

        const prompt = buildMessages(question, sources, {
          personName: await personName(),
          history,
          intent: intentDecision.intent,
          plan: intentDecision.plan,
        })
        const [systemMessage, ...conversation] = prompt
        const result = streamText({
          model: openai(DEFAULT_MODEL),
          instructions: systemMessage.content,
          messages: conversation,
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        })
        loggedModel = DEFAULT_MODEL
        for await (const text of result.textStream) {
          loggedAnswer += text
          enqueue(sse("delta", { text }))
        }
        loggedStatus = "completed"
        enqueue(sse("done", { finish_reason: "stop" }))
      } catch (error) {
        console.error("Chat generation failed", error)
        loggedAnswer = isCreditExhaustionError(error)
          ? CREDITS_EXHAUSTED_DETAIL
          : GENERATION_UNAVAILABLE_DETAIL
        enqueue(
          sse("error", {
            detail: loggedAnswer,
          }),
        )
        enqueue(sse("done", { finish_reason: "error" }))
      } finally {
        finishLog({ answer: loggedAnswer, status: loggedStatus, model: loggedModel })
        controller.close()
        await releaseChatLock(gate.visitorId, lockToken).catch((error) => {
          console.error("Failed to release chat lock", error)
        })
      }
    },
  })

  return withRateLimitHeaders(new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  }), gate)
}

export type { FiltersPayload }
