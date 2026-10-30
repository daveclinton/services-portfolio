import type { SearchResult } from "./retrieval"

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

export interface QuestionIntent {
  name: IntentName
  guidance: string
  anchorPaths: readonly string[]
}

export type ChatWorkflow =
  | { action: "reply"; intent: "general"; response: string }
  | { action: "retrieve" }

const CONVERSATIONAL_REPLIES: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /^(hi|hello|hey|hiya|howdy)( there)?[!.?]*$/,
    "Hi! I can answer questions about David's work, experience, projects, and skills. What would you like to know?",
  ],
  [
    /^(good morning|good afternoon|good evening)[!.?]*$/,
    "Hello! Ask me anything about David's professional background, projects, or skills.",
  ],
  [
    /^(thanks|thank you|thank you very much|cheers)[!.?]*$/,
    "You're welcome. Feel free to ask another question about David's work.",
  ],
  [
    /^(how are you|how's it going|how are things)[!.?]*$/,
    "I'm ready to help. You can ask me about David's experience, projects, skills, or availability.",
  ],
]

export function selectChatWorkflow(question: string): ChatWorkflow {
  const text = (question ?? "").toLowerCase().split(/\s+/).join(" ").trim()
  for (const [pattern, response] of CONVERSATIONAL_REPLIES) {
    if (pattern.test(text)) return { action: "reply", intent: "general", response }
  }
  return { action: "retrieve" }
}

export const GENERAL: QuestionIntent = {
  name: "general",
  guidance: "Answer the exact question directly and use only relevant retrieved facts.",
  anchorPaths: [],
}

export const INTENTS: Record<Exclude<IntentName, "general">, QuestionIntent> = {
  biography: {
    name: "biography",
    guidance:
      "Lead with David's professional identity and the kinds of problems he solves. " +
      "Summarize representative verified contributions and outcomes. Mention a " +
      "technology only when it clarifies a contribution; do not answer with a stack list.",
    anchorPaths: ["knowledge/person/profile.md"],
  },
  rates: {
    name: "rates",
    guidance:
      "State the applicable rates precisely, distinguish direct and marketplace " +
      "rates, and avoid unrelated career or technology detail.",
    anchorPaths: [
      "knowledge/evidence/contracting-rate-2026.md",
      "knowledge/person/profile.md",
    ],
  },
  experience: {
    name: "experience",
    guidance:
      "Prioritize roles, companies, responsibilities, dates and contributions. " +
      "Use projects and technologies only as supporting detail.",
    anchorPaths: ["knowledge/person/profile.md"],
  },
  projects: {
    name: "projects",
    guidance:
      "Prioritize named products, the problem each solved, David's contribution, " +
      "delivery status and verified outcomes over raw technology inventories.",
    anchorPaths: [],
  },
  skills: {
    name: "skills",
    guidance:
      "Describe capabilities in terms of demonstrated work and representative " +
      "evidence, not an unexplained keyword list. For hiring, role-fit, or suitability " +
      "questions, explain where the evidence shows a strong fit, avoid making the " +
      "hiring decision for the user, and invite them to share the role requirements " +
      "for a more specific comparison.",
    anchorPaths: ["knowledge/person/profile.md"],
  },
  technologies: {
    name: "technologies",
    guidance:
      "Answer with the relevant languages, frameworks, platforms or tools, grouped " +
      "by purpose and tied to verified usage where useful.",
    anchorPaths: [],
  },
  outcomes: {
    name: "outcomes",
    guidance:
      "Lead with measurable or operational results and clearly distinguish exact " +
      "metrics from qualitative outcomes.",
    anchorPaths: [],
  },
}

export function intentByName(name: IntentName): QuestionIntent {
  return name === "general" ? GENERAL : INTENTS[name]
}

const ORDERED_PATTERNS: ReadonlyArray<readonly [Exclude<IntentName, "general">, RegExp[]]> = [
  [
    "rates",
    [/\b(rate|rates|pricing|price|cost|charge|salary|compensation)\b/, /\bhow much\b/],
  ],
  [
    "outcomes",
    [
      /\b(impact|outcome|outcomes|result|results|metric|metrics)\b/,
      /\b(how many|improve[ds]?|automate[ds]?|saved|grew|growth)\b/,
    ],
  ],
  [
    "technologies",
    [
      /\b(tech stack|technology|technologies|framework|frameworks)\b/,
      /\b(language|languages|tool|tools|database|databases)\b/,
      /\b(react|next\.js|python|django|kotlin|flutter|rust|sap hana)\b/,
    ],
  ],
  [
    "skills",
    [
      /\b(skill|skills|expertise|speciali[sz]e[ds]?|capabilit(?:y|ies))\b/,
      /\b(good at|strong at|proficient|strengths?)\b/,
      /\b(hire|hiring|candidate|suitable|suitability|qualified|qualification|fit for|good fit)\b/,
    ],
  ],
  [
    "experience",
    [
      /\b(experience|experiences|experiance|experiances|career|employment|employer|company|companies|role|roles)\b/,
      /\b(worked at|work history|background|where (has|did) (he|david) work(?:ed)?)\b/,
    ],
  ],
  [
    "projects",
    [
      /\b(project|projects|product|products|portfolio|built|build|shipped)\b/,
      /\b(showcase|case stud(?:y|ies))\b/,
    ],
  ],
  [
    "biography",
    [
      /\bwho is david\b/,
      /\bwhat does david do\b/,
      /\bwhat can david do\b/,
      /\btell me about david\b/,
      /\btell me about you\b/,
      /\bwho are you\b/,
      /\btell me about (him|the candidate)\b/,
      /\b(introduce|summari[sz]e|overview) david\b/,
      /^what does (he|the candidate) do\??$/,
      /^who is (he|the candidate)\??$/,
    ],
  ],
]

