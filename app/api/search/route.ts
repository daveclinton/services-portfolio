import {
  MODES,
  search,
  type FiltersPayload,
  type SearchMode,
} from "@/lib/knowledge/retrieval"
import type { NextRequest } from "next/server"
import {
  enforceRateLimit,
  rateLimitResponse,
  withRateLimitHeaders,
} from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_REQUEST_CHARS = 12_000

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

export async function POST(request: NextRequest): Promise<Response> {
  let gate
  try {
    gate = await enforceRateLimit(request, "search")
  } catch (error) {
    console.error("Search rate limiting is unavailable", error)
    return Response.json(
      { detail: "Search is temporarily unavailable. Please try again shortly." },
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
  if (typeof body !== "object" || body === null) {
    return withRateLimitHeaders(badRequest("request body must be a JSON object"), gate)
  }
  const payload = body as Record<string, unknown>

  const query = typeof payload.query === "string" ? payload.query.trim() : ""
  if (typeof payload.query !== "string" || payload.query.length > 4000) {
    return withRateLimitHeaders(
      badRequest("invalid request", { query: ["query must be a string (max 4000 chars)"] }),
      gate,
    )
  }

  const filters = parseFilters(payload.filters)
  if (filters instanceof Response) return withRateLimitHeaders(filters, gate)
  if (!query && !filters) {
    return withRateLimitHeaders(
      badRequest("invalid request", {
        non_field_errors: ["provide a query, at least one filter, or both"],
      }),
      gate,
    )
  }

  const mode = payload.mode ?? "hybrid"
  if (typeof mode !== "string" || !(MODES as readonly string[]).includes(mode)) {
    return withRateLimitHeaders(
      badRequest("invalid request", { mode: [`mode must be one of ${MODES.join(", ")}`] }),
      gate,
    )
  }

  const limit: unknown = payload.limit ?? 10
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return withRateLimitHeaders(
      badRequest("invalid request", { limit: ["limit must be an integer between 1 and 50"] }),
      gate,
    )
  }

  const includeContent = payload.include_content ?? true
  if (typeof includeContent !== "boolean") {
    return withRateLimitHeaders(
      badRequest("invalid request", { include_content: ["include_content must be a boolean"] }),
      gate,
    )
  }

  try {
    const outcome = await search(query, {
      mode: mode as SearchMode,
      filters,
      limit,
      includeContent,
    })
    return withRateLimitHeaders(Response.json(outcome), gate)
  } catch (error) {
    console.error("Search retrieval failed", error)
    return withRateLimitHeaders(
      Response.json({ detail: "Search could not retrieve results." }, { status: 500 }),
      gate,
    )
  }
}
