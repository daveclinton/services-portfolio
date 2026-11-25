"use client"

import { useEffect, useId, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VIEW_EDIT_LIMIT, type AnswerView, type ViewItem, type ViewState } from "@/lib/ai-client"

const statusLabels: Record<ViewItem["status"], string> = {
  demonstrated: "Demonstrated", related: "Related experience", not_established: "Not established",
  proposed: "Proposed", context: "Published context",
}

function EvidenceDetails({ ids, view }: { ids: number[]; view: AnswerView }) {
  const sources = view.evidence.filter((source) => ids.includes(source.id))
  if (!sources.length) return <p className="text-caption text-muted-foreground">No supporting excerpt attached. Confirm this point with David.</p>
  return (
    <details className="text-caption text-muted-foreground">
      <summary className="cursor-pointer py-2">Supporting material ({sources.length})</summary>
      <ul className="flex flex-col gap-4">
        {sources.map((source) => (
          <li key={source.id} className="min-w-0">
            <p className="font-medium text-foreground">{source.title}</p>
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

export function AiAnswerView({ view, state = {}, onChange, disabled = false }: {
  view: AnswerView; state?: ViewState; onChange: (state: ViewState) => void; disabled?: boolean
}) {
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const dialogRef = useRef<HTMLDialogElement>(null)
  const expandRef = useRef<HTMLButtonElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const returnEditId = useRef<string | null>(null)
  const selected = view.items.find((item) => item.id === state.selectedId)

  useEffect(() => {
    const dialog = dialogRef.current
    if (expanded && dialog && !dialog.open) dialog.showModal()
    else if (!expanded && dialog?.open) dialog.close()
  }, [expanded])

  useEffect(() => {
    if (editingId) editRef.current?.focus()
    else if (returnEditId.current) document.getElementById(`${id}-edit-${returnEditId.current}`)?.focus()
  }, [editingId, id])

  if (view.kind === "text") return null

  function select(itemId: string) {
    onChange({ ...state, selectedId: state.selectedId === itemId ? undefined : itemId })
  }

  function finishEdit() {
    setEditingId(null)
  }

  const content = view.kind === "scope" ? (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-caption text-muted-foreground">Proposed scope. David must confirm scope, pricing, availability, and dates. Saved edits stay in this tab and are included when you send a follow-up.</p>
      {view.items.map((item) => (
        <Card key={item.id} size="sm">
          <CardHeader><CardTitle>{item.title}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {editingId === item.id ? (
              <form className="flex flex-col gap-2" onSubmit={(event) => {
                event.preventDefault()
                if (!editDraft.trim()) return
                onChange({ ...state, edits: { ...state.edits, [item.id]: editDraft.trim() } })
                finishEdit()
              }}>
                <label htmlFor={`${id}-edit`} className="sr-only">Edit {item.title}</label>
                <textarea ref={editRef} id={`${id}-edit`} rows={4} value={editDraft} disabled={disabled} maxLength={VIEW_EDIT_LIMIT} onChange={(event) => setEditDraft(event.target.value)} aria-describedby={`${id}-edit-hint`} className="chat-input w-full resize-y rounded-lg border border-input bg-background p-2.5 text-base text-foreground outline-none focus-visible:border-ring" />
                <p id={`${id}-edit-hint`} className="text-caption text-muted-foreground">Unsaved edit. Save it before sending your next question. {editDraft.length}/{VIEW_EDIT_LIMIT}</p>
                <div className="flex gap-2">
                  <Button type="submit" disabled={disabled || !editDraft.trim()}>Save edit</Button>
                  <Button type="button" variant="ghost" onClick={finishEdit}>Cancel edit</Button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-body whitespace-pre-wrap break-words">{state.edits?.[item.id] ?? item.summary}</p>
                {state.edits?.[item.id] !== undefined ? <p className="text-caption text-muted-foreground">Edited by you · proposal for discussion</p> : null}
                <Button id={`${id}-edit-${item.id}`} type="button" variant="ghost" className="self-start" disabled={disabled || editingId !== null} onClick={() => {
                  returnEditId.current = item.id
                  setEditDraft(state.edits?.[item.id] ?? item.summary)
                  setEditingId(item.id)
                }}>Edit {item.title}</Button>
              </>
            )}
            {item.source_ids.length ? <EvidenceDetails ids={item.source_ids} view={view} /> : null}
          </CardContent>
        </Card>
      ))}
      {Object.keys(state.edits ?? {}).length ? <Button type="button" variant="ghost" className="self-start" disabled={disabled || editingId !== null} onClick={() => onChange({ ...state, edits: {} })}>Restore AI draft</Button> : null}
    </div>
  ) : view.kind === "comparison" ? (
    <ScrollArea orientation="horizontal" viewportProps={{ role: "region", "aria-label": "Requirement and evidence comparison" }}>
      <table className="w-full text-left text-body">
        <caption className="sr-only">Evidence summaries for human review, without a hiring score</caption>
        <thead><tr className="border-b border-border"><th scope="col" className="p-2.5">Requirement</th><th scope="col" className="p-2.5">Evidence and gaps</th></tr></thead>
        <tbody>{view.items.map((item) => (
          <tr key={item.id} className="border-b border-border">
            <th scope="row" className="p-2.5 align-top font-medium">
              <Button type="button" variant={state.selectedId === item.id ? "secondary" : "ghost"} aria-pressed={state.selectedId === item.id} disabled={disabled} className="h-auto whitespace-normal text-left" onClick={() => select(item.id)}>{item.title}</Button>
              <span className="mt-2 block text-caption text-muted-foreground">{statusLabels[item.status]}</span>
            </th>
            <td className="p-2.5 align-top"><p>{item.summary}</p>{item.detail ? <p className="mt-2 text-caption text-muted-foreground">{item.detail}</p> : null}<EvidenceDetails ids={item.source_ids} view={view} /></td>
          </tr>
        ))}</tbody>
      </table>
    </ScrollArea>
  ) : view.kind === "architecture" ? (
    <div className="flex min-w-0 flex-col gap-4">
      <ArchitectureDiagram view={view} selectedId={state.selectedId} onSelect={select} disabled={disabled} />
      <div className="flex flex-wrap gap-2" aria-label="Inspect system nodes">{view.items.map((item) => <Button key={item.id} type="button" variant={state.selectedId === item.id ? "secondary" : "outline"} aria-label={`Inspect ${item.title}`} aria-pressed={state.selectedId === item.id} disabled={disabled} onClick={() => select(item.id)}>{item.title}</Button>)}</div>
      <ul className="flex flex-col gap-2" aria-label="Documented connections">{view.connections.map((edge, index) => (
        <li key={index} className="text-caption text-muted-foreground">
          <p>{view.items.find((item) => item.id === edge.from)?.title} to {view.items.find((item) => item.id === edge.to)?.title}: {edge.label}</p>
          <EvidenceDetails ids={edge.source_ids} view={view} />
        </li>
      ))}</ul>
      {selected ? <Card size="sm"><CardHeader><CardTitle>{selected.title}</CardTitle></CardHeader><CardContent><p className="text-body">{selected.summary}</p><p className="mt-2 text-caption text-muted-foreground">{selected.detail}</p><EvidenceDetails ids={selected.source_ids} view={view} /></CardContent></Card> : <p className="text-caption text-muted-foreground">Select a node to inspect the explanation and supporting material.</p>}
    </div>
  ) : (
    <ol className={view.kind === "timeline" ? "flex min-w-0 flex-col gap-4 border-l border-border pl-4" : "grid min-w-0 gap-4 sm:grid-cols-2"}>
      {view.items.map((item) => (
        <li key={item.id} className="min-w-0">
          <Card size="sm">
            <CardHeader>{item.period ? <p className="text-caption text-muted-foreground">{item.period}</p> : null}<CardTitle>{item.title}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-body">{item.summary}</p>
              <details><summary className="cursor-pointer text-caption text-muted-foreground">Contribution and evidence</summary><p className="mt-2 text-body">{item.detail}</p><EvidenceDetails ids={item.source_ids} view={view} /></details>
              <Button type="button" variant={state.selectedId === item.id ? "secondary" : "ghost"} aria-pressed={state.selectedId === item.id} disabled={disabled} className="self-start" onClick={() => select(item.id)}>{state.selectedId === item.id ? "Selected for follow-up" : "Use in follow-up"}</Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  )

  return (
    <section aria-label={view.title || "Explore this answer"} className="flex w-full min-w-0 flex-col gap-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-body font-medium">{view.title || "Explore this answer"}</h3>
        <Button ref={expandRef} type="button" variant="ghost" size="sm" disabled={editingId !== null} onClick={() => setExpanded(true)}>Expand</Button>
      </div>
      {selected ? <p aria-live="polite" className="text-caption text-muted-foreground">{selected.title} is selected for your next question.</p> : null}
      {expanded ? <p className="text-caption text-muted-foreground">Expanded view is open.</p> : content}
      <dialog ref={dialogRef} aria-labelledby={`${id}-title`} className="fixed inset-0 m-auto max-h-full w-full max-w-(--measure) overflow-y-auto rounded-lg border border-border bg-background p-4 text-foreground backdrop:bg-background/85 sm:p-6" onCancel={(event) => { if (editingId) event.preventDefault() }} onClose={() => { setExpanded(false); expandRef.current?.focus() }}>
        <div className="mb-4 flex items-start justify-between gap-2"><h2 id={`${id}-title`} className="text-title">{view.title}</h2><Button type="button" variant="ghost" disabled={editingId !== null} onClick={() => dialogRef.current?.close()}>Close</Button></div>
        {expanded ? content : null}
      </dialog>
    </section>
  )
}
