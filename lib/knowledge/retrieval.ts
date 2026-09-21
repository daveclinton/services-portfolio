/**
 * Retrieval over `KnowledgeChunk`: lexical, vector, or hybrid with RRF fusion.
 *
 * Port of `backend/knowledge/retrieval/` (service, structured, semantic,
 * fusion, filters, citations). JSON shapes intentionally match
 * `SearchOutcome.as_dict()` / `SearchResult.as_dict()` so clients cannot tell
 * the Django API and the Next.js routes apart.
 */

import { sql } from "./db"
import {
  classifyQuestion,
  rerankForIntent,
  type IntentName,
  type QuestionIntent,
} from "./intent"
import { tokenize } from "./text"

export const MODES = ["structured", "semantic", "hybrid"] as const
export type SearchMode = (typeof MODES)[number]

/** Wider candidate pool per strategy so RRF has something to rerank. */
const CANDIDATE_MULTIPLIER = 4
const MIN_CANDIDATE_POOL = 20
const RRF_K = 60

export const EMBEDDING_MODEL = "text-embedding-3-small"
export const EXPECTED_DIMENSIONS = 1536

export class SemanticUnavailable extends Error {
  reason: string
  constructor(reason: string) {
    super(reason)
    this.reason = reason
  }
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export interface FiltersPayload {
  source_type?: string[]
  source_group?: string[]
  project_slug?: string[]
  company_slug?: string[]
  skill_slug?: string[]
}

function clean(values: unknown): string[] {
  const list = Array.isArray(values) ? values : values == null ? [] : [values]
  return list.map((v) => String(v).trim()).filter(Boolean)
}

export interface SearchFilters {
  source_type: string[]
  source_group: string[]
  project_slug: string[]
  company_slug: string[]
  skill_slug: string[]
}

export function filtersFromPayload(payload?: FiltersPayload | null): SearchFilters {
  const p = payload ?? {}
  return {
    source_type: clean(p.source_type),
    source_group: clean(p.source_group),
    project_slug: clean(p.project_slug),
    company_slug: clean(p.company_slug),
    skill_slug: clean(p.skill_slug),
  }
}

/**
 * Append `WHERE` fragments for the filter set to `clauses`, pushing bind
 * values onto `params`. Returns the next placeholder index.
 */
function applyFilters(
  filters: SearchFilters,
  clauses: string[],
  params: unknown[],
  next: number,
): number {
  if (filters.source_type.length > 0) {
    params.push(filters.source_type)
    clauses.push(`source_type = ANY($${next++})`)
  }
  if (filters.source_group.length > 0) {
    params.push(filters.source_group)
    clauses.push(`(metadata ->> 'source_group') = ANY($${next++})`)
  }
  if (filters.project_slug.length > 0) {
    params.push(filters.project_slug)
    clauses.push(`project_slug = ANY($${next++})`)
  }
  if (filters.company_slug.length > 0) {
    params.push(filters.company_slug)
    clauses.push(`company_slug = ANY($${next++})`)
  }
  if (filters.skill_slug.length > 0) {
    params.push(filters.skill_slug)
    clauses.push(`skill_slug = ANY($${next++})`)
  }
  return next
}

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

export interface ChunkRow {
  id: number
  content: string
  source_type: string
  source_path: string
  company_slug: string
  project_slug: string
  skill_slug: string
  metadata: Record<string, unknown>
}

const CHUNK_COLUMNS =
  "id, content, source_type, source_path, company_slug, project_slug, skill_slug, metadata"

function toChunkRow(row: Record<string, unknown>): ChunkRow {
  return {
    id: Number(row.id),
    content: String(row.content ?? ""),
    source_type: String(row.source_type ?? ""),
    source_path: String(row.source_path ?? ""),
    company_slug: String(row.company_slug ?? ""),
    project_slug: String(row.project_slug ?? ""),
    skill_slug: String(row.skill_slug ?? ""),
    metadata:
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {},
  }
}

/* ------------------------------------------------------------------ */
/* Structured (lexical) search                                         */
/* ------------------------------------------------------------------ */

async function searchStructured(
  query: string,
  filters: SearchFilters,
  limit: number,
): Promise<ChunkRow[]> {
  const clauses: string[] = []
  const params: unknown[] = []
  let next = applyFilters(filters, clauses, params, 1)

  const terms = tokenize(query)
  if (terms.length === 0) {
    // No usable terms: degrade to a plain filtered listing (browsing).
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""
    params.push(limit)
    const rows = await sql().query(
      `SELECT ${CHUNK_COLUMNS} FROM knowledge_knowledgechunk ${where} ORDER BY id ASC LIMIT $${next}`,
      params,
    )
    return (rows as Record<string, unknown>[]).map(toChunkRow)
  }

  // OR the per-term queries, like Django's `SearchQuery(term) | ...`.
  const tsParts: string[] = []
  for (const term of terms) {
    params.push(term)
    tsParts.push(`plainto_tsquery('english', $${next++})`)
  }
  const tsquery = `(${tsParts.join(" || ")})`
  const rankExpr = `ts_rank(to_tsvector('english', content), ${tsquery})`
  clauses.push(`to_tsvector('english', content) @@ ${tsquery}`)
  clauses.push(`${rankExpr} > 0`)
  params.push(limit)
  const rows = await sql().query(
    `SELECT ${CHUNK_COLUMNS}, ${rankExpr} AS rank FROM knowledge_knowledgechunk ` +
      `WHERE ${clauses.join(" AND ")} ORDER BY rank DESC, id ASC LIMIT $${next}`,
    params,
  )
  return (rows as Record<string, unknown>[]).map(toChunkRow)
}

/* ------------------------------------------------------------------ */
/* Semantic (vector) search                                            */
/* ------------------------------------------------------------------ */

async function embedQuery(query: string): Promise<number[]> {
  const { embed } = await import("ai")
  const { openai } = await import("@ai-sdk/openai")
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new SemanticUnavailable(
      "semantic search is unavailable: OPENAI_API_KEY is not configured",
    )
  }
  let vector: number[]
  try {
    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: query,
    })
    vector = embedding
  } catch (error) {
    throw new SemanticUnavailable(
      `semantic search is unavailable: ${(error as Error)?.message ?? error}`,
    )
  }
  if (vector.length !== EXPECTED_DIMENSIONS) {
    throw new SemanticUnavailable(
      `model ${EMBEDDING_MODEL} returned ${vector.length} dimensions; ` +
        `KnowledgeChunk.embedding needs ${EXPECTED_DIMENSIONS}`,
    )
  }
  return vector
}

