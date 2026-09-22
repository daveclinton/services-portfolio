/**
 * Browser client for the Next.js AI routes in `app/api/`.
 *
 * The OpenAI key and `DATABASE_URL` live server-side only (plain env vars,
 * never `NEXT_PUBLIC_*`), so the browser only ever talks to our own
 * same-origin routes.
 */

import { INTENT_NAMES, type IntentName } from "./knowledge/intent"

export type ChatTurn = { role: "user" | "assistant"; content: string }

/** Which kind of portfolio question the server read this as. */
export type ChatIntent = IntentName

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "done"; finish_reason: string }
  | { type: "error"; detail: string }
  | { type: "rate_limit"; remaining: number; limit: number; reset: number }
  | { type: "retrieval"; intent: ChatIntent; notes: string[]; strategies: Record<string, number> }

export class AiApiError extends Error {}

/** Keep internal source references out of the conversational answer text. */
export function stripCitationMarkers(text: string): string {
  return text.replace(/\s*(?:\[\d+\])+/g, "")
}

/**
 * Parse one `event:` / `data:` block from a text/event-stream body.
 *
 * The API also streams `citations` frames; the UI renders the answer text plus
 * the intent the server read the question as, so citations are dropped here.
 */
function parseFrame(frame: string): ChatEvent | null {
  let name = "message"
  const data: string[] = []

  for (const rawLine of frame.split("\n")) {
    const line = rawLine.replace(/\r$/, "")
    if (!line || line.startsWith(":")) continue
    const colon = line.indexOf(":")
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? "" : line.slice(colon + 1)
    if (value.startsWith(" ")) value = value.slice(1)
    if (field === "event") name = value
    else if (field === "data") data.push(value)
  }

  if (data.length === 0) return null
  const payload = JSON.parse(data.join("\n")) as Record<string, unknown>

  switch (name) {
    case "retrieval":
      return {
        type: "retrieval",
        intent: asIntent(payload.intent),
        notes: Array.isArray(payload.notes) ? payload.notes.map(String) : [],
        strategies:
          typeof payload.strategies === "object" && payload.strategies !== null
            ? (payload.strategies as Record<string, number>)
            : {},
      }
    case "delta":
      return { type: "delta", text: (payload.text as string) ?? "" }
    case "done":
      return {
        type: "done",
        finish_reason: (payload.finish_reason as string) ?? "stop",
      }
    case "error":
      return {
        type: "error",
        detail: (payload.detail as string) ?? "The assistant failed to answer.",
      }
    default:
      return null
  }
}

/** Unknown or missing intents degrade to `general` rather than throwing. */
function asIntent(value: unknown): ChatIntent {
  return typeof value === "string" && (INTENT_NAMES as readonly string[]).includes(value)
    ? (value as IntentName)
    : "general"
}

async function readError(response: Response): Promise<string> {
  let detail: string | undefined
  try {
    const body = (await response.json()) as { detail?: string }
    detail = body?.detail
  } catch {
    // fall through to the generic message
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get("Retry-After"))
    if (Number.isFinite(seconds) && seconds > 0) {
      const wait = seconds < 60 ? `${Math.ceil(seconds)} seconds` : `${Math.ceil(seconds / 60)} minutes`
      return `${detail ?? "Too many questions."} Try again in ${wait}.`
    }
  }
  if (detail) return detail
  return `The assistant API answered ${response.status}.`
}

/**
 * Stream an answer as `delta` events, then `done` — or `error` if the server
 * has no API key configured.
 */
export async function* streamChat({
  messages,
  signal,
  improvementLogging = false,
  conversationId,
  turnId,
}: {
  messages: ChatTurn[]
  signal?: AbortSignal
  improvementLogging?: boolean
  conversationId?: string
  turnId?: string
}): AsyncGenerator<ChatEvent> {
  let response: Response
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        improvementLogging,
        ...(improvementLogging ? { conversationId, turnId } : {}),
      }),
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error
    throw new AiApiError(
      "Could not reach the assistant API. Is the app server reachable?"
    )
  }

  if (!response.ok) throw new AiApiError(await readError(response))
  if (!response.body) throw new AiApiError("This browser cannot stream responses.")

  const remainingHeader = response.headers.get("X-RateLimit-Remaining")
  const limitHeader = response.headers.get("X-RateLimit-Limit")
  const resetHeader = response.headers.get("X-RateLimit-Reset")
  if (remainingHeader !== null && limitHeader !== null && resetHeader !== null) {
    const remaining = Number(remainingHeader)
    const limit = Number(limitHeader)
    const reset = Number(resetHeader)
    if ([remaining, limit, reset].every(Number.isFinite)) {
      yield { type: "rate_limit", remaining, limit, reset }
    }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.indexOf("\n\n")
      while (boundary !== -1) {
        const event = parseFrame(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (event) yield event
        boundary = buffer.indexOf("\n\n")
      }
    }
    const trailing = parseFrame(buffer + decoder.decode())
    if (trailing) yield trailing
  } finally {
    // An aborted read can leave the stream locked, and `releaseLock` would
    // then throw from `finally` and mask the original error.
    try {
      reader.releaseLock()
    } catch {
      // nothing to release; the reader is already closing
    }
  }
}
