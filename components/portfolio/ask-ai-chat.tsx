"use client"

import { useEffect, useRef, useState } from "react"
import { SendHorizonal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EvidenceCitations } from "@/components/portfolio/evidence-citations"
import { AiApiError, streamChat, type AiSource, type ChatTurn } from "@/lib/ai-client"
import { askAi } from "@/lib/portfolio-data"

type Turn = {
  id: string
  role: "user" | "assistant"
  content: string
  sources: AiSource[]
  notes: string[]
  status: "streaming" | "done" | "error"
  error?: string
}

let turnCounter = 0

function nextId(role: Turn["role"]) {
  turnCounter += 1
  return `${role}-${turnCounter}`
}

function replaceTurn(turns: Turn[], id: string, update: (turn: Turn) => Turn): Turn[] {
  return turns.map((turn) => (turn.id === id ? update(turn) : turn))
}

export function AskAiChat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const hasConversation = turns.length > 0

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  /** Keeps the latest message in view while a conversation streams. */
  const dockRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!hasConversation) return
    const dock = dockRef.current
    const scroller = dock?.closest("main")
    if (!dock || !scroller) return
    const nearBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160
    if (!nearBottom) return
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    dock.scrollIntoView({
      block: "end",
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }, [turns, hasConversation])

  async function ask(text: string) {
    const question = text.trim()
    if (!question || isStreaming) return

    const userTurn: Turn = {
      id: nextId("user"),
      role: "user",
      content: question,
      sources: [],
      notes: [],
      status: "done",
    }
    const assistantTurn: Turn = {
      id: nextId("assistant"),
      role: "assistant",
      content: "",
      sources: [],
      notes: [],
      status: "streaming",
    }

    // History is everything already on screen plus the new question. The
    // empty assistant placeholder is deliberately not sent to the model.
    const history: ChatTurn[] = [...turns, userTurn].map((turn) => ({
      role: turn.role,
      content: turn.content,
    }))

    setTurns((previous) => [...previous, userTurn, assistantTurn])
    setDraft("")
    setIsStreaming(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      for await (const event of streamChat({
        messages: history,
        signal: controller.signal,
      })) {
        if (event.type === "retrieval") {
          setTurns((previous) =>
            replaceTurn(previous, assistantTurn.id, (turn) => ({
              ...turn,
              notes: event.notes,
            }))
          )
        } else if (event.type === "citations") {
          setTurns((previous) =>
            replaceTurn(previous, assistantTurn.id, (turn) => ({
              ...turn,
              sources: event.sources,
            }))
          )
        } else if (event.type === "delta") {
          setTurns((previous) =>
            replaceTurn(previous, assistantTurn.id, (turn) => ({
              ...turn,
              content: turn.content + event.text,
            }))
          )
        } else if (event.type === "error") {
          setTurns((previous) =>
            replaceTurn(previous, assistantTurn.id, (turn) => ({
              ...turn,
              status: "error",
              error: event.detail,
            }))
          )
        } else if (event.type === "done") {
          setTurns((previous) =>
            replaceTurn(previous, assistantTurn.id, (turn) => ({
              ...turn,
              status: "done",
            }))
          )
        }
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return
      const detail =
        error instanceof AiApiError
          ? error.message
          : "Something went wrong while answering. Try again."
      setTurns((previous) =>
        replaceTurn(previous, assistantTurn.id, (turn) => ({
          ...turn,
          status: "error",
          error: detail,
        }))
      )
    } finally {
      setIsStreaming(false)
      setTurns((previous) =>
        replaceTurn(previous, assistantTurn.id, (turn) =>
          turn.status === "streaming" ? { ...turn, status: "done" } : turn
        )
      )
    }
  }

  const suggestions = (
    <div className="flex flex-wrap gap-2">
      {askAi.suggestions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => void ask(question)}
          disabled={isStreaming}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-caption text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  )

  const composer = (
    <form
      className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 focus-within:border-ring"
      onSubmit={(event) => {
        event.preventDefault()
        void ask(draft)
      }}
    >
      <label htmlFor="ask-ai-input" className="sr-only">
        {askAi.inputLabel}
      </label>
      <input
        id="ask-ai-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={askAi.placeholder}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send question"
        disabled={!draft.trim() || isStreaming}
        className="size-9 shrink-0 rounded-full"
      >
        <SendHorizonal className="size-4" aria-hidden="true" />
      </Button>
    </form>
  )

  /* Empty state: composer + suggestions centered in the available space. */
  if (!hasConversation) {
    return (
      <div className="flex flex-1 flex-col">
        <h2 className="sr-only">{askAi.label}</h2>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8">
          <div className="w-full">{composer}</div>
          <div className="flex justify-center">{suggestions}</div>
          <p className="max-w-sm text-center text-caption text-subtle-foreground">
            Answers come from a curated knowledge base and cite the evidence
            behind every claim.
          </p>
        </div>
      </div>
    )
  }

  /* Conversation state: messages scroll in `main` while the docked
     composer stays pinned to the bottom. */
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="sr-only">{askAi.label}</h2>

      <div aria-live="polite" className="flex flex-1 flex-col gap-3 pt-6">
        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.id} className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-body whitespace-pre-wrap text-primary-foreground">
                {turn.content}
              </p>
            </div>
          ) : (
            <div key={turn.id} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5">
                {turn.content ? (
                  <p className="text-body whitespace-pre-wrap text-foreground/90">
                    {turn.content}
                  </p>
                ) : turn.status === "streaming" ? (
                  <p className="text-body text-muted-foreground">
                    Reading the knowledge base…
                  </p>
                ) : null}

                {turn.error ? (
                  <p className="mt-2 text-caption text-destructive">{turn.error}</p>
                ) : null}

                {turn.notes.map((note) => (
                  <p key={note} className="mt-2 text-caption text-subtle-foreground">
                    {note}
                  </p>
                ))}

                <EvidenceCitations sources={turn.sources} />
              </div>
            </div>
          )
        )}
      </div>

      <div
        ref={dockRef}
        className="sticky bottom-0 z-10 -mx-4 mt-4 -mb-12 bg-background px-4 pt-3 pb-4 sm:-mx-6 sm:-mb-16 sm:px-6 sm:pb-5"
      >
        <div className="flex flex-col gap-3">
          {suggestions}
          {composer}
        </div>
      </div>
    </div>
  )
}
