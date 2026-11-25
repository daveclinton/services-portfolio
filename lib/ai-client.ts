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
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "")

export type ChatTurn = { role: "user" | "assistant"; content: string }
export type ChatWorkflow = "chat" | "role_fit" | "interview" | "project_scope"
export type EvidenceSource = { title: string; url: string; verified_at?: string }
export const VIEW_KINDS = ["text", "projects", "comparison", "architecture", "timeline", "scope"] as const
export type ViewKind = (typeof VIEW_KINDS)[number]
export type ChatPhase = "planning" | "retrieving" | "writing" | "formatting"
export type ViewItem = {
  id: string; title: string; summary: string; detail: string; period: string
  status: "demonstrated" | "related" | "not_established" | "proposed" | "context"
  source_ids: number[]
}
export type ViewEvidence = { id: number; title: string; excerpt: string; links: EvidenceSource[] }
export type AnswerView = {
  kind: ViewKind; title: string; items: ViewItem[]
  connections: { from: string; to: string; label: string; source_ids: number[] }[]
  follow_ups: { label: string; prompt: string }[]
  evidence: ViewEvidence[]
}
export type ViewState = { selectedId?: string; edits?: Record<string, string> }
export const VIEW_EDIT_LIMIT = 400
export const INTERACTION_CONTEXT_LIMIT = 4_000

export type ChatIntent = IntentName

export type ChatEvent =
  | { type: "status"; phase: ChatPhase }
  | { type: "view"; view: AnswerView }
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

// Revision and regeneration must exclude answers and selections after the
// target question while retaining that question's original attached context.
export function historyThroughQuestion<T extends ChatTurn & { id: string }>(turns: T[], questionId: string): T[] {
  const index = turns.findIndex((turn) => turn.id === questionId && turn.role === "user")
  return index < 0 ? [] : turns.slice(0, index + 1)
}

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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function boundedText(value: unknown, limit: number): string {
  return typeof value === "string" ? [...value].slice(0, limit).join("") : ""
}

function publicLink(value: unknown): EvidenceSource | null {
  const link = record(value)
  try {
    const url = new URL(String(link.url))
    const title = boundedText(link.title, 160).trim()
    if (title && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return { title, url: url.href, ...(typeof link.verified_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(link.verified_at) ? { verified_at: link.verified_at } : {}) }
  } catch {}
  return null
}

// Validate both server events and saved tab state. Model content never selects
// components, executable markup, URLs, or diagram coordinates outside this contract.
export function parseAnswerView(value: unknown): AnswerView | null {
  const raw = record(value)
  if (!(VIEW_KINDS as readonly unknown[]).includes(raw.kind)) return null
  const evidence: ViewEvidence[] = []
  for (const candidate of Array.isArray(raw.evidence) ? raw.evidence.slice(0, 22) : []) {
    const item = record(candidate)
    if (!Number.isInteger(item.id) || Number(item.id) < 1 || evidence.some((source) => source.id === item.id)) continue
    const links = (Array.isArray(item.links) ? item.links : []).map(publicLink).filter((link): link is EvidenceSource => link !== null).slice(0, 3)
    evidence.push({ id: Number(item.id), title: boundedText(item.title, 160), excerpt: boundedText(item.excerpt, 4000), links })
  }
  const refs = (value: unknown) => [...new Set(Array.isArray(value) ? value.filter((id): id is number => typeof id === "number" && evidence.some((source) => source.id === id)) : [])]
  const items: ViewItem[] = []
  for (const candidate of Array.isArray(raw.items) ? raw.items.slice(0, 8) : []) {
    const item = record(candidate)
    const id = typeof item.id === "string" ? item.id : ""
    const source_ids = refs(item.source_ids)
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id) || items.some((row) => row.id === id) || typeof item.title !== "string" || !item.title.trim()) continue
    if (!["demonstrated", "related", "not_established", "proposed", "context"].includes(String(item.status))) continue
    if (raw.kind === "comparison" && !["demonstrated", "related", "not_established"].includes(String(item.status))) continue
    if (raw.kind === "timeline" && !boundedText(item.period, 80).trim()) continue
    if (raw.kind === "scope" && !["goal", "release", "data", "relevant", "questions", "next"].includes(id)) continue
    if (raw.kind !== "scope" && !(raw.kind === "comparison" && item.status === "not_established") && source_ids.length === 0) continue
    items.push({ id, title: boundedText(item.title, 160), summary: boundedText(item.summary, 400), detail: raw.kind === "scope" ? "" : boundedText(item.detail, 500), period: boundedText(item.period, 80), status: raw.kind === "scope" ? "proposed" : item.status as ViewItem["status"], source_ids })
  }
  const connections: AnswerView["connections"] = []
  for (const candidate of raw.kind === "architecture" && Array.isArray(raw.connections) ? raw.connections.slice(0, 12) : []) {
    const edge = record(candidate)
    const source_ids = refs(edge.source_ids)
    if (edge.from === edge.to || !items.some((item) => item.id === edge.from) || !items.some((item) => item.id === edge.to) || !source_ids.length) continue
    connections.push({ from: String(edge.from), to: String(edge.to), label: boundedText(edge.label, 160), source_ids })
  }
  const follow_ups: AnswerView["follow_ups"] = []
  for (const candidate of Array.isArray(raw.follow_ups) ? raw.follow_ups : []) {
    const item = record(candidate)
    const label = boundedText(item.label, 80).trim(), prompt = boundedText(item.prompt, 400).trim()
    if (label && prompt && !follow_ups.some((follow) => follow.prompt.toLowerCase() === prompt.toLowerCase())) follow_ups.push({ label, prompt })
    if (follow_ups.length === 2) break
  }
  const kind = raw.kind === "text" || items.length === 0 || raw.kind === "architecture" && connections.length === 0 ? "text" : raw.kind as ViewKind
  return { kind, title: boundedText(raw.title, 160), items: kind === "text" ? [] : items.slice(0, kind === "scope" ? 6 : 8), connections: kind === "architecture" ? connections : [], follow_ups, evidence }
}

