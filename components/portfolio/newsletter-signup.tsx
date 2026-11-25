"use client"

import { useCallback, useEffect, useId, useRef, useState, type Ref } from "react"
import Link from "next/link"
import { Check, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { email as contactEmail, newsletter } from "@/lib/portfolio-data"
import { newsletterAvailable, subscribeToNewsletter, type NewsletterStatus } from "@/lib/newsletter"

// Typeform's welcome screen -> question -> review -> ending sequence, using
// the portfolio's existing invitation, form controls and confirmation view.
export function NewsletterSignup({ showHeading = true }: { showHeading?: boolean }) {
  const id = useId()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"intro" | "checking" | "ready" | "review" | "unavailable" | "sending" | NewsletterStatus>("intro")
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const mounted = useRef(false)
  const pendingRef = useRef<HTMLHeadingElement>(null)
  const reviewRef = useRef<HTMLHeadingElement>(null)
  const availabilityRequest = useRef(0)
  const focusEmail = useRef(false)
  const focusStart = useRef(false)
  const reviewing = state === "review" || state === "sending"

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
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (state === "pending" || state === "subscribed" || state === "suppressed") pendingRef.current?.focus()
    else if (state === "review") reviewRef.current?.focus()
    else if (state === "ready" && focusEmail.current) { inputRef.current?.focus(); focusEmail.current = false }
    else if (state === "intro" && focusStart.current) { startRef.current?.focus(); focusStart.current = false }
  }, [state])

  if (state === "pending" || state === "subscribed" || state === "suppressed") return (
    <NewsletterConfirmation status={state} headingRef={pendingRef} onChangeEmail={() => { focusEmail.current = true; setState("ready"); setError("") }} />
  )

  if (state === "intro") return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Follow along by email">
      {showHeading ? <h2 className="text-title">{newsletter.description}</h2> : <p className="text-body">{newsletter.description}</p>}
      <Button ref={startRef} type="button" className="self-start" onClick={() => { focusEmail.current = true; setState("checking"); void checkAvailability() }}>Subscribe</Button>
    </section>
  )

  if (state === "checking" || state === "unavailable") return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Follow along by email" aria-busy={state === "checking"}>
      <p role="status" className="text-body">{state === "checking" ? "One moment…" : "Email signup is unavailable right now."}</p>
      <div className="flex flex-wrap gap-2">
        {state === "unavailable" ? <Button type="button" onClick={() => { setState("checking"); void checkAvailability() }}>Try again</Button> : null}
        <Button type="button" variant="ghost" onClick={() => { availabilityRequest.current++; focusStart.current = true; setState("intro") }}>Back</Button>
      </div>
      {state === "unavailable" ? <a href="/feed.xml" className="text-caption">Follow via RSS</a> : null}
    </section>
  )

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Follow along by email">
      <p className="text-caption text-muted-foreground" role="status">{reviewing ? "2 of 2 · Review" : "1 of 2 · Your email"}</p>
      <form className="flex min-w-0 flex-col gap-4" aria-busy={state === "sending"} onSubmit={async (event) => {
        event.preventDefault()
        if (state === "ready") { setState("review"); return }
        if (state !== "review") return
        const website = new FormData(event.currentTarget).get("website")
        setError("")
        setState("sending")
        try {
          const result = await subscribeToNewsletter(email, typeof website === "string" ? website : "")
          if (mounted.current) { setEmail(""); setState(result) }
        } catch (failure) {
          if (mounted.current) {
            setState("review")
            setError(failure instanceof Error ? failure.message : "Please try again shortly.")
          }
        }
      }}>
        <div hidden={reviewing}>
          <div className="flex flex-col gap-4">
            <label htmlFor={`${id}-email`} className="text-title">What’s your email?</label>
            <div className="glass-surface rounded-2xl border border-input p-2.5 focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20">
              <input ref={inputRef} id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" enterKeyHint="next" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={state !== "ready"} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined} className="chat-input min-h-8 w-full min-w-0 bg-transparent px-0.5 text-base leading-7 text-foreground outline-none" />
            </div>
          </div>
        </div>
        {reviewing ? <div className="flex min-w-0 flex-col gap-2"><h2 ref={reviewRef} tabIndex={-1} className="text-title">Look right?</h2><p className="text-body break-words">{email.trim()}</p><p className="text-caption text-muted-foreground">{newsletter.consent} <Link href="/privacy">Privacy</Link>.</p></div> : null}
        <div hidden aria-hidden="true"><label>Leave this empty<input name="website" type="text" autoComplete="off" tabIndex={-1} /></label></div>
        {error ? <p id={`${id}-error`} role="alert" className="text-caption text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={state === "sending" || !email.trim()} className="self-start">{state === "sending" ? "Sending…" : reviewing ? "Keep me posted" : "Next"}</Button>
          <Button type="button" variant="ghost" disabled={state === "sending"} onClick={() => { setError(""); if (reviewing) { focusEmail.current = true; setState("ready") } else { focusStart.current = true; setState("intro") } }}>Back</Button>
        </div>
      </form>
    </section>
  )
}

export function NewsletterConfirmation({ status = "confirmed", headingRef, onChangeEmail }: { status?: NewsletterStatus | "confirmed"; headingRef?: Ref<HTMLHeadingElement>; onChangeEmail?: () => void } = {}) {
  const Heading = status === "confirmed" ? "h1" : "h2"
  const Icon = status === "confirmed" || status === "subscribed" ? Check : Mail
  const title = { confirmed: "You’re in.", subscribed: "You’re already subscribed.", pending: "Check your inbox.", suppressed: "Let’s sort this out." }[status]
  return (
    <div aria-live="polite" className="flex flex-col gap-4 animate-in fade-in duration-150 motion-reduce:animate-none">
      <Icon aria-hidden="true" className="size-6 text-primary" />
      <Heading ref={headingRef} tabIndex={-1} className={status === "confirmed" ? "text-name" : "text-title"}>{title}</Heading>
      {status === "confirmed" ? <p className="text-body">Glad you’re here. I’ll send a note when I have something worth sharing.</p> : null}
      {status === "pending" ? <><p className="text-body">Open David’s email to confirm.</p><p className="text-caption text-muted-foreground">Check Spam/Junk too; mark it “Not Junk”.</p></> : null}
      {status === "suppressed" ? <p className="text-body"><a href={contactEmail.href}>Contact David to subscribe</a>.</p> : null}
      {onChangeEmail ? <Button type="button" variant="ghost" className="self-start" onClick={onChangeEmail}>Use another email</Button> : <p className="text-body"><Link href="/blog">Back to reading</Link></p>}
    </div>
  )
}
