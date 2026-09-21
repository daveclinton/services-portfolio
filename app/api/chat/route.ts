/**
 * `POST /api/chat` — retrieval + grounded answer, streamed as SSE.
 *
 * Emits `retrieval`, `citations`, `delta`, `done`, and `error` frames for
 * `lib/ai-client.ts`. Generation streams through the Vercel AI SDK (`streamText`).
 */

import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

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
  model?: string
}

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
  const turns: ChatTurn[] = []
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
    if (content.length > 8000) {
      return badRequest("invalid request", { messages: ["content is too long (max 8000 chars)"] })
    }
    turns.push({ role, content })
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

  let model: string | undefined
  if (payload.model !== undefined) {
    if (typeof payload.model !== "string" || payload.model.trim().length === 0) {
      return badRequest("invalid request", { model: ["model must be a non-empty string"] })
    }
    if (payload.model.length > 100) {
      return badRequest("invalid request", { model: ["model is too long (max 100 chars)"] })
    }
    model = payload.model
  }

  return { messages: turns, mode: mode as SearchMode, limit, model }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("request body must be valid JSON")
  }

  const parsed = parseRequest(body)
  if (parsed instanceof Response) return parsed

  const { messages, mode, limit, model } = parsed
  const question = messages[messages.length - 1].content
  const history = messages.slice(0, -1)

  let outcome
  try {
    outcome = await search(question, { mode, limit })
  } catch (error) {
    return Response.json(
      { detail: `retrieval failed: ${(error as Error)?.message ?? error}` },
      { status: 500 },
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
          model: openai(model ?? DEFAULT_MODEL),
          instructions: systemMessage.content,
          messages: conversation,
          temperature: 0.2,
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
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
}

export type { FiltersPayload }
