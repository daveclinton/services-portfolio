"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { buildProjectScopeRequest, PROJECT_SCOPE_ANSWER_LIMIT, projectScopeQuestions } from "@/lib/project-scope"

// Typeform's one-question flow, keyboard advance, progress, and review pattern,
// adapted to the existing chat controls and theme. No answers leave this form
// until the visitor reviews them and generates the brief.
export function ProjectScopeForm({ onGenerate, onCancel, consent }: {
  onGenerate: (request: string) => void
  onCancel: () => void
  consent: ReactNode
}) {
  const [answers, setAnswers] = useState<string[]>(() => projectScopeQuestions.map(() => ""))
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const reviewRef = useRef<HTMLHeadingElement>(null)
  const reviewing = step === projectScopeQuestions.length
  const question = projectScopeQuestions[step]

  useEffect(() => {
    if (reviewing) reviewRef.current?.focus()
    else inputRef.current?.focus()
  }, [step, reviewing])

  function advance() {
    if (!reviewing) {
      if (question.required && !answers[step].trim()) return
      setStep(step + 1)
      return
    }
    try {
      onGenerate(buildProjectScopeRequest(answers))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Please review your answers.")
    }
  }

  return (
    <form className="flex min-w-0 flex-col gap-6" onSubmit={(event) => {
      event.preventDefault()
      advance()
    }}>
      <div className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
        <p aria-live="polite">{reviewing ? "Review your project" : `Question ${step + 1} of ${projectScopeQuestions.length}`}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
      <progress className="w-full accent-primary" max={projectScopeQuestions.length} value={step} aria-label="Project discovery progress" />
      {reviewing ? (
        <>
          <h2 ref={reviewRef} tabIndex={-1} className="text-body font-medium">Review before generating your brief</h2>
          <p className="text-caption text-muted-foreground">Check your answers. The AI will suggest a first release and questions to discuss with David. Scope, pricing, availability, and delivery dates need his review.</p>
          <dl className="flex min-w-0 flex-col gap-6">
            {projectScopeQuestions.map((item, index) => (
              <div key={item.label} className="min-w-0">
                <dt className="flex items-start justify-between gap-2 text-body font-medium">
                  {item.label}
                  <Button type="button" variant="ghost" size="sm" aria-label={`Edit: ${item.label}`} onClick={() => setStep(index)}>Edit</Button>
                </dt>
                <dd className="text-body whitespace-pre-wrap break-words text-muted-foreground">{answers[index].trim() || "Not provided"}</dd>
              </div>
            ))}
          </dl>
          {consent}
        </>
      ) : (
        <>
          <label htmlFor="project-scope-answer" className="text-body font-medium">{question.label}</label>
          <p id="project-scope-hint" className="text-caption text-muted-foreground">{question.hint} {!question.required ? "You can leave this blank for now." : null}</p>
          <div className="glass-surface rounded-2xl border border-input p-2.5 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20">
            <textarea
              ref={inputRef}
              id="project-scope-answer"
              value={answers[step]}
              onChange={(event) => setAnswers((current) => current.map((answer, index) => index === step ? event.target.value : answer))}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }}
              placeholder={question.placeholder}
              required={question.required}
              maxLength={PROJECT_SCOPE_ANSWER_LIMIT}
              rows={4}
              enterKeyHint="next"
              aria-describedby="project-scope-hint project-scope-keyboard"
              className="chat-input min-h-8 max-h-48 w-full min-w-0 resize-none overflow-y-auto bg-transparent px-0.5 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p id="project-scope-keyboard" className="text-caption text-muted-foreground">Enter to continue. Shift + Enter for a new line. Your answers are sent only when you generate the brief.</p>
        </>
      )}
      {error ? <p role="alert" className="text-caption text-destructive">{error}</p> : null}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        <Button type="submit" disabled={!reviewing && question.required && !answers[step].trim()}>
          {reviewing ? "Generate project brief" : step === projectScopeQuestions.length - 1 ? "Review answers" : "Next"}
        </Button>
      </div>
    </form>
  )
}
