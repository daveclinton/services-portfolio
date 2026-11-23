"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CHAT_LIMITS, PENDING_QUESTION_KEY } from "@/lib/ai-client"
import { askAi } from "@/lib/portfolio-data"

// Grok's home: the name sits above one pill composer. Structure and the round
// send control follow assistant-ui's Grok example, in this site's tokens
// (https://www.assistant-ui.com/examples/grok). The question is handed to the
// existing Ask AI page through sessionStorage, so it never appears in a URL.
export function HomeComposer() {
  const router = useRouter()
  const [question, setQuestion] = useState("")

  function submit(text: string) {
    const value = text.trim()
    if (!value) return
    try {
      sessionStorage.setItem(PENDING_QUESTION_KEY, value)
    } catch {}
    router.push(askAi.href)
  }

  return (
    <div className="w-full">
      <form
        action={askAi.href}
        className="home-composer"
        onSubmit={(event) => {
          event.preventDefault()
          submit(question)
        }}
      >
        <label htmlFor="home-question" className="sr-only">{askAi.inputLabel}</label>
        <textarea
          id="home-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
            event.preventDefault()
            submit(question)
          }}
          rows={1}
          maxLength={CHAT_LIMITS.messageChars}
          placeholder={askAi.placeholder}
          autoComplete="off"
          enterKeyHint="send"
          className="chat-input my-1 max-h-40 min-h-7 min-w-0 flex-1 resize-none bg-transparent text-base leading-7 outline-none [field-sizing:content] placeholder:text-muted-foreground"
        />
        <Button type="submit" size="icon-lg" aria-label="Send question" disabled={!question.trim()} className="rounded-full">
          <ArrowUp className="size-4" aria-hidden="true" />
        </Button>
      </form>
      <ul aria-label="Suggested questions" className="mt-3 flex flex-wrap gap-2">
        {askAi.suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button type="button" className="home-suggestion" onClick={() => submit(suggestion)}>
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