async function searchByVector(
  vector: number[],
  filters: SearchFilters,
  limit: number,
): Promise<Array<{ chunk: ChunkRow; distance: number }>> {
  const clauses = ["embedding IS NOT NULL"]
  const params: unknown[] = []
  let next = applyFilters(filters, clauses, params, 1)
  params.push(`[${vector.join(",")}]`)
  const vecExpr = `$${next++}::vector`
  params.push(limit)
  const rows = await sql().query(
    `SELECT ${CHUNK_COLUMNS}, (embedding <=> ${vecExpr}) AS distance ` +
      `FROM knowledge_knowledgechunk WHERE ${clauses.join(" AND ")} ` +
      `ORDER BY distance ASC, id ASC LIMIT $${next}`,
    params,
  )
  return (rows as Record<string, unknown>[]).map((row) => ({
    chunk: toChunkRow(row),
    distance: Number(row.distance),
  }))
}

async function searchSemantic(
  query: string,
  filters: SearchFilters,
  limit: number,
): Promise<Array<{ chunk: ChunkRow; distance: number }>> {
  const countRows = (await sql().query(
    "SELECT COUNT(*)::int AS n FROM knowledge_knowledgechunk WHERE embedding IS NOT NULL",
    [],
  )) as Array<{ n: number }>
  if ((countRows[0]?.n ?? 0) === 0) {
    throw new SemanticUnavailable(
      "semantic search is unavailable: no KnowledgeChunk rows have " +
        "embeddings yet (run embed_knowledge)",
    )
  }
  return searchByVector(await embedQuery(query), filters, limit)
}

/* ------------------------------------------------------------------ */
/* Fusion                                                              */
/* ------------------------------------------------------------------ */

interface FusedHit {
  key: number
  score: number
  ranks: Record<string, number>
}

function reciprocalRankFusion(rankings: Record<string, number[]>): FusedHit[] {
  const fused = new Map<number, FusedHit>()
  for (const [strategy, keys] of Object.entries(rankings)) {
    keys.forEach((key, index) => {
      const rank = index + 1
      let hit = fused.get(key)
      if (!hit) {
        hit = { key, score: 0, ranks: {} }
        fused.set(key, hit)
      }
      hit.score += 1 / (RRF_K + rank)
      hit.ranks[strategy] = rank
    })
  }
  return [...fused.values()].sort((a, b) =>
    b.score !== a.score ? b.score - a.score : String(a.key) < String(b.key) ? -1 : 1,
  )
}

/* ------------------------------------------------------------------ */
/* Citations                                                           */
/* ------------------------------------------------------------------ */

