"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Users } from "lucide-react"
import { AdminShell } from "@/components/portfolio/admin-shell"
import { TablePager } from "@/components/portfolio/table-pager"
import { SortHeader } from "@/components/portfolio/sort-header"
import { EMPTY_QUERY, compareText, nextSort, readPage, readSort, setDeskQuery, type DeskQuery, type SortDir } from "@/lib/desk-url"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { studioBootstrap, studioContacts, studioLoginURL, studioLogout, type StudioContact, type StudioSession } from "@/lib/newsletter-studio"

const PAGE_SIZE = 20
const labels: Record<StudioContact["status"], string> = { subscribed: "Subscribed", pending: "Awaiting confirmation", suppressed: "Unsubscribed" }
const SORT_KEYS = ["email", "status", "date"] as const
type SortKey = typeof SORT_KEYS[number]
const sortDefault = (key: SortKey): SortDir => key === "date" ? "desc" : "asc"
const dateOf = (contact: StudioContact) => contact.confirmed_at ?? contact.joined_at
const day = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeZone: "Africa/Nairobi" })

// Ghost's members list: search above one table of email, status and date.
// https://ghost.org/help/member-management/
export function ContactsDesk({ query = EMPTY_QUERY }: { query?: DeskQuery }) {
  const router = useRouter()
  const [session, setSession] = useState<StudioSession | null>(null)
  const [contacts, setContacts] = useState<StudioContact[] | null>(null)
  const [limit, setLimit] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    studioBootstrap("posts").then(async (desk) => {
      if (!live) return
      setSession(desk.session)
      if (!desk.session.authenticated) return
      const result = await studioContacts()
      if (live) { setContacts(result.contacts); setLimit(result.limit) }
    }).catch((failure) => { if (live) setError(failure instanceof Error ? failure.message : "Couldn’t load contacts.") })
    return () => { live = false }
  }, [attempt])

  const search = query.get("q") ?? ""
  const needle = search.trim().toLowerCase()
  const sort = readSort(query, SORT_KEYS, "date", sortDefault)
  const page = readPage(query)
  const order = (a: StudioContact, b: StudioContact) => sort.key === "email" ? compareText(a.email, b.email) : sort.key === "status" ? compareText(labels[a.status], labels[b.status]) || compareText(a.email, b.email) : Date.parse(dateOf(a)) - Date.parse(dateOf(b))
  const rows = (contacts ?? []).filter((contact) => contact.email.includes(needle)).sort((a, b) => sort.dir === "asc" ? order(a, b) : order(b, a))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const first = current * PAGE_SIZE
  const visible = rows.slice(first, first + PAGE_SIZE)
  const count = (status: StudioContact["status"]) => (contacts ?? []).filter((contact) => contact.status === status).length
  const loading = !error && (!session || (session.authenticated && !contacts))
  const signedOut = session !== null && !session.authenticated

  return <AdminShell section="contacts" title="Contacts" session={session} loading={loading} busy={busy} editing onNavigate={async (href) => router.push(href)} onLogout={() => {
    if (!session?.csrf) return
    setBusy(true)
    studioLogout(session.csrf).then(() => { setContacts(null); setSession({ configured: true, authenticated: false, csrf: "", login: "" }) }).catch((failure) => setError(failure instanceof Error ? failure.message : "Couldn’t sign out.")).finally(() => setBusy(false))
  }}>
    <article className="flex h-full min-h-0 min-w-0 flex-col gap-4" aria-busy={loading}>
      <h1 className="sr-only">Contacts</h1>
      {error ? <div className="flex items-center gap-3"><p role="alert" className="text-body text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => { setError(""); setAttempt((value) => value + 1) }}>Retry</Button></div> : null}
      {signedOut ? <div className="flex flex-col gap-4"><p className="text-body">{session.configured ? "Sign in to see your contacts." : "This writing desk hasn’t been enabled yet."}</p>{session.configured ? <Button className="w-fit" nativeButton={false} render={<a href={studioLoginURL} />}>Continue with GitHub</Button> : null}</div> : null}
      {!signedOut && !error ? <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="glass-surface flex w-full max-w-sm items-center gap-2 rounded-lg border border-input px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search contacts by email</span>
            <input type="search" className="chat-input h-8 min-w-0 flex-1 bg-transparent text-caption text-foreground outline-none" placeholder="Search by email" value={search} disabled={!contacts} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => setDeskQuery({ q: event.target.value, page: null })} />
          </label>
          {contacts ? <p className="text-caption text-muted-foreground">{count("subscribed")} subscribed · {count("pending")} awaiting confirmation · {count("suppressed")} unsubscribed</p> : <Skeleton className="h-4 w-64" />}
        </div>
        {contacts && contacts.length >= limit ? <p className="text-caption text-muted-foreground">Showing the newest {limit} contacts.</p> : null}
        <div className="admin-table-frame">
          {contacts ? <>
            <div ref={scroller} className="admin-table-scroll" role="region" aria-label="All contacts" tabIndex={0}><table className="admin-table"><thead><tr>{SORT_KEYS.map((key) => <SortHeader key={key} label={{ email: "Email", status: "Status", date: "Date" }[key]} active={sort.key === key} dir={sort.dir} onSort={() => setDeskQuery(nextSort(sort, key, "date", sortDefault))} />)}</tr></thead><tbody>
              {visible.map((contact) => <tr key={contact.email}><td className="min-w-48 font-medium break-all">{contact.email}</td><td><Badge variant="secondary">{labels[contact.status]}</Badge></td><td className="whitespace-nowrap"><time dateTime={dateOf(contact)}>{day.format(new Date(dateOf(contact)))}</time></td></tr>)}
              {rows.length === 0 ? <tr><td colSpan={3}><div className="flex flex-col items-center gap-3 py-8 text-muted-foreground"><Users className="size-6" /><p>{needle ? "No contacts match that search" : "No contacts yet"}</p></div></td></tr> : null}
            </tbody></table></div>
            <TablePager first={first} shown={visible.length} total={rows.length} page={current} pages={pages} onPage={(next) => { setDeskQuery({ page: next > 0 ? String(next + 1) : null }); if (scroller.current) scroller.current.scrollTop = 0 }} />
          </> : <div role="status" aria-label="Loading contacts" className="min-h-0 flex-1 overflow-hidden px-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((row) => <div key={row} className="flex items-center gap-4 border-b border-border py-4 last:border-0"><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-24" /><Skeleton className="hidden h-4 w-24 sm:block" /></div>)}</div>}
        </div>
      </> : null}
    </article>
  </AdminShell>
}
