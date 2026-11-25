"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Check, Copy, RotateCcw, Square, SquarePen, X } from "lucide-react"
import Link from "next/link"
import { useInView } from "motion/react"
import { Button } from "@/components/ui/button"
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/prompt-kit/message"
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
import { ProjectScopeForm } from "@/components/portfolio/project-scope-form"
import { AiTaskSuggestions } from "@/components/portfolio/ai-task-suggestions"
import { AiAnswerView } from "@/components/portfolio/ai-answer-view"
import {
  AiApiError,
  CHAT_LIMITS,
  streamChat,
  stripCitationMarkers,
  parseAnswerView,
  parseViewState,
  viewInteractionContext,
  viewTranscript,
  answerConversationText,
  type AnswerView,
  type ChatPhase,
  type ChatIntent,
  type ChatTurn,
  type ChatWorkflow,
  type EvidenceSource,
  type ViewState,
} from "@/lib/ai-client"
import { aiTaskGroups, askAi, askAiStatus } from "@/lib/portfolio-data"
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
  phase?: ChatPhase
  view?: AnswerView
  viewState?: ViewState
  contextActive?: boolean
  interactionContext?: string
}

const CONSENT_VERSION = "2026-09-22"
const CONSENT_STORAGE_KEY = "ask-ai:conversation-storage-consent"
const CONVERSATION_SESSION_KEY = "ask-ai:conversation-session-id"
const TURNS_STORAGE_KEY = "ask-ai:turns"

function newId(role: Turn["role"]) {
  return `${role}-${crypto.randomUUID()}`
}

