"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Briefcase, Check, Copy, FolderGit2, RotateCcw, Square, SquarePen } from "lucide-react"
import Link from "next/link"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/prompt-kit/message"
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"
import { TextShimmer } from "@/components/prompt-kit/text-shimmer"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { SiteNav } from "@/components/portfolio/site-nav"
import {
  AiApiError,
  CHAT_LIMITS,
  streamChat,
  stripCitationMarkers,
  type ChatIntent,
  type ChatTurn,
  type ChatWorkflow,
  type EvidenceSource,
} from "@/lib/ai-client"
import { askAi, askAiStatus } from "@/lib/portfolio-data"
import { cn } from "@/lib/utils"

// Layout and interaction patterns borrowed from open-source implementations:
// - prompt-kit conversation blocks (https://github.com/ibelick/prompt-kit, MIT):
//   message structure and text shimmer.
// - shadcn/ui Message Scroller: where the list scrolls, and when it stays still.
// - assistant-ui's Claude, ChatGPT and Grok examples
//   (https://www.assistant-ui.com/examples): flat bordered composer with the
//   compact input with send/stop controls, low-contrast user bubble, action bars,
//   a fade above the sticky composer, and a send button that morphs into stop.
// - Starter questions follow Nielsen Norman Group's guidance on prompt
//   suggestions: light, next to the input, and inserted for editing.

