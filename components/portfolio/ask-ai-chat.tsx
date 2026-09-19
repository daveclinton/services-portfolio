"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useChat } from "@ai-sdk/react"
import { createChat } from "@shadcn/helpers/ai-sdk"
import { ArrowLeft, SendHorizonal, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TimelineEntry } from "@/lib/portfolio-data"

const QUESTIONS = [
  "What did he work on in this role?",
  "What skills did this role involve?",
  "How is this relevant to my project?",
] as const

function answersFor(entry: TimelineEntry): string[] {
  return [
    `In this role (${entry.date}): ${entry.description}`,
    `What's listed for this role is: ${entry.description} For specifics such as stack or team size, reach out via the Contact button and he'll fill in the details.`,
    `If your project overlaps with this (${entry.description}), there's likely direct relevance — send the details via Contact and he'll tell you straight.`,
  ]
}

export function AskAiChat({ entry }: { entry: TimelineEntry }) {
  const [draft, setDraft] = useState("")

  const script = useMemo(() => {
    const answers = answersFor(entry)
    const chat = createChat().user(QUESTIONS[0]).assistant(answers[0])
    return chat
      .user(QUESTIONS[1])
      .assistant(({ writer }) => {
        writer.reasoning("Recalling what this role involved.")
        writer.text(answers[1])
      })
      .user(QUESTIONS[2])
      .assistant(answers[2])
  }, [entry])

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

  function ask(text: string) {
    const question = text.trim()
    if (!question || isBusy) return
    void sendMessage({ text: question })
    setDraft("")
  }

  return (
    <div className="flex flex-col">
      <Link
        href="/"
        className="mt-6 inline-flex w-fit items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to portfolio
      </Link>

      <header className="mt-4 rounded-lg border border-border bg-card p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-label font-medium tracking-widest text-muted-foreground uppercase">
          <Sparkles className="size-3.5 text-accent-green" aria-hidden="true" />
          Ask AI about this role
        </p>
        <p className="mt-2 text-caption font-medium text-muted-foreground tabular-nums">
          {entry.date}
        </p>
        <p className="mt-1 max-w-[52ch] text-body text-foreground/80">
          {entry.description}
        </p>
      </header>

      <div aria-live="polite" className="mt-6 flex flex-1 flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex justify-start">
            <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5 text-body text-foreground/90">
              Ask me anything about this role — or tap a suggestion below.
            </p>
          </div>
        ) : null}
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

      <div className="mt-4 flex flex-wrap gap-2">
        {QUESTIONS.map((q) => (
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

      <form
        className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 focus-within:border-ring"
        onSubmit={(e) => {
          e.preventDefault()
          ask(draft)
        }}
      >
        <label htmlFor="ask-ai-input" className="sr-only">
          Ask about this role
        </label>
        <input
          id="ask-ai-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about this role…"
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
    </div>
  )
}
