"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Check, Copy, RotateCcw, SquarePen } from "lucide-react"
import Link from "next/link"
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { ChatContainerContent, ChatContainerRoot } from "@/components/prompt-kit/chat-container"
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/prompt-kit/message"
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import {
  AiApiError,
  streamChat,
  stripCitationMarkers,
  type ChatIntent,
  type ChatTurn,
} from "@/lib/ai-client"
import { askAi, askAiStatus } from "@/lib/portfolio-data"
import { MatrixOrb } from "@/components/portfolio/matrix-orb"
import { cn } from "@/lib/utils"

// Layout and interaction patterns borrowed from prompt-kit's conversation
// blocks (https://github.com/ibelick/prompt-kit, MIT): the user's message in a
// soft bubble on the right, the assistant's answer as unboxed markdown in the
// reading column, actions under each answer, a scroll-to-latest button, a
// send button that becomes a stop button, and starter questions.

type Turn = {
  id: string
  role: "user" | "assistant"
  content: string
  status: "streaming" | "done" | "error"
  error?: string
  intent?: ChatIntent
}

const CONSENT_VERSION = "2026-09-22"
const CONSENT_STORAGE_KEY = "ask-ai:conversation-storage-consent"
const CONVERSATION_SESSION_KEY = "ask-ai:conversation-session-id"
const TURNS_STORAGE_KEY = "ask-ai:turns"

function newId(role: Turn["role"]) {
  return `${role}-${crypto.randomUUID()}`
}

function replaceTurn(turns: Turn[], id: string, update: (turn: Turn) => Turn): Turn[] {
  return turns.map((turn) => (turn.id === id ? update(turn) : turn))
}

function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <MessageAction tooltip={copied ? "Copied" : "Copy"}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Copy answer"
        className="rounded-full text-muted-foreground hover:text-foreground"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {}
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </MessageAction>
  )
}

