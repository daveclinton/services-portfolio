/**
 * Grounded answer generation (Phase 7 port).
 *
 * The model is never asked to answer from its own knowledge: it receives a
 * numbered list of retrieved chunks and must cite them or say it does not
 * know. Mirrors `backend/knowledge/generation/__init__.py`.
 */

import { sql } from "./db"
import type { SearchResult } from "./retrieval"

export const DEFAULT_MODEL = "gpt-4o-mini"

/** Returned verbatim (no model call) when retrieval finds nothing to stand on. */
export const NO_EVIDENCE_MESSAGE =
  "I don't have verified evidence in the knowledge base that answers that. " +
  "Try asking about a specific project, company, or technology from the timeline."

const SYSTEM_PROMPT = `\
You are the portfolio assistant for {name}. You answer questions about their \
background, work and skills.

Hard rules:
1. Answer ONLY from the numbered sources below. They come from a curated \
knowledge base where every claim is tied to evidence.
2. Use the numbered sources to verify every factual claim, but do not include \
source numbers, bracketed citations such as [1], or a sources list in the answer.
3. If the sources do not contain the answer, say you don't have verified \
evidence for it and stop. Never guess.
4. Never invent employers, dates, metrics, technologies or outcomes that are \
not in the sources.
5. Write in the third person about {name}, not in their voice.
6. Be concise: 2-5 sentences unless the question asks for detail.

Sources:
{context}`;

export interface Source {
  index: number
  chunk_id: number
  source_type: string
  source_path: string
  project_slug: string
  company_slug: string
  skill_slug: string
  excerpt: string
  citations: SearchResult["citations"]
}

function excerpt(text: string, limit = 700): string {
  const collapsed = (text ?? "").split(/\s+/).join(" ")
  if (collapsed.length <= limit) return collapsed
  return collapsed.slice(0, limit - 1).replace(/\s+$/, "") + "…"
}

/** Number the results for the model, keeping each chunk's citations. */
export function buildSources(results: SearchResult[]): Source[] {
  return results.map((result, i) => ({
    index: i + 1,
    chunk_id: result.chunk_id,
    source_type: result.source_type,
    source_path: result.source_path,
    project_slug: result.project_slug,
    company_slug: result.company_slug,
    skill_slug: result.skill_slug,
    excerpt: excerpt(result.content ?? ""),
    citations: result.citations,
  }))
}

function formatContext(sources: Source[]): string {
  if (sources.length === 0) return "(no sources retrieved)"
  return sources
    .map((source) => {
      const label = source.project_slug || source.company_slug || source.skill_slug
      const location = label ? ` — ${label}` : ""
      return `[${source.index}] (${source.source_type}${location})\n${source.excerpt}`
    })
    .join("\n\n")
}

export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

export interface ModelMessage {
  role: "system" | "user" | "assistant"
  content: string
}

/** Assemble the chat message list: system prompt, history, question. */
export function buildMessages(
  question: string,
  sources: Source[],
  options?: { personName?: string; history?: ChatTurn[] },
): ModelMessage[] {
  const name = options?.personName ?? "the candidate"
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT.replaceAll("{name}", name).replace(
        "{context}",
        formatContext(sources),
      ),
    },
  ]
  for (const turn of options?.history ?? []) {
    const content = (turn.content ?? "").trim()
    if ((turn.role === "user" || turn.role === "assistant") && content) {
      messages.push({ role: turn.role, content })
    }
  }
  messages.push({ role: "user", content: question })
  return messages
}

/** First person's name in the knowledge base, for the system prompt. */
export async function personName(): Promise<string> {
  const rows = (await sql().query(
    "SELECT name FROM knowledge_person ORDER BY id ASC LIMIT 1",
    [],
  )) as Array<{ name: string }>
  return rows[0]?.name ?? "the candidate"
}
