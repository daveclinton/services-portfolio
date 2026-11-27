"use client"

import { useEffect, useLayoutEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { site } from "@/lib/portfolio-data"
import { enterAdminTheme } from "@/lib/tone"
import { studioLoginURL, studioSession, takeSignInReturn } from "@/lib/newsletter-studio"

type State = { status: "checking" } | { status: "ready"; configured: boolean; failed: boolean } | { status: "unreachable"; message: string }

// Ghost Admin's sign-in screen (apps/admin/src/auth/signin.tsx and auth-layout.tsx):
// one centred 400px column with the site icon and title, one full-width submit
// button that spins while it works and offers Retry after a failure, and one
// message line under it. A signed-in owner is sent straight on.
// https://github.com/TryGhost/Ghost/tree/main/apps/admin/src/auth
export function AdminSignIn() {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: "checking" })
  const [leaving, setLeaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useLayoutEffect(enterAdminTheme, [])

  useEffect(() => {
    let live = true
    studioSession().then((session) => {
      if (!live) return
      if (session.authenticated) router.replace(takeSignInReturn())
      // Read in the browser so the page stays static.
      else setState({ status: "ready", configured: session.configured, failed: new URLSearchParams(window.location.search).get("login") === "failed" })
    }).catch((failure: unknown) => { if (live) setState({ status: "unreachable", message: failure instanceof Error ? failure.message : "Couldn’t reach the writing desk." }) })
    return () => { live = false }
  }, [router, attempt])

  // Coming back from GitHub with the Back button restores this page as it was left.
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => { if (event.persisted) setLeaving(false) }
    window.addEventListener("pageshow", restore)
    return () => window.removeEventListener("pageshow", restore)
  }, [])

  const failed = state.status === "ready" && state.failed
  const message = state.status === "unreachable" ? state.message
    : state.status === "ready" && !state.configured ? "This writing desk hasn’t been enabled yet."
    : failed ? "Sign-in wasn’t completed. Use the GitHub account that owns this site."
    : ""
  const canSignIn = state.status === "ready" && state.configured

  return <main className="flex min-h-dvh w-full flex-col items-center overflow-y-auto bg-sidebar px-6">
    <div className="my-auto flex w-full max-w-[400px] flex-col gap-8 py-12">
      <header className="mb-4 flex flex-col items-center gap-5 text-center">
        <Image src="/icon.svg" alt="" width={60} height={60} priority className="size-15 rounded-sm" />
        <h1 className="text-4xl leading-tight font-bold tracking-tighter text-foreground">{site.name}</h1>
        <p className="text-body text-muted-foreground">Sign in to your writing desk.</p>
      </header>
      {state.status === "unreachable" ? <Button size="lg" className="mt-4 h-11 w-full text-body" onClick={() => { setState({ status: "checking" }); setAttempt((value) => value + 1) }}>Retry</Button>
        : state.status === "ready" && !state.configured ? null
        : <Button size="lg" variant={failed && !leaving ? "destructive" : "default"} className="mt-4 h-11 w-full text-body" disabled={!canSignIn || leaving} nativeButton={false}
            render={<a href={canSignIn ? studioLoginURL : undefined} aria-disabled={!canSignIn || leaving || undefined} onClick={() => setLeaving(true)} />}>
            {state.status === "checking" || leaving ? <><LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" /><span className="sr-only">{leaving ? "Opening GitHub" : "Checking your sign-in"}</span></>
              : failed ? "Retry" : "Continue with GitHub →"}
          </Button>}
      <p role="status" className={`min-h-5 text-center text-body ${state.status === "unreachable" || failed ? "text-destructive" : "text-muted-foreground"}`}>{message}&nbsp;</p>
    </div>
  </main>
}