export function AskAiChat({ embedded = false, suggestedQuestion }: { embedded?: boolean; suggestedQuestion?: string } = {}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [questionsRemaining, setQuestionsRemaining] = useState<number | null>(null)
  const [consented, setConsented] = useState(false)
  const [showConsentError, setShowConsentError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const consentRef = useRef<HTMLInputElement | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const reducedMotion = useReducedMotion()
  const embeddedRef = useRef<HTMLDivElement>(null)
  const inView = useInView(embeddedRef, { once: true, amount: 0.3 })
  const hasSuggested = useRef(false)
  const restored = useRef(false)

  const hasConversation = turns.length > 0

  // Blog-post version: offer a suggested question once the reader reaches it.
  useEffect(() => {
    if (!embedded || !inView || !suggestedQuestion || hasSuggested.current) return
    hasSuggested.current = true
    setDraft((current) => current || suggestedQuestion)
  }, [embedded, inView, suggestedQuestion])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const syncConsent = () => {
      setConsented(localStorage.getItem(CONSENT_STORAGE_KEY) === CONSENT_VERSION)
    }
    syncConsent()
    window.addEventListener("storage", syncConsent)
    return () => window.removeEventListener("storage", syncConsent)
  }, [])

  // One conversation ID per browser tab; the server sends at most one alert per ID.
  useEffect(() => {
    let conversationId = sessionStorage.getItem(CONVERSATION_SESSION_KEY)
    if (!conversationId) {
      conversationId = crypto.randomUUID()
      sessionStorage.setItem(CONVERSATION_SESSION_KEY, conversationId)
    }
    conversationIdRef.current = conversationId
  }, [])

  // The full page keeps the conversation across reloads in this tab.
  useEffect(() => {
    if (embedded) return
    try {
      const saved = JSON.parse(sessionStorage.getItem(TURNS_STORAGE_KEY) ?? "[]") as Turn[]
      if (Array.isArray(saved) && saved.length > 0) {
        // sessionStorage only exists in the browser, so the saved conversation
        // can only be restored after hydration; doing it during render would
        // make the server and client HTML differ.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTurns(saved.map((turn) => (turn.status === "streaming" ? { ...turn, status: "done" } : turn)))
      }
    } catch {}
    restored.current = true
  }, [embedded])

  useEffect(() => {
    if (embedded || !restored.current || isStreaming) return
    sessionStorage.setItem(TURNS_STORAGE_KEY, JSON.stringify(turns))
  }, [turns, isStreaming, embedded])

  // In the blog-post version the page scrolls; keep the composer in view when
  // the on-screen keyboard opens.
  useEffect(() => {
    const viewport = window.visualViewport
    if (!embedded || !viewport) return
    const onResize = () => {
      if (document.activeElement === inputRef.current) {
        inputRef.current?.scrollIntoView({ block: "nearest" })
      }
    }
    viewport.addEventListener("resize", onResize)
    return () => viewport.removeEventListener("resize", onResize)
  }, [embedded])

  async function streamAnswer(history: Turn[]) {
    const assistantTurn: Turn = { id: newId("assistant"), role: "assistant", content: "", status: "streaming" }
    setTurns([...history, assistantTurn])
    setIsStreaming(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const update = (change: (turn: Turn) => Turn) =>
      setTurns((previous) => replaceTurn(previous, assistantTurn.id, change))

    try {
      for await (const event of streamChat({
        messages: history.map((turn): ChatTurn => ({ role: turn.role, content: turn.content })),
        signal: controller.signal,
        improvementLogging: true,
        conversationId: conversationIdRef.current ?? undefined,
        turnId: crypto.randomUUID(),
      })) {
        if (event.type === "delta") {
          update((turn) => ({ ...turn, content: stripCitationMarkers(turn.content + event.text) }))
        } else if (event.type === "retrieval") {
          update((turn) => ({ ...turn, intent: event.intent }))
        } else if (event.type === "rate_limit") {
          setQuestionsRemaining(event.remaining)
        } else if (event.type === "error") {
          update((turn) => ({ ...turn, status: "error", error: event.detail }))
        } else if (event.type === "done") {
          update((turn) => (turn.status === "error" ? turn : { ...turn, status: "done" }))
        }
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        const detail =
          error instanceof AiApiError ? error.message : "Something went wrong while answering. Try again."
        update((turn) => ({ ...turn, status: "error", error: detail }))
      }
    } finally {
      setIsStreaming(false)
      update((turn) => (turn.status === "streaming" ? { ...turn, status: "done" } : turn))
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  function ask(text: string) {
    const question = text.trim()
    if (!question || isStreaming) return
    if (!consented) {
      setDraft(question)
      setShowConsentError(true)
      consentRef.current?.focus()
      return
    }
    setShowConsentError(false)
    setDraft("")
    const userTurn: Turn = { id: newId("user"), role: "user", content: question, status: "done" }
    void streamAnswer([...turns, userTurn])
  }

  // Ask the last question again, replacing the last answer.
  function retry() {
    if (isStreaming) return
    const lastUser = turns.findLastIndex((turn) => turn.role === "user")
    if (lastUser === -1) return
    void streamAnswer(turns.slice(0, lastUser + 1))
  }

  function stop() {
    abortRef.current?.abort()
  }

  function newChat() {
    abortRef.current?.abort()
    const conversationId = crypto.randomUUID()
    sessionStorage.setItem(CONVERSATION_SESSION_KEY, conversationId)
    sessionStorage.removeItem(TURNS_STORAGE_KEY)
    conversationIdRef.current = conversationId
    setTurns([])
    setDraft("")
    setShowConsentError(false)
    inputRef.current?.focus()
  }

  const composer = (
    <div>
      <form
        className="flex w-full min-w-0 items-end gap-2 rounded-3xl border border-input bg-card p-2 pl-4 shadow-xs transition-[border-color,box-shadow,background-color] hover:border-foreground/25 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20"
        onSubmit={(event) => {
          event.preventDefault()
          if (isStreaming) stop()
          else ask(draft)
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
            if (event.key === "Escape" && isStreaming) {
              event.preventDefault()
              stop()
              return
            }
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            ask(draft)
          }}
          placeholder={askAi.placeholder}
          autoComplete="off"
          enterKeyHint="send"
          rows={1}
          aria-describedby="ask-ai-input-hint"
          className="min-h-11 max-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2.5 text-base leading-6 text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground"
        />
        <span id="ask-ai-input-hint" className="sr-only">
          Press Enter to send and Shift and Enter for a new line. Press Escape to stop an answer.
        </span>
        {isStreaming ? (
          <Button type="submit" size="icon" aria-label="Stop answering" className="size-9 shrink-0 rounded-full">
            <span className="size-3 rounded-[3px] bg-primary-foreground" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            aria-label="Send question"
            disabled={!draft.trim()}
            className="size-9 shrink-0 rounded-full transition-[transform,opacity] active:scale-95"
          >
            <ArrowUp className="size-[18px]" aria-hidden="true" />
          </Button>
        )}
      </form>

      <div className="mt-2 px-2 text-center text-caption text-muted-foreground">
        {consented ? (
          <p>
            {askAi.storageNotice}{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy
            </Link>
            {questionsRemaining !== null ? (
              <span aria-live="polite">
                {" · "}
                {questionsRemaining} question{questionsRemaining === 1 ? "" : "s"} left today
              </span>
            ) : null}
          </p>
        ) : (
          <label className="inline-flex cursor-pointer items-start gap-2 text-left">
            <input
              ref={consentRef}
              type="checkbox"
              checked={consented}
              onChange={(event) => {
                const checked = event.target.checked
                setConsented(checked)
                if (checked) {
                  localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_VERSION)
                  setShowConsentError(false)
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
          </label>
        )}
        {showConsentError && !consented ? (
          <p id="conversation-consent-error" role="alert" className="mt-1.5 text-destructive">
            Please check the box to consent before sending your question.
          </p>
        ) : null}
      </div>
    </div>
  )

  const messages = turns.map((turn, index) => {
    const isLast = index === turns.length - 1
    if (turn.role === "user") {
      return (
        <Message key={turn.id} className="flex-col items-end pl-8 sm:pl-16">
          <MessageContent className="max-w-full rounded-3xl bg-muted px-5 py-2.5 text-body whitespace-pre-wrap sm:max-w-[85%]">
            {turn.content}
          </MessageContent>
        </Message>
      )
    }
    const thinking = turn.status === "streaming" && !turn.content && !turn.error
    const finished = turn.status !== "streaming"
    return (
      <Message key={turn.id} className="group flex-col items-start gap-1">
        {thinking ? (
          <MatrixOrb
            state="thinking"
            size={72}
            dots={9}
            labels={{ thinking: askAiStatus[turn.intent ?? "general"] }}
            className="gap-2 py-1"
          />
        ) : null}
        {turn.content ? (
          <MessageContent markdown className="w-full">
            {turn.content}
          </MessageContent>
        ) : null}
        {turn.error ? (
          <p className="text-caption break-words [overflow-wrap:anywhere] text-destructive">{turn.error}</p>
        ) : null}
        {finished ? (
          <MessageActions
            className={cn(
              "-ml-2 transition-opacity duration-150",
              isLast ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
            )}
          >
            {turn.content ? <CopyAction text={turn.content} /> : null}
            {isLast ? (
              <MessageAction tooltip="Ask again">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ask again"
                  onClick={retry}
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw aria-hidden="true" />
                </Button>
              </MessageAction>
            ) : null}
          </MessageActions>
        ) : null}
      </Message>
    )
  })

  // ---------- Blog-post version: the page scrolls, no persistence ----------
  if (embedded) {
    return (
      <div ref={embeddedRef} className="my-6 flex min-w-0 flex-col rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="sr-only">{askAi.label}</h2>
        <p className="text-caption text-muted-foreground">
          Ask about my work and experience. A suggested question appears when this section comes into view.
        </p>
        {hasConversation ? (
          <div aria-live="polite" className="flex min-w-0 flex-col gap-6 pt-6">
            {messages}
          </div>
        ) : null}
        <div className="mt-4">{composer}</div>
      </div>
    )
  }

  // ---------- Full page: empty state ----------
  if (!hasConversation) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-4 overflow-y-auto py-4">
          <div className="chat-orb w-[clamp(7rem,34vw,10rem)]">
            <MatrixOrb state="idle" size={160} />
          </div>
          <h1 className="max-w-[24rem] text-balance break-words text-center text-2xl leading-tight font-semibold text-foreground sm:text-[1.75rem]">
            {askAi.title}?
          </h1>
          <div className="w-full">{composer}</div>
          <AnimatePresence initial={!reducedMotion}>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.2, delay: reducedMotion ? 0 : 0.05 }}
              className="flex flex-wrap justify-center gap-2"
            >
              {askAi.suggestions.map((suggestion) => (
                <PromptSuggestion key={suggestion} onClick={() => ask(suggestion)}>
                  {suggestion}
                </PromptSuggestion>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ---------- Full page: conversation ----------
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <h1 className="sr-only">{askAi.label}</h1>
      <div className="flex shrink-0 justify-end pb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={newChat}
          className="gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
        >
          <SquarePen aria-hidden="true" />
          New chat
        </Button>
      </div>
      <ChatContainerRoot className="min-h-0 flex-1 overscroll-contain" aria-live="polite" aria-relevant="additions text">
        <ChatContainerContent className="gap-8 pt-2 pb-6">{messages}</ChatContainerContent>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <ScrollButton className="pointer-events-auto" />
        </div>
      </ChatContainerRoot>
      <div className="shrink-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{composer}</div>
    </div>
  )
}