const CONFIDENCE_ORDER: Record<string, number> = {
  confirmed: 0,
  probable: 1,
  unverified: 2,
}

export interface EvidenceCitation {
  slug: string
  title: string
  claim: string
  evidence_type: string
  confidence: string
  project_slug: string
  company_slug: string
  source_url: string
  source_path: string
}

async function citationsForChunks(
  chunks: ChunkRow[],
): Promise<Record<number, EvidenceCitation[]>> {
  const live = chunks.filter((c) => c.id != null)
  if (live.length === 0) return {}

  const projectSlugs = [...new Set(live.map((c) => c.project_slug).filter(Boolean))]
  const companySlugs = [...new Set(live.map((c) => c.company_slug).filter(Boolean))]
  const sourcePaths = [...new Set(live.map((c) => c.source_path).filter(Boolean))]
  if (projectSlugs.length + companySlugs.length + sourcePaths.length === 0) return {}

  const rows = (await sql().query(
    `SELECT e.slug, e.claim, e.confidence, e.evidence_type, e.title,
            e.source_url, e.source_path,
            p.slug AS project_slug, c.slug AS company_slug
       FROM knowledge_evidence e
       LEFT JOIN knowledge_project p ON p.id = e.project_id
       LEFT JOIN knowledge_employment em ON em.id = e.employment_id
       LEFT JOIN knowledge_company c ON c.id = em.company_id
      WHERE p.slug = ANY($1) OR c.slug = ANY($2) OR e.source_path = ANY($3)`,
    [projectSlugs, companySlugs, sourcePaths],
  )) as Record<string, unknown>[]

  const byProject = new Map<string, Record<string, unknown>[]>()
  const byCompany = new Map<string, Record<string, unknown>[]>()
  const byPath = new Map<string, Record<string, unknown>[]>()
  const push = (
    map: Map<string, Record<string, unknown>[]>,
    key: string,
    row: Record<string, unknown>,
  ) => {
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }
  for (const row of rows) {
    if (row.project_slug) push(byProject, String(row.project_slug), row)
    if (row.company_slug) push(byCompany, String(row.company_slug), row)
    if (row.source_path) push(byPath, String(row.source_path), row)
  }

  const resolved: Record<number, EvidenceCitation[]> = {}
  for (const chunk of live) {
    const candidates = new Map<string, Record<string, unknown>>()
    for (const row of [
      ...(byProject.get(chunk.project_slug) ?? []),
      ...(byCompany.get(chunk.company_slug) ?? []),
      ...(byPath.get(chunk.source_path) ?? []),
    ]) {
      candidates.set(String(row.slug), row)
    }
    resolved[chunk.id] = [...candidates.values()]
      .sort((a, b) => {
        const ca = CONFIDENCE_ORDER[String(a.confidence)] ?? 9
        const cb = CONFIDENCE_ORDER[String(b.confidence)] ?? 9
        if (ca !== cb) return ca - cb
        return String(a.slug) < String(b.slug) ? -1 : 1
      })
      .map((row) => ({
        slug: String(row.slug),
        title: String(row.title || String(row.claim).slice(0, 120)),
        claim: String(row.claim),
        evidence_type: String(row.evidence_type),
        confidence: String(row.confidence),
        project_slug: String(row.project_slug ?? ""),
        company_slug: String(row.company_slug ?? ""),
        source_url: String(row.source_url ?? ""),
        source_path: String(row.source_path ?? ""),
      }))
  }
  return resolved
}

/* ------------------------------------------------------------------ */
/* Outcome                                                             */
/* ------------------------------------------------------------------ */

/** Chunks for the files an intent must always see, keyed by source path. */
async function chunksBySourcePath(paths: readonly string[]): Promise<Map<string, ChunkRow>> {
  if (paths.length === 0) return new Map()
  const rows = (await sql().query(
    `SELECT ${CHUNK_COLUMNS} FROM knowledge_knowledgechunk WHERE source_path = ANY($1)`,
    [paths as string[]],
  )) as Record<string, unknown>[]
  const byPath = new Map<string, ChunkRow>()
  for (const row of rows) {
    const chunk = toChunkRow(row)
    // First writer wins, matching Django's `{chunk.source_path: chunk ...}`.
    if (!byPath.has(chunk.source_path)) byPath.set(chunk.source_path, chunk)
  }
  return byPath
}

