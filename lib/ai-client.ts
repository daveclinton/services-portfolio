// Mirrors IntentNames in backend/internal/askai/intent.go.
export const INTENT_NAMES = [
  "general",
  "biography",
  "rates",
  "experience",
  "projects",
  "skills",
  "technologies",
  "outcomes",
] as const

export type IntentName = (typeof INTENT_NAMES)[number]

// The Go API (backend/) runs on its own origin, e.g. https://api.daveclintonn.cc.
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "")

export type ChatTurn = { role: "user" | "assistant"; content: string }
export type ChatWorkflow = "chat" | "role_fit" | "interview" | "project_scope"
export type EvidenceSource = { title: string; url: string }

export type ChatIntent = IntentName

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "done"; finish_reason: string }
  | { type: "error"; detail: string }
  | { type: "rate_limit"; remaining: number; limit: number; reset: number }
  | { type: "retrieval"; intent: ChatIntent; notes: string[]; strategies: Record<string, number> }
  | { type: "citations"; sources: EvidenceSource[] }

export class AiApiError extends Error {}

// Mirrors backend/internal/askai/handlers.go. Bound what is sent, not what the
// reader can see: older turns remain in the UI and this tab's saved history.
export const CHAT_LIMITS = { messages: 12, messageChars: 8_000, conversationChars: 24_000, requestBytes: 32_000 } as const

export function prepareChatMessages(messages: ChatTurn[]): ChatTurn[] {
  const latest = messages.at(-1)
  if (!latest || latest.role !== "user" || !latest.content.trim()) throw new AiApiError("Please enter a question.")
  if ([...latest.content].length > CHAT_LIMITS.messageChars) throw new AiApiError("Please shorten your question before sending it.")

  const completed: ChatTurn[] = []
  let question: ChatTurn | undefined
  for (const turn of messages.slice(0, -1)) {
    if (turn.role === "user") question = turn
    else if (question && turn.content.trim()) {
      if ([...question.content].length <= CHAT_LIMITS.messageChars && [...turn.content].length <= CHAT_LIMITS.messageChars) {
        completed.push(question, turn)
      }
      question = undefined
    }
  }
  let recent = [...completed.slice(-(CHAT_LIMITS.messages - 2)), latest]
  while (recent.length > 1 && recent.reduce((total, turn) => total + [...turn.content].length, 0) > CHAT_LIMITS.conversationChars) {
    recent = recent.slice(2)
  }
  return recent
}

export function stripCitationMarkers(text: string): string {
  return text.replace(/\s*(?:\[\d+\])+/g, "")
}

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
    case "citations": {
      const sources: EvidenceSource[] = []
      const seen = new Set<string>()
      for (const source of Array.isArray(payload.sources) ? payload.sources : []) {
        if (!source || typeof source !== "object") continue
        for (const citation of Array.isArray(source.citations) ? source.citations : []) {
          if (citation?.confidence !== "confirmed" || typeof citation.source_url !== "string") continue
          const title = typeof citation.title === "string" ? citation.title.trim() : ""
          try {
            const url = new URL(citation.source_url)
            if (!title || !["https:", "http:"].includes(url.protocol) || url.username || url.password || seen.has(url.href)) continue
            seen.add(url.href)
            if (sources.length < 8) sources.push({ title, url: url.href })
          } catch {}
        }
      }
      return { type: "citations", sources }
    }
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
  } catch {}
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

export async function* streamChat({
  messages,
  signal,
  improvementLogging = false,
  conversationId,
  turnId,
  workflow = "chat",
}: {
  messages: ChatTurn[]
  signal?: AbortSignal
  improvementLogging?: boolean
  conversationId?: string
  turnId?: string
  workflow?: ChatWorkflow
}): AsyncGenerator<ChatEvent> {
  const payload = {
    messages: prepareChatMessages(messages),
    workflow,
    improvementLogging,
    ...(improvementLogging ? { conversationId, turnId } : {}),
  }
  let body = JSON.stringify(payload)
  while (payload.messages.length > 1 && new TextEncoder().encode(body).length > CHAT_LIMITS.requestBytes) {
    payload.messages = payload.messages.slice(2)
    body = JSON.stringify(payload)
  }
  if (new TextEncoder().encode(body).length > CHAT_LIMITS.requestBytes) throw new AiApiError("Please shorten your question before sending it.")
  let response: Response
  try {
    response = await fetch(`${API_URL}/ask-ai/chat`, {
      method: "POST",
      // Sends the signed visitor cookie the API uses for rate limits.
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body,
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
  let completed = false

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, "\n")
      let boundary = buffer.indexOf("\n\n")
      while (boundary !== -1) {
        const event = parseFrame(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (event) {
          if (event.type === "done") completed = true
          yield event
          if (completed) return
        }
        boundary = buffer.indexOf("\n\n")
      }
    }
    const trailing = parseFrame(buffer + decoder.decode())
    if (trailing) {
      if (trailing.type === "done") completed = true
      yield trailing
    }
    if (!completed) throw new AiApiError("The response was interrupted. Your messages are still here; please try again.")
  } finally {
    try {
      await reader.cancel()
      reader.releaseLock()
    } catch {}
  }
}
