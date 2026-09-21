"use client"

import { useEffect, useRef, useState } from "react"
import { SendHorizonal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AiApiError,
  streamChat,
  stripCitationMarkers,
  type ChatIntent,
  type ChatTurn,
} from "@/lib/ai-client"
import { askAi, askAiStatus } from "@/lib/portfolio-data"
import { MatrixOrb } from "@/components/portfolio/matrix-orb"

type Turn = {
  id: string
  role: "user" | "assistant"
  content: string
  status: "streaming" | "done" | "error"
  error?: string
  /** How the server read the question, from the `retrieval` frame. */
  intent?: ChatIntent
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
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

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
      status: "done",
    }
    const assistantTurn: Turn = {
      id: nextId("assistant"),
      role: "assistant",
      content: "",
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
        if (event.type === "delta") {
          setTurns((previous) =>
            replaceTurn(previous, assistantTurn.id, (turn) => ({
              ...turn,
              content: stripCitationMarkers(turn.content + event.text),
            }))
          )
        } else if (event.type === "retrieval") {
          setTurns((previous) =>
            replaceTurn(previous, assistantTurn.id, (turn) => ({
              ...turn,
              intent: event.intent,
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

  const submitDraft = () => void ask(draft)

  const composer = (
    <form
      className="group/composer flex w-full min-w-0 items-end gap-1.5 rounded-[1.35rem] border border-input bg-card p-1.5 pl-3 shadow-sm transition-[border-color,box-shadow,background-color] hover:border-foreground/25 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20 sm:gap-2 sm:rounded-[1.5rem] sm:pl-4"
      onSubmit={(event) => {
        event.preventDefault()
        submitDraft()
      }}
    >
      <label htmlFor="ask-ai-input" className="sr-only">
        {askAi.inputLabel}
      </label>
      <textarea
        ref={inputRef}
        id="ask-ai-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
            return
          }
          event.preventDefault()
          submitDraft()
        }}
        placeholder={askAi.placeholder}
        autoComplete="off"
        enterKeyHint="send"
        rows={1}
        aria-describedby="ask-ai-input-hint"
        className="min-h-9 max-h-28 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-base leading-6 text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:max-h-32 sm:text-body sm:leading-[1.375rem]"
      />
      <span id="ask-ai-input-hint" className="sr-only">
        Press Enter to send. Press Shift and Enter for a new line.
      </span>
      <Button
        type="submit"
        size="icon"
        aria-label="Send question"
        disabled={!draft.trim() || isStreaming}
        className="size-9 shrink-0 rounded-full transition-[transform,background-color,opacity] active:scale-95 active:translate-y-0 disabled:scale-100 sm:size-10"
      >
        <SendHorizonal className="size-4" aria-hidden="true" />
      </Button>
    </form>
  )

  /* Empty state: prompt + composer centered in the available space. */
  if (!hasConversation) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <h2 className="sr-only">{askAi.label}</h2>
        {/* `justify-center-safe` falls back to `flex-start` when the content is
            taller than the viewport (software keyboards), so the composer can
            still be reached. The safe-area padding keeps it clear of notches
            and home indicators inside in-app browsers. */}
        <div className="flex min-h-min flex-1 flex-col items-center justify-center-safe gap-3 py-[clamp(1.25rem,7dvh,3.5rem)] sm:gap-4">
          <div className="w-[clamp(7rem,34vw,10rem)]">
            <MatrixOrb state="idle" size={160} />
          </div>
          <p className="max-w-[24rem] text-balance break-words text-center text-xl leading-7 font-medium text-foreground sm:text-name-sm sm:leading-8">
            {askAi.title}?
          </p>
          <div className="w-full max-w-[38rem]">{composer}</div>
        </div>
      </div>
    )
  }

  /* Conversation state: messages scroll in `main` while the docked
     composer stays pinned to the bottom. */
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <h2 className="sr-only">{askAi.label}</h2>

      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="flex min-w-0 flex-1 flex-col gap-2.5 pt-4 sm:gap-3 sm:pt-6"
      >
        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.id} className="flex min-w-0 justify-end pl-8 sm:pl-16">
              <p className="min-w-0 max-w-full overflow-hidden rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-body break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-primary-foreground sm:max-w-[85%]">
                {turn.content}
              </p>
            </div>
          ) : (
            <div key={turn.id} className="flex min-w-0 justify-start pr-5 sm:pr-12">
              <div
                className={
                  !turn.content && turn.status === "streaming" && !turn.error
                    ? "min-w-0 max-w-full"
                    : "min-w-0 max-w-full overflow-hidden rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5 sm:max-w-[90%]"
                }
              >
                {turn.content ? (
                  <p className="text-body break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-foreground/90">
                    {turn.content}
                  </p>
                ) : turn.status === "streaming" ? (
                  <MatrixOrb
                    state="thinking"
                    size={88}
                    dots={9}
                    labels={{ thinking: askAiStatus[turn.intent ?? "general"] }}
                    className="gap-2 py-1"
                  />
                ) : null}

                {turn.error ? (
                  <p className="mt-2 text-caption break-words [overflow-wrap:anywhere] text-destructive">{turn.error}</p>
                ) : null}

              </div>
            </div>
          )
        )}
      </div>

      <div
        ref={dockRef}
        className="sticky bottom-0 z-10 -mx-4 mt-3 bg-gradient-to-t from-background via-background via-80% to-transparent px-4 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:mt-4 sm:px-6 sm:pt-6 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {composer}
      </div>
    </div>
  )
}
