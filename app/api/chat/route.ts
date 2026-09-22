/**
 * `POST /api/chat` — retrieval + grounded answer, streamed as SSE.
 *
 * Emits `retrieval`, `citations`, `delta`, `done`, and `error` frames for
 * `lib/ai-client.ts`. Generation streams through the Vercel AI SDK (`streamText`).
 */

import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { NextRequest } from "next/server"

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

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

interface ChatRequest {
  messages: ChatTurn[]
  mode: SearchMode
  limit: number
}

const MAX_TURNS = 12
const MAX_MESSAGE_CHARS = 8_000
const MAX_CONVERSATION_CHARS = 24_000
const MAX_REQUEST_CHARS = 32_000
const MAX_OUTPUT_TOKENS = 500

function badRequest(detail: string, errors?: unknown): Response {
  return Response.json({ detail, errors }, { status: 400 })
}

/** Validate the chat request before retrieval or generation. */
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

  return { messages: turns, mode: mode as SearchMode, limit }
}

export async function POST(request: NextRequest): Promise<Response> {
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

  const { messages, mode, limit } = parsed
  const question = messages[messages.length - 1].content
  const history = messages.slice(0, -1)

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

  let outcome
  try {
    outcome = await search(question, { mode, limit })
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

  const stream = new ReadableStream<string>({
    async start(controller) {
      const enqueue = (frame: string) => controller.enqueue(frame)
      try {
        enqueue(
          sse("retrieval", {
            notes: outcome.notes,
            strategies: outcome.strategies,
            intent: outcome.intent,
          }),
        )
        enqueue(sse("citations", { sources }))

        if (sources.length === 0) {
          enqueue(sse("delta", { text: NO_EVIDENCE_MESSAGE }))
          enqueue(sse("done", { finish_reason: "no_evidence" }))
          return
        }

        if (!process.env.OPENAI_API_KEY?.trim()) {
          enqueue(sse("error", { detail: MISSING_KEY_DETAIL }))
          enqueue(sse("done", { finish_reason: "error" }))
          return
        }

        const prompt = buildMessages(question, sources, {
          personName: await personName(),
          history,
        })
        // AI SDK v7 takes the system prompt via `instructions`, not `messages`.
        const [systemMessage, ...conversation] = prompt
        const result = streamText({
          model: openai(DEFAULT_MODEL),
          instructions: systemMessage.content,
          messages: conversation,
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        })
        for await (const text of result.textStream) {
          enqueue(sse("delta", { text }))
        }
        enqueue(sse("done", { finish_reason: "stop" }))
      } catch (error) {
        enqueue(sse("error", { detail: `generation failed: ${(error as Error)?.message ?? error}` }))
        enqueue(sse("done", { finish_reason: "stop" }))
      } finally {
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
