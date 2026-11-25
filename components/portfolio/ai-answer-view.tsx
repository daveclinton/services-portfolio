"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VIEW_EDIT_LIMIT, type AnswerView, type ViewItem, type ViewState } from "@/lib/ai-client"

const statusLabels: Record<ViewItem["status"], string> = {
  demonstrated: "Demonstrated", related: "Related experience", not_established: "Not established",
  proposed: "Proposed", context: "Published context",
}

export function EvidenceDetails({ ids, view, open = false }: { ids: number[]; view: AnswerView; open?: boolean }) {
  const sources = view.evidence.filter((source) => ids.includes(source.id))
  if (!sources.length) return <p className="text-caption text-muted-foreground">No supporting excerpt attached. Confirm this point with David.</p>
  return (
    <details open={open} className="text-caption text-muted-foreground">
      <summary className="cursor-pointer py-2">Supporting material ({sources.length})</summary>
      <ul className="flex flex-col gap-4">
        {sources.map((source) => (
          <li key={source.id} className="min-w-0">
            <p className="font-medium text-foreground">{source.title}</p>
            {open ? <p className="mt-2">Referenced by: {[...view.items.filter((item) => item.source_ids.includes(source.id)).map((item) => item.title), ...view.connections.filter((edge) => edge.source_ids.includes(source.id)).map((edge) => edge.label)].join("; ")}</p> : null}
            <blockquote className="mt-2 border-l border-border pl-4 whitespace-pre-wrap break-words">{source.excerpt}</blockquote>
            {source.links.map((link) => <p key={link.url} className="mt-2"><a href={link.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{link.title}</a>{link.verified_at ? <span className="block">Evidence reviewed {link.verified_at}</span> : null}</p>)}
          </li>
        ))}
      </ul>
    </details>
  )
}

function ArchitectureDiagram({ view, selectedId, onSelect, disabled }: {
  view: AnswerView; selectedId?: string; onSelect: (id: string) => void; disabled: boolean
}) {
  const ref = useRef<SVGSVGElement>(null)
  const seen = useInView(ref, { once: true })
  const reduced = useReducedMotion()
  const height = Math.ceil(view.items.length / 2) * 96 + 32
  const position = (id: string) => {
    const index = view.items.findIndex((item) => item.id === id)
    return { x: index % 2 * 320 + 40, y: Math.floor(index / 2) * 96 + 24 }
  }
  return (
    <svg ref={ref} viewBox={`0 0 640 ${height}`} aria-hidden="true" className="block h-auto w-full">
      {view.connections.map((edge, index) => {
        const from = position(edge.from), to = position(edge.to)
        const highlighted = edge.from === selectedId || edge.to === selectedId
        return <motion.path key={`${edge.from}-${edge.to}-${index}`} d={`M${from.x + 120} ${from.y + 32} L${to.x + 120} ${to.y + 32}`} fill="none" stroke={highlighted ? "var(--primary)" : "var(--border)"} strokeWidth="2" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: reduced || seen ? 1 : 0 }} transition={reduced ? { duration: 0 } : undefined} />
      })}
      {view.items.map((item) => {
        const { x, y } = position(item.id)
        return (
          <g key={item.id} transform={`translate(${x} ${y})`} className="cursor-pointer" onClick={() => { if (!disabled) onSelect(item.id) }}>
            <rect width="240" height="64" rx="8" fill="var(--card)" stroke={selectedId === item.id ? "var(--primary)" : "var(--border)"} strokeWidth="2" />
            <text x="120" y="36" textAnchor="middle" fill="var(--foreground)" className="text-caption">{item.title.length > 28 ? `${item.title.slice(0, 27)}…` : item.title}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Details are mounted only after the visitor opens the result card. Within
// that view, one item is disclosed at a time; essential answer text stays in chat.
// References: Grok's title/Open result cards and GOV.UK's disclosure guidance.
export function AiAnswerContent({ view, state = {}, onChange, disabled = false, onEditingChange }: {
  view: AnswerView; state?: ViewState; onChange: (state: ViewState) => void; disabled?: boolean
  onEditingChange?: (editing: boolean) => void
}) {
  const id = useId()
  const [openItemId, setOpenItemId] = useState<string | null>(() => state.selectedId ?? null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const editRef = useRef<HTMLTextAreaElement>(null)
  const returnEditId = useRef<string | null>(null)
  const selected = view.items.find((item) => item.id === state.selectedId)

  useEffect(() => {
    if (editingId) editRef.current?.focus()
    else if (returnEditId.current) document.getElementById(`${id}-edit-${returnEditId.current}`)?.focus()
  }, [editingId, id])

  function select(itemId: string) {
    onChange({ ...state, selectedId: state.selectedId === itemId ? undefined : itemId })
  }

  function finishEdit() {
    setEditingId(null)
    onEditingChange?.(false)
  }

  if (view.kind === "text") return null

  if (view.kind === "architecture") return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-caption text-muted-foreground">Choose a system to inspect its role and supporting material.</p>
      <ArchitectureDiagram view={view} selectedId={state.selectedId} onSelect={select} disabled={disabled} />
      <div className="flex flex-wrap gap-2" aria-label="Inspect system nodes">{view.items.map((item) => <Button key={item.id} type="button" variant={state.selectedId === item.id ? "secondary" : "outline"} aria-label={`Inspect ${item.title}`} aria-pressed={state.selectedId === item.id} disabled={disabled} onClick={() => select(item.id)}>{item.title}</Button>)}</div>
      {selected ? <div className="border-l border-border pl-4"><h3 className="text-body font-medium">{selected.title}</h3><p className="mt-2 text-body break-words">{selected.summary}</p><p className="mt-2 text-caption break-words text-muted-foreground">{selected.detail}</p><EvidenceDetails ids={selected.source_ids} view={view} /></div> : null}
      <details className="text-caption text-muted-foreground">
        <summary className="cursor-pointer py-2">Documented connections ({view.connections.length})</summary>
        <ul className="flex flex-col gap-2">{view.connections.map((edge, index) => (
          <li key={index}>
            <p>{view.items.find((item) => item.id === edge.from)?.title} to {view.items.find((item) => item.id === edge.to)?.title}: {edge.label}</p>
            <EvidenceDetails ids={edge.source_ids} view={view} />
          </li>
        ))}</ul>
      </details>
    </div>
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-caption text-muted-foreground">{view.kind === "scope"
        ? "Proposed scope. David must confirm scope, pricing, availability, and dates. Choose a section to review or edit."
        : view.kind === "comparison" ? "Review each requirement and its evidence. These summaries support human review; they are not a hiring score."
          : "Choose an item to see the contribution and supporting evidence."}</p>
      <ol className="flex min-w-0 flex-col gap-2">
        {view.items.map((item) => (
          <li key={item.id} className="min-w-0 border-b border-border">
            <h3>
              <Button id={`${id}-heading-${item.id}`} type="button" variant="ghost" disabled={editingId !== null} aria-expanded={openItemId === item.id} aria-controls={`${id}-panel-${item.id}`} className="h-auto w-full justify-between gap-4 whitespace-normal py-2.5 text-left" onClick={() => setOpenItemId(openItemId === item.id ? null : item.id)}>
                <span className="min-w-0">
                  {item.period ? <span className="block text-caption text-muted-foreground">{item.period}</span> : null}
                  <span className="block text-body font-medium break-words">{item.title}</span>
                  {view.kind === "comparison" ? <span className="block text-caption text-muted-foreground">{statusLabels[item.status]}</span> : null}
                  {state.edits?.[item.id] !== undefined ? <span className="block text-caption text-muted-foreground">Edited by you</span> : null}
                </span>
                <ChevronDown aria-hidden="true" className={openItemId === item.id ? "shrink-0 rotate-180" : "shrink-0"} />
              </Button>
            </h3>
            <div id={`${id}-panel-${item.id}`} role="region" aria-labelledby={`${id}-heading-${item.id}`} hidden={openItemId !== item.id} className={openItemId === item.id ? "flex min-w-0 flex-col gap-2 p-2.5" : "hidden"}>
              {openItemId === item.id ? (
                <>
                  {editingId === item.id ? (
                    <form className="flex flex-col gap-2" onSubmit={(event) => {
                      event.preventDefault()
                      if (!editDraft.trim()) return
                      onChange({ ...state, edits: { ...state.edits, [item.id]: editDraft.trim() } })
                      finishEdit()
                    }}>
                      <label htmlFor={`${id}-edit`} className="sr-only">Edit {item.title}</label>
                      <textarea ref={editRef} id={`${id}-edit`} rows={4} value={editDraft} disabled={disabled} maxLength={VIEW_EDIT_LIMIT} onChange={(event) => setEditDraft(event.target.value)} aria-describedby={`${id}-edit-hint`} className="chat-input w-full resize-y rounded-lg border border-input bg-background p-2.5 text-base text-foreground outline-none focus-visible:border-ring" />
                      <p id={`${id}-edit-hint`} className="text-caption text-muted-foreground">Unsaved edit. Save or cancel before closing. {editDraft.length}/{VIEW_EDIT_LIMIT}</p>
                      <div className="flex gap-2"><Button type="submit" disabled={disabled || !editDraft.trim()}>Save edit</Button><Button type="button" variant="ghost" onClick={finishEdit}>Cancel edit</Button></div>
                    </form>
                  ) : (
                    <>
                      <p className="text-body whitespace-pre-wrap break-words">{state.edits?.[item.id] ?? item.summary}</p>
                      {item.detail ? <p className="text-caption break-words text-muted-foreground">{item.detail}</p> : null}
                      {view.kind === "scope" ? (
                        <Button id={`${id}-edit-${item.id}`} type="button" variant="ghost" className="self-start" disabled={disabled} onClick={() => {
                          returnEditId.current = item.id
                          setEditDraft(state.edits?.[item.id] ?? item.summary)
                          setEditingId(item.id)
                          onEditingChange?.(true)
                        }}>Edit section</Button>
                      ) : <Button type="button" variant={state.selectedId === item.id ? "secondary" : "ghost"} aria-pressed={state.selectedId === item.id} disabled={disabled} className="self-start" onClick={() => select(item.id)}>{state.selectedId === item.id ? "Selected for follow-up" : "Use in follow-up"}</Button>}
                    </>
                  )}
                  {view.kind !== "scope" || item.source_ids.length ? <EvidenceDetails ids={item.source_ids} view={view} /> : null}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {view.kind === "scope" ? (
        <>
          <p className="text-caption text-muted-foreground">Saved edits stay in this tab and are included with your next question.</p>
          {Object.keys(state.edits ?? {}).length ? <Button type="button" variant="ghost" className="self-start" disabled={disabled || editingId !== null} onClick={() => onChange({ ...state, edits: {} })}>Restore AI draft</Button> : null}
        </>
      ) : null}
    </div>
  )
}

const resultLabels = {
  text: { action: "Read answer", singular: "answer", plural: "answers" },
  projects: { action: "View contributions and evidence", singular: "project", plural: "projects" },
  comparison: { action: "Review comparison", singular: "requirement", plural: "requirements" },
  architecture: { action: "Explore diagram", singular: "system", plural: "systems" },
  timeline: { action: "Explore timeline", singular: "role", plural: "roles" },
  scope: { action: "Review project brief", singular: "section", plural: "sections" },
} as const

export function AiAnswerView({ view, state = {}, onChange, disabled = false }: {
  view: AnswerView; state?: ViewState; onChange: (state: ViewState) => void; disabled?: boolean
}) {
  const id = useId()
  const [expanded, setExpanded] = useState<"result" | "sources" | null>(null)
  const [editing, setEditing] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)
  const label = resultLabels[view.kind]
  const sourceIds = [...new Set([...view.items, ...view.connections].flatMap((item) => item.source_ids))]
  const sourceCount = view.evidence.filter((source) => sourceIds.includes(source.id)).length

  useEffect(() => {
    const dialog = dialogRef.current
    if (expanded && dialog && !dialog.open) dialog.showModal()
    else if (!expanded && dialog?.open) dialog.close()
  }, [expanded])

  if (view.kind === "text") return null

  return (
    <section aria-label={view.title || "Explore this answer"} className="w-full min-w-0 py-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="break-words">{view.title || label.action}</CardTitle>
          <CardDescription>{view.items.length} {view.items.length === 1 ? label.singular : label.plural}{view.kind === "scope" && Object.keys(state.edits ?? {}).length ? ` · ${Object.keys(state.edits ?? {}).length} edited` : ""}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <ul className="flex min-w-0 flex-col gap-2" aria-label="Result preview">
            {view.items.slice(0, 3).map((item) => <li key={item.id} className="min-w-0">
              <p className="text-body font-medium break-words">{item.title}</p>
              {view.kind === "projects" ? <p className="line-clamp-2 text-caption text-muted-foreground">{item.summary}</p> : null}
            </li>)}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-auto whitespace-normal text-left" onClick={(event) => { returnFocusRef.current = event.currentTarget; setExpanded("result") }}>{label.action}</Button>
            {sourceCount ? <Button type="button" variant="ghost" onClick={(event) => { returnFocusRef.current = event.currentTarget; setExpanded("sources") }}>Sources ({sourceCount})</Button> : null}
          </div>
        </CardContent>
      </Card>
      <dialog ref={dialogRef} aria-labelledby={`${id}-title`} className="fixed inset-0 m-auto max-h-full w-full max-w-(--measure) overflow-y-auto rounded-lg border border-border bg-background p-4 text-foreground backdrop:bg-background/85 sm:p-6" onCancel={(event) => { if (editing) event.preventDefault() }} onClose={() => { setExpanded(null); setEditing(false); returnFocusRef.current?.focus() }}>
        {expanded ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-2"><h2 id={`${id}-title`} className="text-title">{expanded === "sources" ? `Sources for ${view.title}` : view.title}</h2><Button type="button" variant="ghost" disabled={editing} onClick={() => dialogRef.current?.close()}>Close</Button></div>
            {expanded === "sources" ? <EvidenceDetails ids={sourceIds} view={view} open /> : <AiAnswerContent view={view} state={state} onChange={onChange} disabled={disabled} onEditingChange={setEditing} />}
          </>
        ) : null}
      </dialog>
    </section>
  )
}
