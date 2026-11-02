"use client"

import { useEffect, useRef, useState } from "react"
import { SendHorizonal } from "lucide-react"
import Link from "next/link"
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react"
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
  intent?: ChatIntent
}

let turnCounter = 0
const CONSENT_VERSION = "2026-09-22"
const CONSENT_STORAGE_KEY = "ask-ai:conversation-storage-consent"
const CONVERSATION_SESSION_KEY = "ask-ai:conversation-session-id"

function nextId(role: Turn["role"]) {
  turnCounter += 1
  return `${role}-${turnCounter}`
}

function replaceTurn(turns: Turn[], id: string, update: (turn: Turn) => Turn): Turn[] {
  return turns.map((turn) => (turn.id === id ? update(turn) : turn))
}

export function AskAiChat({ embedded = false, suggestedQuestion }: { embedded?: boolean; suggestedQuestion?: string } = {}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [questionsRemaining, setQuestionsRemaining] = useState<number | null>(null)
  const [improvementLogging, setImprovementLogging] = useState(false)
  const [showConsentError, setShowConsentError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const consentRef = useRef<HTMLInputElement | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const reducedMotion = useReducedMotion()
  const embeddedRef = useRef<HTMLDivElement>(null)
  const inView = useInView(embeddedRef, { once: true, amount: 0.3 })
  const hasSuggested = useRef(false)

  const hasConversation = turns.length > 0

  useEffect(() => {
    if (!embedded || !inView || !suggestedQuestion || hasSuggested.current) return
    hasSuggested.current = true
    setDraft((current) => current || suggestedQuestion)
  }, [embedded, inView, suggestedQuestion])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    const syncConsent = () => {
      setImprovementLogging(localStorage.getItem(CONSENT_STORAGE_KEY) === CONSENT_VERSION)
    }
    syncConsent()
    window.addEventListener("storage", syncConsent)
    return () => window.removeEventListener("storage", syncConsent)
  }, [])

  useEffect(() => {
    let conversationId = sessionStorage.getItem(CONVERSATION_SESSION_KEY)
    if (!conversationId) {
      conversationId = crypto.randomUUID()
      sessionStorage.setItem(CONVERSATION_SESSION_KEY, conversationId)
    }
    conversationIdRef.current = conversationId
  }, [])

  const dockRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!hasConversation || embedded) return
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
  }, [turns, hasConversation, embedded])

  async function ask(text: string) {
    const question = text.trim()
    if (!question || !improvementLogging || isStreaming) return

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

    if (!conversationIdRef.current) {
      conversationIdRef.current = crypto.randomUUID()
      sessionStorage.setItem(CONVERSATION_SESSION_KEY, conversationIdRef.current)
    }

    try {
      for await (const event of streamChat({
        messages: history,
        signal: controller.signal,
        improvementLogging: true,
        conversationId: conversationIdRef.current ?? undefined,
        turnId: crypto.randomUUID(),
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
        } else if (event.type === "rate_limit") {
          setQuestionsRemaining(event.remaining)
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

  const submitDraft = () => {
    if (draft.trim() && !improvementLogging) {
      setShowConsentError(true)
      consentRef.current?.focus()
      return
    }
    setShowConsentError(false)
    void ask(draft)
  }

  const composer = (
    <div>
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
      {questionsRemaining !== null ? (
        <p className="mt-1.5 text-center text-caption text-muted-foreground" aria-live="polite">
          {questionsRemaining} question{questionsRemaining === 1 ? "" : "s"} remaining today
        </p>
      ) : null}
      <AnimatePresence initial>
        {draft.trim() ? (
          <motion.label
            key="conversation-consent"
            initial={reducedMotion ? { opacity: 1 } : { height: 0, marginTop: 0, opacity: 0, y: -4 }}
            animate={{ height: "auto", marginTop: 8, opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, marginTop: 0, opacity: 0, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.17, ease: [0.22, 1, 0.36, 1] }}
            className="flex cursor-pointer items-start gap-2 overflow-hidden px-1 text-caption text-muted-foreground"
          >
            <input
              ref={consentRef}
              type="checkbox"
              checked={improvementLogging}
              disabled={isStreaming}
              onChange={(event) => {
                const checked = event.target.checked
                setImprovementLogging(checked)
                if (checked) {
                  localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_VERSION)
                  setShowConsentError(false)
                } else {
                  localStorage.removeItem(CONSENT_STORAGE_KEY)
                }
              }}
              aria-describedby={showConsentError ? "conversation-consent-error" : undefined}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              I consent to storing this conversation for 30 days to help improve the assistant.{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy details
              </Link>
            </span>
          </motion.label>
        ) : null}
      </AnimatePresence>
      {showConsentError && draft.trim() ? (
        <p
          id="conversation-consent-error"
          role="alert"
          className="mt-1.5 px-1 text-caption text-destructive"
        >
          Please check the box to consent before sending your question.
        </p>
      ) : null}
    </div>
  )

  if (!hasConversation && !embedded) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-min flex-1 flex-col items-center justify-center-safe gap-3 py-[clamp(1.25rem,7dvh,3.5rem)] sm:gap-4">
          <div className="w-[clamp(7rem,34vw,10rem)]">
            <MatrixOrb state="idle" size={160} />
          </div>
          <h1 className="max-w-[24rem] text-balance break-words text-center text-2xl leading-tight font-semibold text-foreground sm:text-[1.75rem]">
            {askAi.title}?
          </h1>
          <div className="w-full max-w-[38rem]">{composer}</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={embeddedRef} className={embedded ? "my-6 flex min-w-0 flex-col rounded-lg border border-border bg-card p-4 sm:p-6" : "flex min-h-0 min-w-0 flex-1 flex-col"}>
      {embedded ? (
        <h2 className="sr-only">{askAi.label}</h2>
      ) : (
        <h1 className="sr-only">{askAi.label}</h1>
      )}
      {embedded && <p className="text-caption text-muted-foreground">Ask about my work and experience. A suggested question appears when this section comes into view.</p>}

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
        className={embedded ? "mt-4" : "sticky bottom-0 z-10 -mx-6 mt-3 bg-gradient-to-t from-background via-background via-80% to-transparent px-6 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:-mx-8 sm:mt-4 md:px-8 sm:pt-6 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]"}
      >
        {composer}
      </div>
    </div>
  )
}
