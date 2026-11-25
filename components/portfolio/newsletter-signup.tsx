"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { Check, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { newsletter } from "@/lib/portfolio-data"
import { newsletterAvailable, subscribeToNewsletter } from "@/lib/newsletter"

// Cassidy Williams' personal newsletter invitation, adapted to the portfolio:
// one email field, a sample link, and confirmation before joining the list.
// The question/review sequence follows the existing Typeform-style form guidance.
export function NewsletterSignup({ showHeading = true }: { showHeading?: boolean }) {
  const id = useId()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"checking" | "ready" | "review" | "unavailable" | "sending" | "pending">("checking")
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(false)
  const pendingRef = useRef<HTMLHeadingElement>(null)
  const reviewRef = useRef<HTMLHeadingElement>(null)
  const availabilityRequest = useRef(0)
  const focusEmail = useRef(false)

  const checkAvailability = useCallback(() => {
    const request = ++availabilityRequest.current
    return newsletterAvailable().then((available) => {
      if (mounted.current && request === availabilityRequest.current) setState(available ? "ready" : "unavailable")
    }, () => {
      if (mounted.current && request === availabilityRequest.current) setState("unavailable")
    })
  }, [])

  useEffect(() => {
    mounted.current = true
    void checkAvailability()
    return () => { mounted.current = false }
  }, [checkAvailability])

  useEffect(() => {
    if (state === "pending") pendingRef.current?.focus()
    else if (state === "review") reviewRef.current?.focus()
    else if (state === "ready" && focusEmail.current) { inputRef.current?.focus(); focusEmail.current = false }
  }, [state])

  if (state === "pending") return (
    <section aria-live="polite" className="flex min-w-0 flex-col gap-4 animate-in fade-in duration-150 motion-reduce:animate-none">
      <Mail aria-hidden="true" className="size-6 text-primary" />
      <h2 ref={pendingRef} tabIndex={-1} className="text-title">One last click.</h2>
      <p className="text-body">Check your inbox to confirm your email. You’ll join the list after confirming.</p>
      <details className="text-caption text-muted-foreground"><summary className="cursor-pointer py-2">No email yet?</summary><p>Already confirmed? You’re all set. Otherwise, check spam or try again later.</p></details>
      <Button type="button" variant="ghost" className="self-start" onClick={() => { focusEmail.current = true; setState("ready"); setError("") }}>Use a different email</Button>
    </section>
  )

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Follow along by email">
      {showHeading ? <h2 className="text-title">{newsletter.title}</h2> : null}
      <p className="text-body">{newsletter.description}</p>
      <p className="text-caption text-muted-foreground" role="status">{state === "review" || state === "sending" ? "2 of 2 · Review" : "1 of 2 · Your email"}</p>
      <form className="flex min-w-0 flex-col gap-4" aria-busy={state === "sending" || state === "checking"} onSubmit={async (event) => {
        event.preventDefault()
        if (state === "ready") { setState("review"); return }
        if (state !== "review") return
        const website = new FormData(event.currentTarget).get("website")
        setError("")
        setState("sending")
        try {
          await subscribeToNewsletter(email, typeof website === "string" ? website : "")
          if (mounted.current) { setEmail(""); setState("pending") }
        } catch (failure) {
          if (mounted.current) {
            setState("review")
            setError(failure instanceof Error ? failure.message : "Please try again shortly.")
          }
        }
      }}>
        <div hidden={state === "review" || state === "sending"}>
          <div className="flex flex-col gap-4">
            <label htmlFor={`${id}-email`} className="text-body font-medium">Email address</label>
            <div className="glass-surface rounded-2xl border border-input p-2.5 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20">
              <input ref={inputRef} id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={state !== "ready"} aria-describedby={`${id}-consent${error ? ` ${id}-error` : ""}`} aria-invalid={error ? true : undefined} className="chat-input min-h-8 w-full min-w-0 bg-transparent px-0.5 text-base leading-7 text-foreground outline-none" />
            </div>
          </div>
        </div>
        {state === "review" || state === "sending" ? <div className="flex min-w-0 flex-col gap-2"><h2 ref={reviewRef} tabIndex={-1} className="text-title">Look right?</h2><p className="text-body break-words">We’ll send a confirmation to {email.trim()}.</p></div> : null}
        <div hidden aria-hidden="true"><label>Leave this empty<input name="website" type="text" autoComplete="off" tabIndex={-1} /></label></div>
        <p id={`${id}-consent`} className="text-caption text-muted-foreground">{newsletter.consent} <Link href="/privacy">Privacy</Link>.</p>
        {error ? <p id={`${id}-error`} role="alert" className="text-caption text-destructive">{error}</p> : null}
        {state === "unavailable" ? (
          <div className="flex flex-col gap-2 text-caption text-muted-foreground" role="status">
            <p>Email signup is unavailable right now. Please try again later.</p>
            <Button type="button" variant="ghost" className="self-start" onClick={() => { setState("checking"); void checkAvailability() }}>Try again</Button>
          </div>
        ) : <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={(state !== "ready" && state !== "review") || !email.trim()} className="self-start">{state === "sending" ? "Sending…" : state === "checking" ? "One moment…" : state === "review" ? "Keep me posted" : "Next"}</Button>
          {state === "review" ? <Button type="button" variant="ghost" onClick={() => { focusEmail.current = true; setState("ready"); setError("") }}>Back</Button> : null}
        </div>}
      </form>
      <p className="text-caption"><Link href="/blog">Read a recent article</Link> · <a href="/feed.xml">RSS feed</a></p>
    </section>
  )
}

export function NewsletterConfirmation() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150 motion-reduce:animate-none">
      <Check aria-hidden="true" className="size-6 text-primary" />
      <h1 className="text-name">You’re in.</h1>
      <p className="text-body">Glad you’re here. I’ll send a note when I have something worth sharing.</p>
      <p className="text-body"><Link href="/blog">Back to reading</Link></p>
    </div>
  )
}
