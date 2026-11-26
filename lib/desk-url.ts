// URL state for the writing desk. Table settings (search, sort, page) replace
// the current history entry; opening a document pushes one, so Back returns.
// Next keeps useSearchParams in step with the native history API:
// node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
export type SortDir = "asc" | "desc"
export type DeskQuery = { get(name: string): string | null }
export const EMPTY_QUERY: DeskQuery = new URLSearchParams()

let pushed = 0
// After the reader moves through history we no longer know what lies behind,
// so in-app "up" actions fall back to replacing rather than leaving the page.
if (typeof window !== "undefined") window.addEventListener("popstate", () => { pushed = 0 })

export function setDeskQuery(changes: Record<string, string | null>, mode: "push" | "replace" = "replace") {
  if (typeof window === "undefined" || typeof window.history?.replaceState !== "function") return
  const params = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(changes)) if (value === null || value === "") params.delete(key); else params.set(key, value)
  const search = params.toString()
  if (search === window.location.search.replace(/^\?/, "")) return
  const url = `${window.location.pathname}${search ? `?${search}` : ""}`
  if (mode === "push") { pushed++; window.history.pushState(null, "", url) } else window.history.replaceState(null, "", url)
}

// Returns to the entry before the last push when it is ours; otherwise replaces.
export function leaveDeskQuery(changes: Record<string, string | null>) {
  if (pushed > 0 && typeof window.history?.back === "function") { pushed--; window.history.back() } else setDeskQuery(changes)
}

export function readSort<K extends string>(query: DeskQuery, keys: readonly K[], fallback: K, defaultDir: (key: K) => SortDir): { key: K; dir: SortDir } {
  const requested = query.get("sort") as K | null
  const key = requested && keys.includes(requested) ? requested : fallback
  const dir = query.get("dir")
  return { key, dir: dir === "asc" || dir === "desc" ? dir : defaultDir(key) }
}
// Pages are 1-based in the URL and 0-based in code.
export const readPage = (query: DeskQuery) => Math.max(0, (Number.parseInt(query.get("page") ?? "1", 10) || 1) - 1)

// Clicking the sorted column flips it; a new column starts at its natural order.
export function nextSort<K extends string>(current: { key: K; dir: SortDir }, key: K, fallback: K, defaultDir: (key: K) => SortDir) {
  const dir: SortDir = current.key === key ? (current.dir === "asc" ? "desc" : "asc") : defaultDir(key)
  // Defaults stay out of the URL so plain links remain plain.
  return { sort: key === fallback && dir === defaultDir(fallback) ? null : key, dir: dir === defaultDir(key) ? null : dir, page: null }
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true })
export const compareText = (a: string, b: string) => collator.compare(a, b)