/** Entity slugs that carry at least one confirmed metric, used by outcomes. */
async function confirmedMetricSlugs(): Promise<{
  projects: string[]
  companies: string[]
}> {
  const rows = (await sql().query(
    `SELECT p.slug AS project_slug, c.slug AS company_slug
       FROM knowledge_evidence e
       LEFT JOIN knowledge_project p ON p.id = e.project_id
       LEFT JOIN knowledge_employment em ON em.id = e.employment_id
       LEFT JOIN knowledge_company c ON c.id = em.company_id
      WHERE e.confidence = 'confirmed' AND e.evidence_type = 'metric'`,
    [],
  )) as Record<string, unknown>[]
  const projects = new Set<string>()
  const companies = new Set<string>()
  for (const row of rows) {
    if (row.project_slug) projects.add(String(row.project_slug))
    if (row.company_slug) companies.add(String(row.company_slug))
  }
  return { projects: [...projects], companies: [...companies] }
}

export interface SearchResult {
  rank: number
  score: number
  matched_by: string[]
  structured_rank: number | null
  semantic_rank: number | null
  distance: number | null
  chunk_id: number
  source_type: string
  source_group: string
  source_path: string
  project_slug: string
  company_slug: string
  skill_slug: string
  citations: EvidenceCitation[]
  content?: string
}

