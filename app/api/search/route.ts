/**
 * `POST /api/search` — retrieval only, no LLM.
 *
 * Next.js port of Django's `search_view` (`backend/api/ai/views.py`).
 * Response shape matches `SearchOutcome.as_dict()`.
 */

import {
  MODES,
  search,
  type FiltersPayload,
  type SearchMode,
} from "@/lib/knowledge/retrieval"

export const runtime = "nodejs"
export const maxDuration = 60

function badRequest(detail: string, errors?: unknown): Response {
  return Response.json({ detail, errors }, { status: 400 })
}

function parseFilters(value: unknown): FiltersPayload | null | Response {
  if (value === undefined || value === null) return null
  if (typeof value !== "object" || Array.isArray(value)) {
    return badRequest("invalid request", { filters: ["filters must be an object"] })
  }
  const out: FiltersPayload = {}
  for (const key of [
    "source_type",
    "source_group",
    "project_slug",
    "company_slug",
    "skill_slug",
  ] as const) {
    const raw = (value as Record<string, unknown>)[key]
    if (raw === undefined) continue
    const list = Array.isArray(raw) ? raw : [raw]
    if (!list.every((item) => typeof item === "string" && item.length <= 200)) {
      return badRequest("invalid request", {
        filters: [`${key} must be a list of strings (max 200 chars)`],
      })
    }
    out[key] = list as string[]
  }
  return out
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("request body must be valid JSON")
  }
  if (typeof body !== "object" || body === null) {
    return badRequest("request body must be a JSON object")
  }
  const payload = body as Record<string, unknown>

  const query = typeof payload.query === "string" ? payload.query.trim() : ""
  if (typeof payload.query !== "string" || payload.query.length > 4000) {
    return badRequest("invalid request", { query: ["query must be a string (max 4000 chars)"] })
  }

  const filters = parseFilters(payload.filters)
  if (filters instanceof Response) return filters
  if (!query && !filters) {
    return badRequest("invalid request", {
      non_field_errors: ["provide a query, at least one filter, or both"],
    })
  }

  const mode = payload.mode ?? "hybrid"
  if (typeof mode !== "string" || !(MODES as readonly string[]).includes(mode)) {
    return badRequest("invalid request", { mode: [`mode must be one of ${MODES.join(", ")}`] })
  }

  const limit: unknown = payload.limit ?? 10
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return badRequest("invalid request", { limit: ["limit must be an integer between 1 and 50"] })
  }

  const includeContent = payload.include_content ?? true
  if (typeof includeContent !== "boolean") {
    return badRequest("invalid request", { include_content: ["include_content must be a boolean"] })
  }

  try {
    const outcome = await search(query, {
      mode: mode as SearchMode,
      filters,
      limit,
      includeContent,
    })
    return Response.json(outcome)
  } catch (error) {
    return Response.json(
      { detail: `retrieval failed: ${(error as Error)?.message ?? error}` },
      { status: 500 },
    )
  }
}
