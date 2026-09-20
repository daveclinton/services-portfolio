import Link from "next/link"
import { cn } from "@/lib/utils"
import type { AiSource } from "@/lib/ai-client"

/** Where a retrieved chunk's citation chip should send the reader. */
function citationTarget(source: AiSource) {
  const row = source.citations.find((citation) => citation.slug)
  if (row) {
    return { href: `/evidence/${row.slug}`, label: row.title, external: false }
  }
  const external = source.citations.find((citation) => citation.source_url)
  if (external) {
    return {
      href: external.source_url,
      label: external.title,
      external: true,
    }
  }
  return null
}

function sourceLabel(source: AiSource) {
  return (
    source.project_slug || source.company_slug || source.skill_slug || source.source_type
  ).replace(/-/g, " ")
}

/**
 * The "Sources" strip under an assistant answer. Every chip resolves to an
 * evidence row, which is what keeps a generated answer checkable.
 */
export function EvidenceCitations({
  sources,
  className,
}: {
  sources: AiSource[]
  className?: string
}) {
  if (sources.length === 0) return null

  return (
    <div className={cn("mt-2.5 flex flex-col gap-1.5", className)}>
      <p className="text-label text-muted-foreground">Sources</p>
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((source) => {
          const target = citationTarget(source)
          const label = target?.label || sourceLabel(source)
          const chip = (
            <>
              <span
                aria-hidden="true"
                className="font-mono text-[0.65rem] text-subtle-foreground"
              >
                [{source.index}]
              </span>
              {label}
            </>
          )

          return (
            <li key={source.chunk_id}>
              {target ? (
                target.external ? (
                  <a
                    href={target.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-caption text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                  >
                    {chip}
                  </a>
                ) : (
                  <Link
                    href={target.href}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-caption text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                  >
                    {chip}
                  </Link>
                )
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-caption text-subtle-foreground">
                  {chip}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