export interface SearchOutcome {
  query: string
  mode: SearchMode
  count: number
  filters: Record<string, string[]>
  strategies: Record<string, number>
  notes: string[]
  intent: IntentName
  results: SearchResult[]
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6

function toResultDict(
  chunk: ChunkRow,
  fields: {
    rank: number
    score: number
    matched_by: string[]
    structured_rank: number | null
    semantic_rank: number | null
    distance: number | null
    citations: EvidenceCitation[]
  },
  includeContent: boolean,
): SearchResult {
  const metadata = chunk.metadata
  const result: SearchResult = {
    rank: fields.rank,
    score: round6(fields.score),
    matched_by: fields.matched_by,
    structured_rank: fields.structured_rank,
    semantic_rank: fields.semantic_rank,
    distance: fields.distance == null ? null : round6(fields.distance),
    chunk_id: chunk.id,
    source_type: chunk.source_type,
    source_group:
      typeof metadata.source_group === "string" ? metadata.source_group : "",
    source_path: chunk.source_path,
    project_slug: chunk.project_slug,
    company_slug: chunk.company_slug,
    skill_slug: chunk.skill_slug,
    citations: fields.citations,
  }
  if (includeContent) result.content = chunk.content
  return result
}

/**
 * Retrieve the chunks that best answer `query` — same contract as Django's
 * `knowledge.retrieval.search`.
 */
export async function search(
  query: string,
  options?: {
    mode?: SearchMode
    filters?: FiltersPayload | null
    limit?: number
    includeContent?: boolean
  },
): Promise<SearchOutcome> {
  const mode = options?.mode ?? "hybrid"
  const limit = options?.limit ?? 10
  const includeContent = options?.includeContent ?? true
  if (!MODES.includes(mode)) {
    throw new Error(`mode must be one of ${MODES.join(", ")}; got ${JSON.stringify(mode)}`)
  }
  if (limit < 1) throw new Error("limit must be at least 1")

  const filters = filtersFromPayload(options?.filters ?? null)
  const intent = classifyQuestion(query)
  const pool = Math.max(limit * CANDIDATE_MULTIPLIER, MIN_CANDIDATE_POOL)
  const notes: string[] = []
  const strategies: Record<string, number> = {}
  let structuredRanked: ChunkRow[] = []
  let semanticRanked: Array<{ chunk: ChunkRow; distance: number }> = []
  const distances = new Map<number, number>()

  if (mode === "structured" || mode === "hybrid") {
    structuredRanked = await searchStructured(query, filters, pool)
    strategies.structured = structuredRanked.length
  }

  if (mode === "semantic" || mode === "hybrid") {
    try {
      semanticRanked = await searchSemantic(query, filters, pool)
      for (const { chunk, distance } of semanticRanked) {
        distances.set(chunk.id, distance)
      }
      strategies.semantic = semanticRanked.length
    } catch (error) {
      if (!(error instanceof SemanticUnavailable)) throw error
      strategies.semantic = 0
      notes.push(error.reason)
      if (mode === "semantic") {
        return {
          query,
          mode,
          count: 0,
          filters: filtersAsDict(filters),
          strategies,
          notes,
          intent: intent.name,
          results: [],
        }
      }
    }
  }

  // Every retrieved chunk, so citations and intent anchors can resolve later.
  const chunksById = new Map<number, ChunkRow>()
  for (const chunk of structuredRanked) chunksById.set(chunk.id, chunk)
  for (const { chunk } of semanticRanked) chunksById.set(chunk.id, chunk)

  let ranked: SearchResult[]
  if (mode === "hybrid") {
    ranked = await fuse(structuredRanked, semanticRanked, distances, includeContent)
  } else {
    const strategy = mode
    const chunks =
      strategy === "structured"
        ? structuredRanked
        : semanticRanked.map((r) => r.chunk)
    ranked = chunks.map((chunk, index) => {
      const rank = index + 1
      return toResultDict(
        chunk,
        {
          rank,
          score: 1 / rank,
          matched_by: [strategy],
          structured_rank: strategy === "structured" ? rank : null,
          semantic_rank: strategy === "semantic" ? rank : null,
          distance: distances.get(chunk.id) ?? null,
          citations: [],
        },
        includeContent,
      )
    })
  }

  ranked = await applyIntent(ranked, intent, {
    limit,
    includeContent,
    chunksById,
  })
  const citations = await citationsForChunks(
    ranked.map((result) => {
      const chunk = chunksById.get(result.chunk_id)
      if (!chunk) throw new Error(`chunk ${result.chunk_id} missing from rankings`)
      return chunk
    }),
  )
  for (const result of ranked) {
    result.citations = citations[result.chunk_id] ?? []
  }

  return {
    query,
    mode,
    count: ranked.length,
    filters: filtersAsDict(filters),
    strategies,
    notes,
    intent: intent.name,
    results: ranked,
  }
}

/**
 * Fetch an intent's anchors, then rerank in place — Django's
 * `rerank_for_intent(results, intent, limit=limit)`.
 */
async function applyIntent(
  ranked: SearchResult[],
  intent: QuestionIntent,
  context: {
    limit: number
    includeContent: boolean
    chunksById: Map<number, ChunkRow>
  },
): Promise<SearchResult[]> {
  const { limit, includeContent, chunksById } = context
  const anchorResults: SearchResult[] = []
  if (intent.anchorPaths.length > 0) {
    const anchors = await chunksBySourcePath(intent.anchorPaths)
    for (const path of intent.anchorPaths) {
      const chunk = anchors.get(path)
      if (!chunk) continue
      chunksById.set(chunk.id, chunk)
      const existing = ranked.find((result) => result.chunk_id === chunk.id)
      anchorResults.push(
        existing ??
          toResultDict(
            chunk,
            {
              rank: 0,
              score: 1,
              matched_by: ["intent"],
              structured_rank: null,
              semantic_rank: null,
              distance: null,
              citations: [],
            },
            includeContent,
          ),
      )
    }
  }

  const metrics =
    intent.name === "outcomes"
      ? await confirmedMetricSlugs()
      : { projects: [] as string[], companies: [] as string[] }

  return rerankForIntent(ranked, intent, {
    limit,
    anchors: anchorResults,
    metricProjectSlugs: metrics.projects,
    metricCompanySlugs: metrics.companies,
  })
}

function filtersAsDict(filters: SearchFilters): Record<string, string[]> {
  return {
    source_type: filters.source_type,
    source_group: filters.source_group,
    project_slug: filters.project_slug,
    company_slug: filters.company_slug,
    skill_slug: filters.skill_slug,
  }
}

async function fuse(
  structuredRanked: ChunkRow[],
  semanticRanked: Array<{ chunk: ChunkRow; distance: number }>,
  distances: Map<number, number>,
  includeContent: boolean,
): Promise<SearchResult[]> {
  const byId = new Map<number, ChunkRow>()
  const rankings: Record<string, number[]> = {}
  if (structuredRanked.length > 0) {
    rankings.structured = []
    for (const chunk of structuredRanked) {
      byId.set(chunk.id, chunk)
      rankings.structured.push(chunk.id)
    }
  }
  if (semanticRanked.length > 0) {
    rankings.semantic = []
    for (const { chunk } of semanticRanked) {
      byId.set(chunk.id, chunk)
      rankings.semantic.push(chunk.id)
    }
  }
  // Citations resolve after slicing to the final limit, in search().
  return reciprocalRankFusion(rankings).map((hit, index) => {
    const chunk = byId.get(hit.key)
    if (!chunk) throw new Error(`chunk ${hit.key} missing from rankings`)
    return toResultDict(
      chunk,
      {
        rank: index + 1,
        score: hit.score,
        matched_by: [...Object.keys(hit.ranks)].sort(),
        structured_rank: hit.ranks.structured ?? null,
        semantic_rank: hit.ranks.semantic ?? null,
        distance: distances.get(chunk.id) ?? null,
        citations: [],
      },
      includeContent,
    )
  })
}
