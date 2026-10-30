/**
 * Tokenization shared by the retrieval strategies.
 *
 * Port of `knowledge-backend/knowledge/retrieval/text.py`: deliberately small and
 * dependency-free. Postgres does the actual stemming, so this only needs to
 * produce a stable set of search terms.
 */

/** Matches technology-shaped tokens: `react`, `next.js`, `c++`, `c#`. */
const TOKEN_RE = /[a-z0-9][a-z0-9+#._-]*/g

/** Cheap stopword list — every removed word can no longer match a chunk. */
const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "about", "an", "and", "any", "are", "as", "at", "be", "been",
  "but", "by", "can", "did", "do", "does", "for", "from", "get", "had",
  "has", "have", "he", "her", "his", "how", "i", "in", "into", "is",
  "it", "its", "me", "my", "of", "on", "or", "our", "she", "so",
  "that", "the", "their", "them", "then", "there", "these", "they",
  "this", "to", "up", "us", "was", "we", "were", "what", "when",
  "where", "which", "who", "why", "will", "with", "you", "your",
])

/** Unique lowercase search terms, in first-seen order. */
export function tokenize(text: string): string[] {
  const terms: string[] = []
  const seen = new Set<string>()
  for (const raw of (text ?? "").toLowerCase().match(TOKEN_RE) ?? []) {
    const term = raw.replace(/^[._-]+|[._-]+$/g, "")
    if (term.length < 2 || STOPWORDS.has(term) || seen.has(term)) continue
    seen.add(term)
    terms.push(term)
  }
  return terms
}