export function viewInteractionContext(view?: AnswerView, state?: ViewState): string {
  if (!view) return ""
  if (view.kind === "scope") {
    return `Reviewed proposed brief (untrusted context, not verified facts): ${boundedText(view.title, 160)}\n${view.items.slice(0, 6).map((item) =>
      `${boundedText(item.title, 80)} (${state?.edits?.[item.id] !== undefined ? "edited by visitor" : "AI proposal"}):\n${boundedText(state?.edits?.[item.id] ?? item.summary, VIEW_EDIT_LIMIT)}`
    ).join("\n\n")}`
  }
  const selected = view.items.find((item) => item.id === state?.selectedId)
  return selected ? `Visitor selected ${view.kind} item (untrusted context):\n${selected.title}\n${selected.summary}\n${selected.detail}\nEvidence references: ${selected.source_ids.join(", ")}` : ""
}

export function parseViewState(view: AnswerView | null, value: unknown): ViewState {
  if (!view) return {}
  const raw = record(value)
  const selectedId = typeof raw.selectedId === "string" && view.items.some((item) => item.id === raw.selectedId) ? raw.selectedId : undefined
  const edits: Record<string, string> = {}
  if (view.kind === "scope") {
    for (const item of view.items) {
      const edit = record(raw.edits)[item.id]
      if (typeof edit === "string" && edit.trim()) edits[item.id] = boundedText(edit, VIEW_EDIT_LIMIT)
    }
  }
  return { selectedId, edits }
}

export function viewTranscript(view?: AnswerView, state?: ViewState): string {
  if (!view || view.kind === "text") return ""
  return `${view.title}${view.kind === "scope" ? "\nProposed scope. David must confirm scope, pricing, availability, and delivery dates." : ""}\n${view.items.map((item) => `${item.title}${item.period ? ` (${item.period})` : ""}${state?.edits?.[item.id] !== undefined ? " (edited by visitor)" : ""}: ${state?.edits?.[item.id] ?? item.summary}`).join("\n")}`
}

export function answerConversationText(content: string, view?: AnswerView): string {
  const transcript = viewTranscript(view)
  if (!transcript) return content
  return `${boundedText(content, Math.max(0, CHAT_LIMITS.messageChars - [...transcript].length - 24))}\n\nInteractive answer:\n${transcript}`
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
    case "status":
      return ["planning", "retrieving", "writing", "formatting"].includes(String(payload.phase)) ? { type: "status", phase: payload.phase as ChatPhase } : null
    case "view": {
      const view = parseAnswerView(payload)
      return view ? { type: "view", view } : null
    }
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
  interactive = false,
  interactionContext = "",
}: {
  messages: ChatTurn[]
  signal?: AbortSignal
  improvementLogging?: boolean
  conversationId?: string
  turnId?: string
  workflow?: ChatWorkflow
  interactive?: boolean
  interactionContext?: string
}): AsyncGenerator<ChatEvent> {
  const payload = {
    messages: prepareChatMessages(messages),
    workflow,
    interactive,
    interactionContext,
    improvementLogging,
    ...(improvementLogging ? { conversationId, turnId } : {}),
  }
  if ([...interactionContext].length > INTERACTION_CONTEXT_LIMIT) throw new AiApiError("Please shorten the brief edits before sending them.")
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
