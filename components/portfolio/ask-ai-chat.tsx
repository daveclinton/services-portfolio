"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { createChat } from "@shadcn/helpers/ai-sdk"
import { SendHorizonal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  askAi,
  backgroundItems,
  formatRoleDates,
  profile,
} from "@/lib/portfolio-data"

type AskAiScript = {
  placeholder: string
  inputLabel: string
  reasoning: string
  questions: readonly [string, string, string]
  answers: readonly [string, string, string]
}

/** The scripted demo behind the general "ask me anything" chat. */
function buildScript(): AskAiScript {
  const [current, ...earlier] = backgroundItems
  const history = [current, ...earlier]
    .map((item) => `${formatRoleDates(item)}: ${item.description}.`)
    .join(" ")

  return {
    placeholder: "Ask about me…",
    inputLabel: "Ask about me",
    reasoning: "Reading back through the background timeline.",
    questions: [
      "What does he work on?",
      "What's his background?",
      "What is he working on now?",
    ],
    answers: [
      `${profile.name} is a ${profile.role}, building products and internal tools across mobile, web, and backend. Right now: ${current.description}.`,
      `His background, most recent first — ${history}`,
      `${current.description}. For specifics such as stack, team, or scope, hit the Contact button and he'll fill you in.`,
    ],
  }
}

export function AskAiChat() {
  const [draft, setDraft] = useState("")

  const subject = useMemo(() => buildScript(), [])

  const script = useMemo(() => {
    const [question1, question2, question3] = subject.questions
    const [answer1, answer2, answer3] = subject.answers

    const chat = createChat().user(question1).assistant(answer1)
    return chat
      .user(question2)
      .assistant(({ writer }) => {
        writer.reasoning(subject.reasoning)
        writer.text(answer2)
      })
      .user(question3)
      .assistant(answer3)
  }, [subject])

  const transport = useMemo(
    () =>
      script.transport({
        fallback:
          "This demo only covers the suggested questions above. Connect a model to answer anything else.",
      }),
    [script]
  )

  const initialMessages = useMemo(() => script.get(0), [script])

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport,
  })
  const isBusy = status === "submitted" || status === "streaming"
  const hasConversation = messages.length > 0

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
  }, [messages, status, hasConversation])

  function ask(text: string) {
    const question = text.trim()
    if (!question || isBusy) return
    void sendMessage({ text: question })
    setDraft("")
  }

  const suggestions = (
    <div className="flex flex-wrap gap-2">
      {subject.questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => ask(q)}
          disabled={isBusy}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-caption text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  )

  const composer = (
    <form
      className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 focus-within:border-ring"
      onSubmit={(e) => {
        e.preventDefault()
        ask(draft)
      }}
    >
      <label htmlFor="ask-ai-input" className="sr-only">
        {subject.inputLabel}
      </label>
      <input
        id="ask-ai-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={subject.placeholder}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send question"
        disabled={!draft.trim() || isBusy}
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
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-body whitespace-pre-wrap text-primary-foreground">
                {msg.parts
                  .filter((part) => part.type === "text")
                  .map((part, i) => (
                    <span key={`${msg.id}-part-${i}`}>{part.text}</span>
                  ))}
              </p>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5 text-body whitespace-pre-wrap text-foreground/90">
                {msg.parts
                  .filter((part) => part.type === "text")
                  .map((part, i) => (
                    <span key={`${msg.id}-part-${i}`}>{part.text}</span>
                  ))}
              </p>
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