type Turn = {
  id: string
  role: "user" | "assistant"
  content: string
  status: "streaming" | "done" | "error" | "stopped" | "degraded"
  workflow?: ChatWorkflow
  sources?: EvidenceSource[]
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

const SUGGESTION_ICONS = [FolderGit2, Briefcase]

function replaceTurn(turns: Turn[], id: string, update: (turn: Turn) => Turn): Turn[] {
  return turns.map((turn) => (turn.id === id ? update(turn) : turn))
}

function CopyAction({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <MessageAction tooltip={copied ? "Copied" : label}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
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
  const [workflow, setWorkflow] = useState<ChatWorkflow>("chat")
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
        setTurns(saved.map((turn) => (turn.status === "streaming" ? { ...turn, status: "stopped" } : turn)))
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

  async function streamAnswer(history: Turn[], selectedWorkflow: ChatWorkflow = "chat") {
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
        messages: history
          .filter((turn) => turn.role === "user" || turn.status === "done")
          .map((turn): ChatTurn => ({ role: turn.role, content: turn.content })),
        signal: controller.signal,
        improvementLogging: true,
        conversationId: conversationIdRef.current ?? undefined,
        turnId: crypto.randomUUID(),
        workflow: selectedWorkflow,
      })) {
        if (event.type === "delta") {
          update((turn) => ({ ...turn, content: stripCitationMarkers(turn.content + event.text) }))
        } else if (event.type === "retrieval") {
          update((turn) => ({ ...turn, intent: event.intent }))
        } else if (event.type === "citations") {
          update((turn) => ({ ...turn, sources: event.sources }))
        } else if (event.type === "rate_limit") {
          setQuestionsRemaining(event.remaining)
        } else if (event.type === "error") {
          update((turn) => ({ ...turn, status: "error", error: event.detail }))
        } else if (event.type === "done") {
          update((turn) => (turn.status === "error" ? turn : { ...turn, status: event.finish_reason === "evidence_only" ? "degraded" : "done" }))
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        update((turn) => ({ ...turn, status: "stopped" }))
      } else {
        const detail =
          error instanceof AiApiError ? error.message : "Something went wrong while answering. Try again."
        update((turn) => ({ ...turn, status: "error", error: detail }))
      }
    } finally {
      setIsStreaming(false)
      update((turn) => (turn.status === "streaming" ? { ...turn, status: "error", error: "The response was interrupted. Please try again." } : turn))
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
    const userTurn: Turn = { id: newId("user"), role: "user", content: question, status: "done", workflow }
    void streamAnswer([...turns, userTurn], workflow)
    setWorkflow("chat")
  }

  // Ask the last question again, replacing the last answer.
  function retry() {
    if (isStreaming) return
    const lastUser = turns.findLastIndex((turn) => turn.role === "user")
    if (lastUser === -1) return
    void streamAnswer(turns.slice(0, lastUser + 1), turns[lastUser].workflow)
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
    setWorkflow("chat")
    setShowConsentError(false)
    inputRef.current?.focus()
  }

  const composer = (
    <div>
      {workflow !== "chat" ? (
        <div className="mb-2 flex items-center justify-between gap-2 text-caption text-muted-foreground">
          <span>{askAi.workflows[workflow].label}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setWorkflow("chat")}>Cancel</Button>
        </div>
      ) : null}
      <form
        data-empty={!draft.trim()}
        data-running={isStreaming}
        className="glass-surface group/composer flex w-full min-w-0 items-end gap-2 rounded-2xl border border-input p-2.5 transition-[border-color,box-shadow,background-color] hover:border-foreground/25 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20"
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
          placeholder={workflow === "chat" ? askAi.placeholder : askAi.workflows[workflow].placeholder}
          autoComplete="off"
          enterKeyHint="send"
          rows={1}
          maxLength={CHAT_LIMITS.messageChars}
          aria-describedby="ask-ai-input-hint"
          className="chat-input min-h-8 max-h-48 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-0.5 text-base leading-7 text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground"
        />
        <span id="ask-ai-input-hint" className="sr-only">
          Press Enter to send and Shift and Enter for a new line. Press Escape to stop an answer.
        </span>
        <div className="flex shrink-0 items-center justify-end gap-2">
          {/* Send and stop share one slot and swap with a scale animation. */}
          <div className="relative size-8 shrink-0">
            <Button
              type="submit"
              size="icon"
              aria-label="Send question"
              disabled={!draft.trim() || isStreaming}
              tabIndex={isStreaming ? -1 : 0}
              className="absolute inset-0 size-8 rounded-full transition-[transform,opacity] duration-150 group-data-[running=true]/composer:scale-0 group-data-[running=true]/composer:opacity-0 disabled:opacity-40"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="submit"
              size="icon"
              aria-label="Stop answering"
              tabIndex={isStreaming ? 0 : -1}
              aria-hidden={!isStreaming}
              className="absolute inset-0 size-8 rounded-full transition-[transform,opacity] duration-150 group-data-[running=false]/composer:pointer-events-none group-data-[running=false]/composer:scale-0 group-data-[running=false]/composer:opacity-0"
            >
              <Square className="size-3 fill-current" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-2 px-2 text-center text-label leading-snug text-muted-foreground">
        {consented ? (
          questionsRemaining !== null && questionsRemaining <= 5 ? (
            <p aria-live="polite">
              {questionsRemaining} question{questionsRemaining === 1 ? "" : "s"} left today
            </p>
          ) : null
        ) : (
          <label className="inline-flex cursor-pointer items-start gap-2 text-left text-caption">
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
          <p id="conversation-consent-error" role="alert" className="mt-1.5 text-caption text-destructive">
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
        <Message key={turn.id} className="group flex-col items-end gap-1 pl-8 sm:pl-16">
          <MessageContent className="min-w-0 max-w-full rounded-2xl bg-muted px-4 py-2.5 text-body whitespace-pre-wrap sm:max-w-[80%]">
            {turn.content}
          </MessageContent>
          <MessageActions className="-mr-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <CopyAction text={turn.content} label="Copy question" />
          </MessageActions>
        </Message>
      )
    }
    const thinking = turn.status === "streaming" && !turn.content && !turn.error
    const finished = turn.status !== "streaming"
    return (
      <Message key={turn.id} className="group flex-col items-start gap-1">
        {thinking ? (
          <p role="status" className="py-1 text-body">
            <TextShimmer>{askAiStatus[turn.intent ?? "general"]}</TextShimmer>
          </p>
        ) : null}
        {turn.content ? (
          <MessageContent markdown streaming={turn.status === "streaming"} className="min-w-0 w-full">
            {turn.content}
          </MessageContent>
        ) : null}
        {turn.error ? (
          <p role="alert" className="text-caption break-words [overflow-wrap:anywhere] text-destructive">{turn.error}</p>
        ) : null}
        {turn.status === "stopped" ? <p className="text-caption text-muted-foreground">Response stopped</p> : null}
        {finished && turn.content && turn.sources?.length ? (
          <details className="w-full text-caption text-muted-foreground">
            <summary className="cursor-pointer py-2">Published evidence ({turn.sources.length})</summary>
            <ul className="space-y-2 pb-2 pl-4">
              {turn.sources.map((source) => (
                <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>
              ))}
            </ul>
          </details>
        ) : null}
        {finished ? (
          <MessageActions
            className={cn(
              "-ml-2 transition-opacity duration-150",
              isLast ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
            )}
          >
            {turn.content ? <CopyAction text={turn.content} label="Copy answer" /> : null}
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

  // Keep one composer mounted between the welcome screen and conversation.
  // Replacing it on the first send dismisses the mobile keyboard and loses focus.
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <SiteNav />
      <h1 className="sr-only">{askAi.label}</h1>
      {hasConversation ? (
        <div className="chat-column flex shrink-0 justify-end pb-2">
          <Button
            variant="ghost"
            onClick={newChat}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <SquarePen aria-hidden="true" />
            New chat
          </Button>
        </div>
      ) : null}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", !hasConversation && "justify-center-safe")}>
        {hasConversation ? (
          <MessageScrollerProvider defaultScrollPosition="last-anchor" scrollPreviousItemPeek={40} scrollMargin={8}>
            <MessageScroller>
              <MessageScrollerViewport aria-label="Conversation" className="chat-viewport">
                <MessageScrollerContent aria-busy={isStreaming} className="chat-column gap-6 pt-2 pb-8 sm:gap-8">
                  {turns.map((turn, index) => (
                    <MessageScrollerItem
                      key={turn.id}
                      messageId={turn.id}
                      scrollAnchor={turn.role === "user"}
                      // The new question fades in where it will stay.
                      className={isStreaming && index === turns.length - 2 ? "animate-in fade-in duration-300 motion-reduce:animate-none" : undefined}
                    >
                      {messages[index]}
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        ) : null}
        <div hidden={hasConversation} className="chat-welcome chat-column min-h-0 overflow-y-auto py-6">
          <h2 className="text-name text-balance break-words text-center font-normal text-foreground">
            {workflow === "chat" ? `${askAi.title}?` : askAi.workflows[workflow].title}
          </h2>
        </div>
        <div className="chat-column relative shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-background before:to-transparent">
          {composer}
        </div>
        <motion.ul
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          aria-label="Suggested questions"
          className={cn("chat-suggestions chat-column grid min-h-0 shrink overflow-y-auto pb-4 sm:grid-cols-2", hasConversation && "hidden")}
        >
          {Object.entries(askAi.workflows).map(([key, option]) => (
            <li key={key} className="min-w-0">
              <PromptSuggestion onClick={() => {
                setWorkflow(key as ChatWorkflow)
                inputRef.current?.focus()
              }}>
                <Briefcase aria-hidden="true" />
                {option.label}
              </PromptSuggestion>
            </li>
          ))}
          {askAi.suggestions.map((suggestion, index) => {
            const Icon = SUGGESTION_ICONS[index % SUGGESTION_ICONS.length]
            return (
              <li key={suggestion} className="min-w-0">
                <PromptSuggestion
                  className="h-full"
                  onClick={() => {
                    setWorkflow("chat")
                    setDraft(suggestion)
                    inputRef.current?.focus()
                  }}
                >
                  <Icon aria-hidden="true" />
                  {suggestion}
                </PromptSuggestion>
              </li>
            )
          })}
        </motion.ul>
      </div>
    </div>
  )
}
