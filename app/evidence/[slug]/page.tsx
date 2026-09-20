import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ArrowUpRight } from "lucide-react"
import { BackHomeButton } from "@/components/portfolio"
import { Badge } from "@/components/ui/badge"
import { fetchEvidence } from "@/lib/ai-client"

/**
 * The page an answer's citation chip points at. It renders one `Evidence` row
 * from the Django backend, so a reader can always check what a generated
 * claim was actually based on.
 */

const CONFIDENCE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  confirmed: "default",
  probable: "secondary",
  unverified: "outline",
}

/** Memoized per request so `generateMetadata` and the page share one fetch. */
const getEvidence = cache(fetchEvidence)

export async function generateMetadata(
  props: PageProps<"/evidence/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params
  const evidence = await getEvidence(slug)
  return {
    title: evidence?.title ?? "Evidence",
    description: evidence?.claim,
  }
}

export default async function EvidencePage(props: PageProps<"/evidence/[slug]">) {
  const { slug } = await props.params
  const evidence = await getEvidence(slug)
  if (!evidence) notFound()

  return (
    <div className="flex flex-col gap-6 pt-2">
      <BackHomeButton />

      <header className="flex flex-col gap-3">
        {/* A paragraph, not `SectionLabel`: the title below is the page's h1,
            so the eyebrow must not open a competing h2 above it. */}
        <p className="text-label font-medium text-muted-foreground uppercase">
          Evidence
        </p>
        <h1 className="text-title text-foreground">{evidence.title}</h1>
        <p className="text-body text-foreground/90">{evidence.claim}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={CONFIDENCE_VARIANT[evidence.confidence] ?? "outline"}>
            {evidence.confidence}
          </Badge>
          <Badge variant="outline">{evidence.evidence_type}</Badge>
          {evidence.verified_at ? (
            <span className="text-caption text-subtle-foreground">
              Verified {evidence.verified_at.slice(0, 10)}
            </span>
          ) : null}
        </div>
      </header>

      {evidence.description ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-label text-muted-foreground">Details</h2>
          <p className="text-body whitespace-pre-wrap text-foreground/90">
            {evidence.description}
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-muted-foreground">Linked to</h2>
        <ul className="flex flex-col gap-1 text-body text-foreground/90">
          {evidence.project ? (
            <li>
              Project: <span className="text-foreground">{evidence.project.name}</span>
            </li>
          ) : null}
          {evidence.company ? (
            <li>
              Company: <span className="text-foreground">{evidence.company.name}</span>
            </li>
          ) : null}
          {!evidence.project && !evidence.company ? (
            <li className="text-muted-foreground">
              Not linked to a project or company.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-label text-muted-foreground">Sources</h2>
        <ul className="flex flex-col gap-1 text-body">
          {evidence.source_url ? (
            <li>
              <a
                href={evidence.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                {evidence.source_url}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </li>
          ) : null}
          {evidence.source_path ? (
            <li className="font-mono text-caption text-muted-foreground">
              {evidence.source_path}
            </li>
          ) : null}
          {!evidence.source_url && !evidence.source_path ? (
            <li className="text-caption text-subtle-foreground">
              No source recorded for this claim.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  )
}
