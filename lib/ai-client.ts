/**
 * Browser client for the Django AI API in `portfolio/backend/api/ai/`.
 *
 * The OpenAI key lives on the backend, so the browser only ever talks to
 * Django. Point `NEXT_PUBLIC_API_BASE_URL` at the deployed API in production;
 * in development it defaults to the local `runserver` port.
 */

export const aiApiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "")

export type AiCitation = {
  slug: string
  title: string
  claim: string
  evidence_type: string
  confidence: "confirmed" | "probable" | "unverified"
  project_slug: string
  company_slug: string
  source_url: string
  source_path: string
}

export type AiSource = {
  index: number
  chunk_id: number
  source_type: string
  source_path: string
  project_slug: string
  company_slug: string
  skill_slug: string
  excerpt: string
  citations: AiCitation[]
}

export type ChatTurn = { role: "user" | "assistant"; content: string }

export type ChatEvent =
  | { type: "retrieval"; notes: string[]; strategies: Record<string, number> }
  | { type: "citations"; sources: AiSource[] }
  | { type: "delta"; text: string }
  | { type: "done"; finish_reason: string }
  | { type: "error"; detail: string }

export type EvidenceDetail = {
  slug: string
  title: string
  claim: string
  description: string
  evidence_type: string
  confidence: "confirmed" | "probable" | "unverified"
  verified_at: string | null
  external_id: string
  source_url: string
  source_path: string
  project: { slug: string; name: string } | null
  company: { slug: string; name: string } | null
}

export class AiApiError extends Error {}

/** Parse one `event:` / `data:` block from a text/event-stream body. */
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
        notes: (payload.notes as string[]) ?? [],
        strategies: (payload.strategies as Record<string, number>) ?? {},
      }
    case "citations":
      return { type: "citations", sources: (payload.sources as AiSource[]) ?? [] }
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

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string }
    if (body?.detail) return body.detail
  } catch {
    // fall through to the generic message
  }
  return `The assistant API answered ${response.status}.`
}

/**
 * Stream a grounded answer.
 *
 * Yields `citations` first (so the UI can show sources while the text is still
 * arriving), then `delta` events, then `done` — or `error` if the backend has
 * no API key configured.
 */
export async function* streamChat({
  messages,
  signal,
}: {
  messages: ChatTurn[]
  signal?: AbortSignal
}): AsyncGenerator<ChatEvent> {
  let response: Response
  try {
    response = await fetch(`${aiApiBaseUrl}/api/ai/chat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error
    throw new AiApiError(
      "Could not reach the assistant API. Is the Django server running?"
    )
  }

  if (!response.ok) throw new AiApiError(await readError(response))
  if (!response.body) throw new AiApiError("This browser cannot stream responses.")

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

/** Fetch one evidence row for the `/evidence/[slug]` page. */
export async function fetchEvidence(slug: string): Promise<EvidenceDetail | null> {
  try {
    const response = await fetch(
      `${aiApiBaseUrl}/api/evidence/${encodeURIComponent(slug)}/`,
      { cache: "no-store" }
    )
    if (!response.ok) return null
    return (await response.json()) as EvidenceDetail
  } catch {
    return null
  }
}
