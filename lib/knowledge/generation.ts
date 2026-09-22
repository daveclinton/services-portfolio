/**
 * Grounded answer generation for the Next.js chat route.
 *
 * The model is never asked to answer from its own knowledge: it receives a
 * numbered list of retrieved chunks and must cite them or say it does not
 * know.
 */

import { sql } from "./db"
import { classifyQuestion, type QuestionIntent } from "./intent"
import type { SearchResult } from "./retrieval"

export const DEFAULT_MODEL = "gpt-4o-mini"

/** Returned verbatim (no model call) when retrieval finds nothing to stand on. */
export const NO_EVIDENCE_MESSAGE =
  "This assistant is designed to answer questions about David Clinton's work, " +
  "experience, projects, and skills. For other topics, try Google or the relevant " +
  "official documentation."

const SYSTEM_PROMPT = `\
You are the portfolio assistant for {name}. You answer questions about their \
background, work and skills.

Hard rules:
1. Answer ONLY from the numbered sources below. They come from a curated \
knowledge base where every claim is tied to evidence.
2. Use the numbered sources to verify every factual claim, but do not include \
source numbers, bracketed citations such as [1], or a sources list in the answer.
3. If the sources do not support an answer, return this scope message exactly \
and stop: "{fallback_message}" Never guess.
4. Never invent employers, dates, metrics, technologies or outcomes that are \
not in the sources.
5. Write in the third person about {name}, not in their voice.
6. Be concise: 2-5 sentences unless the question asks for detail.
7. Follow the question-intent guidance below. Do not substitute a technology \
inventory when the user asked about identity, work, projects, or impact.
8. Write the answer as natural prose with complete sentences and clear flow. \
Use one compact paragraph by default, or two short paragraphs when separating \
ideas makes the answer easier to read.
9. Do not use headings, bullet points, numbered lists, tables, labels, or \
résumé-style fragments unless the user explicitly asks for a list, comparison, \
steps, or another structured format.

Question intent: {intent}
Intent guidance: {intent_guidance}

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

/** The profile file is the anchor for broad questions, so it gets more room. */
const PROFILE_SOURCE_PATH = "knowledge/person/profile.md"

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
    excerpt: excerpt(
      result.content ?? "",
      result.source_path === PROFILE_SOURCE_PATH ? 1500 : 900,
    ),
    citations: result.citations,
  }))
}

/**
 * Render the numbered sources, appending the confirmed claims behind each one:
 * the markdown body alone can describe an artifact without stating its result.
 */
export function formatContext(sources: Source[]): string {
  if (sources.length === 0) return "(no sources retrieved)"
  return sources
    .map((source) => {
      const label = source.project_slug || source.company_slug || source.skill_slug
      const location = label ? ` — ${label}` : ""
      const claims = source.citations
        .slice(0, 3)
        .filter((citation) => citation.confidence === "confirmed")
        .map((citation) => citation.claim)
      const evidence = claims.length > 0 ? `\nVerified claims: ${claims.join(" | ")}` : ""
      return (
        `[${source.index}] (${source.source_type}${location})\n` +
        `${source.excerpt}${evidence}`
      )
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
  options?: { personName?: string; history?: ChatTurn[]; intent?: QuestionIntent },
): ModelMessage[] {
  const name = options?.personName ?? "the candidate"
  const intent = options?.intent ?? classifyQuestion(question)
  const messages: ModelMessage[] = [
    {
      role: "system",
      // Sources are substituted last so excerpt text can never be rescanned
      // for the prompt's own placeholder tokens.
      content: SYSTEM_PROMPT.replaceAll("{name}", name)
        .replaceAll("{intent_guidance}", intent.guidance)
        .replaceAll("{intent}", intent.name)
        .replaceAll("{fallback_message}", NO_EVIDENCE_MESSAGE)
        .replaceAll("{context}", formatContext(sources)),
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
