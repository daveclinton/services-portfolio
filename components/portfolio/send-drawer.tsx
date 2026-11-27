"use client"

import { useState, useSyncExternalStore } from "react"
import { CalendarIcon, Check, LoaderCircle, Send, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxValue, useComboboxAnchor } from "@/components/ui/combobox"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { SelectField } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { StudioContact, StudioMeta } from "@/lib/newsletter-studio"

export type SendDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  meta: StudioMeta
  busy: boolean
  audience: "all" | "selected"
  onAudience: (audience: "all" | "selected") => void
  subscribers: StudioContact[] | null
  picked: string[]
  onPicked: (emails: string[]) => void
  later: boolean
  onLater: (later: boolean) => void
  /** Nairobi wall-clock time, YYYY-MM-DDTHH:mm. */
  schedule: string
  onSchedule: (value: string) => void
  scheduleLabel: (value: string) => string
  tested: boolean
  onSend: () => void
}

// A bottom sheet on phones and a side panel from the right elsewhere: shadcn's
// responsive drawer pattern.
const wide = "(min-width: 640px)"
function useWide() {
  return useSyncExternalStore(
    (change) => { const query = matchMedia(wide); query.addEventListener("change", change); return () => query.removeEventListener("change", change) },
    () => matchMedia(wide).matches,
    () => true,
  )
}
const pad = (value: number) => String(value).padStart(2, "0")
const dayOf = (value: string) => value.slice(0, 10)
const timeOf = (value: string) => value.slice(11, 16) || "09:00"

// Ghost's publish options (apps/admin/src/editor/publish/components/options-step.tsx):
// one row each for who and when, a sentence that always says what will happen,
// and one confirmation before the email goes out. Here they share a drawer over
// the email preview, so sending never leaves the page.
export function SendDrawer({ open, onOpenChange, meta, busy, audience, onAudience, subscribers, picked, onPicked, later, onLater, schedule, onSchedule, scheduleLabel, tested, onSend }: SendDrawerProps) {
  const isWide = useWide()
  const anchor = useComboboxAnchor()
  const [confirming, setConfirming] = useState(false)
  const [dayOpen, setDayOpen] = useState(false)
  const reach = audience === "all" ? meta.subscribers : picked.length
  const people = `${reach} ${reach === 1 ? "subscriber" : "subscribers"}`
  const when = later ? (schedule ? `on ${scheduleLabel(schedule)}` : "at the time you choose") : "right now"
  const ready = reach > 0 && (!later || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(schedule))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const chosenDay = schedule ? new Date(`${dayOf(schedule)}T00:00`) : undefined

  return <Drawer open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }} swipeDirection={isWide ? "right" : "down"} showSwipeHandle={!isWide}
    // Beside the preview on wide screens, focus stays in the panel but the email is
    // not dimmed or blurred, so it can be read while choosing. Phones keep the sheet modal.
    modal={isWide ? "trap-focus" : true}>
    <DrawerContent className="shadow-lg sm:[--drawer-content-width:28rem]">
      <DrawerHeader>
        <DrawerTitle>Send newsletter</DrawerTitle>
        <DrawerDescription>From {meta.sender.name} &lt;{meta.sender.email}&gt;</DrawerDescription>
      </DrawerHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-2 pb-4">
        <section className="flex flex-col gap-2" aria-labelledby="send-to">
          <h3 id="send-to" className="flex items-center gap-2 text-caption font-medium"><Users className="size-4 text-muted-foreground" />To</h3>
          <SelectField id="send-audience" ariaLabel="Recipients" value={audience} disabled={busy} onValueChange={(value) => onAudience(value as "all" | "selected")}
            options={[{ value: "all", label: `All subscribers · ${meta.subscribers}` }, { value: "selected", label: "Specific contacts" }]} />
          {audience === "selected" ? subscribers ? <Combobox multiple autoHighlight items={subscribers.map((contact) => contact.email)} value={picked} onValueChange={(value) => onPicked(value as string[])} disabled={busy}>
            <ComboboxChips ref={anchor} className="w-full">
              <ComboboxValue>{(values: string[]) => <>
                {values.map((email) => <ComboboxChip key={email}>{email}</ComboboxChip>)}
                <ComboboxChipsInput aria-label="Search subscribers" placeholder={values.length ? "" : "Search by email"} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </>}</ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
              <ComboboxEmpty>{subscribers.length ? "No subscriber matches that email." : "No confirmed subscribers yet."}</ComboboxEmpty>
              <ComboboxList>{(email: string) => <ComboboxItem key={email} value={email}>{email}</ComboboxItem>}</ComboboxList>
            </ComboboxContent>
          </Combobox> : <div role="status" aria-label="Loading subscribers"><Skeleton className="h-8 w-full" /></div> : null}
          <p className="text-caption text-muted-foreground">Only confirmed subscribers receive it. Anyone who unsubscribes first is skipped.</p>
        </section>
        <section className="flex flex-col gap-2" aria-labelledby="send-when">
          <h3 id="send-when" className="flex items-center gap-2 text-caption font-medium"><Clock className="size-4 text-muted-foreground" />When</h3>
          <SelectField id="send-when-mode" ariaLabel="Delivery time" value={later ? "later" : "now"} disabled={busy} onValueChange={(value) => onLater(value === "later")}
            options={[{ value: "now", label: "Right now" }, { value: "later", label: "Schedule for later" }]} />
          {later ? <div className="flex gap-2">
            <Popover open={dayOpen} onOpenChange={setDayOpen}>
              <PopoverTrigger render={<Button variant="outline" className="flex-1 justify-start font-normal" disabled={busy} />}>
                <CalendarIcon />{chosenDay ? chosenDay.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={chosenDay} disabled={{ before: today }} defaultMonth={chosenDay}
                  onSelect={(day) => { if (!day) return; onSchedule(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${timeOf(schedule)}`); setDayOpen(false) }} />
              </PopoverContent>
            </Popover>
            <label className="sr-only" htmlFor="send-time">Time</label>
            <input id="send-time" type="time" className="h-8 w-28 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30" value={timeOf(schedule)} disabled={busy || !schedule}
              onChange={(event) => { if (schedule && event.target.value) onSchedule(`${dayOf(schedule)}T${event.target.value}`) }} />
          </div> : null}
          {later ? <p className="text-caption text-muted-foreground">Nairobi time (EAT).</p> : null}
        </section>
      </div>
      <DrawerFooter className="border-t border-border">
        <p className="text-body" role="status">{reach < 1 ? (audience === "all" ? "There are no confirmed subscribers yet." : "Choose at least one contact.") : <>Goes to <strong>{people}</strong> {when}.</>}</p>
        <p className="flex items-center gap-2 text-caption text-muted-foreground">{tested ? <><Check className="size-4" />A test of this version went to {meta.test_email}.</> : "No test has been sent for this version."}</p>
        <Button disabled={busy || !ready} onClick={() => setConfirming(true)}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <Send />}{later ? "Schedule email" : `Send to ${people}`}</Button>
      </DrawerFooter>
    </DrawerContent>
    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{later ? `Schedule for ${people}?` : `Send to ${people} now?`}</AlertDialogTitle>
          <AlertDialogDescription>{later ? `It goes out ${when}. You can cancel it until then.` : "Sent emails can’t be recalled."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setConfirming(false); onSend() }}>{later ? "Schedule email" : "Send email"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Drawer>
}