function matches(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function classifyQuestion(question: string): QuestionIntent {
  const text = (question ?? "").toLowerCase().split(/\s+/).join(" ").trim()
  for (const [name, patterns] of ORDERED_PATTERNS) {
    if (matches(text, patterns)) return INTENTS[name]
  }
  return GENERAL
}

export interface IntentChunk {
  id: number
  source_type: string
  source_path: string
}

function sourcePriority(intent: IntentName, chunk: IntentChunk): number {
  if (intent === "biography") {
    if (chunk.source_path === "knowledge/person/profile.md") return 0
    switch (chunk.source_type) {
      case "experience-overview":
        return 1
      case "project-overview":
        return 2
      case "experience-responsibilities":
        return 3
      case "skill":
        return 4
      case "project-evidence":
      case "experience-accomplishments":
      case "evidence":
        return 5
      case "experience-technologies":
        return 7
      default:
        return 6
    }
  }
  const preferred: Partial<Record<IntentName, readonly string[]>> = {
    rates: ["evidence", "person-profile"],
    experience: ["experience-overview", "experience-responsibilities"],
    projects: ["project-overview", "project-architecture", "project-technical-decisions"],
    skills: ["skill", "project-overview", "experience-responsibilities"],
    technologies: ["experience-technologies", "project-overview", "skill"],
    outcomes: [
      "project-evidence",
      "experience-accomplishments",
      "evidence",
      "project-overview",
    ],
  }
  const order = preferred[intent] ?? []
  const index = order.indexOf(chunk.source_type)
  return index === -1 ? order.length + 1 : index
}

const BIOGRAPHY_TYPE_CAPS: Record<string, number> = {
  "experience-overview": 3,
  "project-overview": 3,
  skill: 1,
  "experience-technologies": 1,
  "project-evidence": 1,
  evidence: 1,
}

export interface RerankOptions {
  limit: number
  anchors?: SearchResult[]
  metricProjectSlugs?: Iterable<string>
  metricCompanySlugs?: Iterable<string>
}

export function rerankForIntent(
  results: SearchResult[],
  intent: QuestionIntent,
  options: RerankOptions,
): SearchResult[] {
  const { limit, anchors = [] } = options

  const byId = new Map<number, SearchResult>()
  for (const result of results) byId.set(result.chunk_id, result)

  const anchoredIds: number[] = []
  for (const anchor of anchors) {
    if (!byId.has(anchor.chunk_id)) byId.set(anchor.chunk_id, anchor)
    anchoredIds.push(anchor.chunk_id)
  }

  const metricProjects = new Set(options.metricProjectSlugs ?? [])
  const metricCompanies = new Set(options.metricCompanySlugs ?? [])
  const metricPriority = (result: SearchResult): number => {
    if (intent.name !== "outcomes") return 0
    const measured =
      (result.project_slug !== "" && metricProjects.has(result.project_slug)) ||
      (result.company_slug !== "" && metricCompanies.has(result.company_slug))
    return measured ? 0 : 1
  }

  const originalPosition = new Map<number, number>()
  results.forEach((result, position) => originalPosition.set(result.chunk_id, position))

  const ordered = [...byId.values()].sort((a, b) => {
    const anchorA = anchoredIds.indexOf(a.chunk_id)
    const anchorB = anchoredIds.indexOf(b.chunk_id)
    if ((anchorA === -1) !== (anchorB === -1)) return anchorA === -1 ? 1 : -1
    if (anchorA !== anchorB) return anchorA - anchorB
    const metric = metricPriority(a) - metricPriority(b)
    if (metric !== 0) return metric
    const priority =
      sourcePriority(intent.name, chunkOf(a)) - sourcePriority(intent.name, chunkOf(b))
    if (priority !== 0) return priority
    return (
      (originalPosition.get(a.chunk_id) ?? -1) - (originalPosition.get(b.chunk_id) ?? -1)
    )
  })

  const selected: SearchResult[] = []
  const entityCounts = new Map<string, number>()
  const typeCounts = new Map<string, number>()
  const selectedIds = new Set<number>()

  for (const result of ordered) {
    const entity = result.project_slug || result.company_slug || result.skill_slug
    if (intent.name === "biography" && !anchoredIds.includes(result.chunk_id)) {
      if (entity && (entityCounts.get(entity) ?? 0) >= 1) continue
      const cap = BIOGRAPHY_TYPE_CAPS[result.source_type] ?? 2
      if ((typeCounts.get(result.source_type) ?? 0) >= cap) continue
    }
    selected.push(result)
    selectedIds.add(result.chunk_id)
    if (entity) entityCounts.set(entity, (entityCounts.get(entity) ?? 0) + 1)
    typeCounts.set(result.source_type, (typeCounts.get(result.source_type) ?? 0) + 1)
    if (selected.length === limit) break
  }

  for (const result of ordered) {
    if (selected.length === limit) break
    if (selectedIds.has(result.chunk_id)) continue
    selected.push(result)
    selectedIds.add(result.chunk_id)
  }

  selected.forEach((result, index) => {
    result.rank = index + 1
  })
  return selected
}

function chunkOf(result: SearchResult): IntentChunk {
  return { id: result.chunk_id, source_type: result.source_type, source_path: result.source_path }
}