const phaseLabels: Record<ChatPhase, string> = {
  planning: "Understanding your question…", retrieving: "Finding supporting material…",
  writing: "Writing the answer…", formatting: "Preparing the interactive view…",
}

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
  const [showTasks, setShowTasks] = useState(false)
  const [showScope, setShowScope] = useState(false)
  const [scopeSeed, setScopeSeed] = useState("")
  const [suggestionGroup, setSuggestionGroup] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const consentRef = useRef<HTMLInputElement | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const focusComposerRef = useRef(false)
  const embeddedRef = useRef<HTMLDivElement>(null)
  const inView = useInView(embeddedRef, { once: true, amount: 0.3 })
  const hasSuggested = useRef(false)
  const restored = useRef(false)

  const hasConversation = turns.length > 0
  const taskGroup = aiTaskGroups.find((group) => group.id === suggestionGroup)
  const modeLabel = taskGroup?.label ?? (workflow === "project_scope" ? "Plan a project" : workflow === "role_fit" || workflow === "interview" ? "Hiring" : null)
  const activeContext = turns.findLast((turn) => turn.contextActive && turn.status === "done" && turn.view && (turn.view.kind === "scope" || turn.viewState?.selectedId))

  useEffect(() => {
    if (focusComposerRef.current && inputRef.current) {
      inputRef.current.focus()
      focusComposerRef.current = false
    }
  }, [draft, workflow, showTasks, showScope, suggestionGroup])

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
        setTurns(saved.map((turn) => {
          const view = parseAnswerView(turn.view)
          return { ...turn, view: view ?? undefined, viewState: parseViewState(view, turn.viewState), ...(turn.status === "streaming" ? { status: "stopped" as const } : {}) }
        }))
        const savedWorkflow = saved.findLast((turn) => turn.role === "user")?.workflow
        if (savedWorkflow && ["project_scope", "role_fit", "interview"].includes(savedWorkflow)) {
          setWorkflow(savedWorkflow)
        }
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
    const assistantTurn: Turn = { id: newId("assistant"), role: "assistant", content: "", status: "streaming", workflow: selectedWorkflow }
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
          .map((turn): ChatTurn => ({ role: turn.role, content: turn.role === "assistant" ? answerConversationText(turn.content, turn.view) : turn.content })),
        signal: controller.signal,
        improvementLogging: true,
        conversationId: conversationIdRef.current ?? undefined,
        turnId: crypto.randomUUID(),
        workflow: selectedWorkflow,
        interactive: true,
        interactionContext: history.at(-1)?.interactionContext ?? "",
      })) {
        if (abortRef.current !== controller || controller.signal.aborted) break
        if (event.type === "status") {
          update((turn) => ({ ...turn, phase: event.phase }))
        } else if (event.type === "view") {
          setTurns((previous) => previous.map((turn) => turn.id === assistantTurn.id
            ? { ...turn, view: event.view, contextActive: event.view.kind === "scope" }
            : event.view.kind === "scope" ? { ...turn, contextActive: false } : turn))
        } else if (event.type === "delta") {
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
      update((turn) => (turn.status === "streaming" ? { ...turn, status: "error", error: "The response was interrupted. Please try again." } : turn))
      if (abortRef.current === controller) {
        setIsStreaming(false)
        abortRef.current = null
      }
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
    setShowScope(false)
    setShowTasks(false)
    const selectedWorkflow = workflow === "chat" && suggestionGroup === "planning" ? "project_scope" : workflow
    setWorkflow(selectedWorkflow)
    const userTurn: Turn = { id: newId("user"), role: "user", content: question, status: "done", workflow: selectedWorkflow, interactionContext: viewInteractionContext(activeContext?.view, activeContext?.viewState) }
    void streamAnswer([...turns, userTurn], selectedWorkflow)
  }

  // Ask the last question again, replacing the last answer.
  function retry() {
    if (isStreaming) return
    if (!consented) {
      setShowConsentError(true)
      consentRef.current?.focus()
      return
    }
    const lastUser = turns.findLastIndex((turn) => turn.role === "user")
    if (lastUser === -1) return
    void streamAnswer(turns.slice(0, lastUser + 1), turns[lastUser].workflow)
  }

  function stop() {
    abortRef.current?.abort()
  }

  function newChat() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    const conversationId = crypto.randomUUID()
    sessionStorage.setItem(CONVERSATION_SESSION_KEY, conversationId)
    sessionStorage.removeItem(TURNS_STORAGE_KEY)
    conversationIdRef.current = conversationId
    setTurns([])
    setDraft("")
    setWorkflow("chat")
    setSuggestionGroup(null)
    setShowScope(false)
    setShowTasks(false)
    setShowConsentError(false)
    inputRef.current?.focus()
  }

  function chooseTask(selectedWorkflow: ChatWorkflow, prompt: string) {
    setTurns((previous) => previous.map((turn) => ({ ...turn, contextActive: false })))
    setWorkflow(selectedWorkflow)
    setShowTasks(false)
    setShowConsentError(false)
    if (selectedWorkflow === "project_scope") {
      setScopeSeed(prompt)
      setShowScope(true)
    } else {
      setDraft(prompt)
      focusComposerRef.current = true
    }
  }

  function changeSuggestionGroup(groupId: string | null) {
    setSuggestionGroup(groupId)
    setWorkflow("chat")
    focusComposerRef.current = true
  }

  function prepareFollowUp(prompt: string, turn: Turn) {
    setDraft(prompt)
    setWorkflow(turn.workflow ?? "chat")
    if (viewInteractionContext(turn.view, turn.viewState)) setTurns((previous) => previous.map((item) => ({ ...item, contextActive: item.id === turn.id })))
    focusComposerRef.current = true
  }

  const consentNotice = (
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
  )

  const composer = (
    <div>
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
        {modeLabel ? (
          <Button type="button" variant="ghost" size="sm" className="shrink-0 self-center text-primary" disabled={isStreaming} aria-label={`Clear ${modeLabel} mode`} onClick={() => changeSuggestionGroup(null)}>
            {modeLabel}<X aria-hidden="true" />
          </Button>
        ) : null}
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
          placeholder={workflow === "chat" ? taskGroup?.placeholder ?? askAi.placeholder : askAi.workflows[workflow].placeholder}
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

      {activeContext ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-caption text-muted-foreground">
          <span>{activeContext.view?.kind === "scope" ? "This project brief is included with the next question." : "Your selected answer context is included with the next question."}</span>
          <Button type="button" variant="ghost" size="sm" disabled={isStreaming} onClick={() => setTurns((previous) => previous.map((turn) => ({ ...turn, contextActive: false })))}>Clear context</Button>
        </div>
      ) : null}

      {consentNotice}
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
          {turn.interactionContext ? <p className="text-caption text-muted-foreground">Included your selected item or project brief.</p> : null}
          <MessageActions className="-mr-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <CopyAction text={turn.content} label="Copy question" />
          </MessageActions>
        </Message>
      )
    }
    const thinking = turn.status === "streaming" && !turn.error
    const finished = turn.status !== "streaming"
    return (
      <Message key={turn.id} className="group flex-col items-start gap-1">
        {thinking ? (
          <p role="status" className="py-1 text-body">
            <TextShimmer>{turn.phase ? phaseLabels[turn.phase] : turn.intent ? askAiStatus[turn.intent] : "Connecting to the assistant…"}</TextShimmer>
          </p>
        ) : null}
        {turn.content ? (
          <MessageContent markdown streaming={turn.status === "streaming"} className="min-w-0 w-full">
            {turn.content}
          </MessageContent>
        ) : null}
        {turn.workflow === "project_scope" && turn.status === "done" ? (
          <p className="text-caption text-muted-foreground">Proposed scope for discussion. David must confirm scope, pricing, availability, and delivery dates.</p>
        ) : null}
        {turn.view && turn.status === "done" ? (
          <AiAnswerView view={turn.view} state={turn.viewState} disabled={isStreaming} onChange={(viewState) => setTurns((previous) => previous.map((item) => item.id === turn.id ? { ...item, viewState, contextActive: true } : { ...item, contextActive: false }))} />
        ) : null}
        {turn.error ? (
          <p role="alert" className="text-caption break-words [overflow-wrap:anywhere] text-destructive">{turn.error}</p>
        ) : null}
        {turn.status === "stopped" ? <p className="text-caption text-muted-foreground">Response stopped</p> : null}
        {finished && turn.content && turn.sources?.length && (!turn.view || turn.view.kind === "text" || turn.status !== "done") ? (
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
            {turn.content ? <CopyAction text={turn.view?.kind === "scope" ? viewTranscript(turn.view, turn.viewState) : turn.content} label="Copy answer" /> : null}
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
        {isLast && turn.status === "done" && !isStreaming ? (
          <div className="flex w-full flex-wrap gap-2" aria-label="Suggested next steps">
            {(turn.view?.follow_ups.length ? turn.view.follow_ups : [
              { label: "Explore related projects", prompt: "Which of David's verified projects relate to this answer?" },
              { label: "Review the evidence", prompt: "What published evidence supports this answer, and what remains unverified?" },
            ]).map((suggestion) => <Button key={suggestion.prompt} type="button" variant="outline" className="h-auto whitespace-normal text-left" onClick={() => prepareFollowUp(suggestion.prompt, turn)}>{suggestion.label}</Button>)}
          </div>
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

  if (showScope) {
    return (
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <SiteNav />
        <h1 className="sr-only">Scope a project with David</h1>
        <div className="chat-column min-h-0 flex-1 overflow-y-auto py-6">
          <ProjectScopeForm
            onGenerate={ask}
            onCancel={() => { setShowScope(false); setWorkflow("chat"); setDraft(""); setShowConsentError(false); focusComposerRef.current = true }}
            consent={consentNotice}
            initialProblem={scopeSeed}
          />
        </div>
      </div>
    )
  }

  if (showTasks && hasConversation) {
    return (
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <SiteNav />
        <div className="chat-column min-h-0 flex-1 overflow-y-auto py-6">
          <h1 className="text-title">What would you like to do next?</h1>
          <Button type="button" variant="ghost" className="my-4" onClick={() => { setShowTasks(false); focusComposerRef.current = true }}>Back to conversation</Button>
          <AiTaskSuggestions groupId={suggestionGroup} onGroupChange={changeSuggestionGroup} onChoose={chooseTask} />
        </div>
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
          <Button type="button" variant="ghost" disabled={isStreaming} onClick={() => setShowTasks(true)}>Tasks</Button>
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
        <div hidden={hasConversation} className={cn("chat-welcome chat-column min-h-0 flex-1 flex-col justify-end overflow-y-auto pb-6", hasConversation ? "hidden" : "flex")}>
          <h2 className="text-name text-balance break-words text-center font-normal text-foreground">
            {workflow === "chat" ? `${askAi.title}?` : askAi.workflows[workflow].title}
          </h2>
        </div>
        <div className="chat-column relative shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-background before:to-transparent">
          {composer}
        </div>
        {!hasConversation ? (
          <div className="chat-column min-h-0 flex-1 overflow-y-auto pt-4 pb-4">
            {workflow === "chat" && !draft.trim() ? <AiTaskSuggestions groupId={suggestionGroup} onGroupChange={changeSuggestionGroup} onChoose={chooseTask} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
