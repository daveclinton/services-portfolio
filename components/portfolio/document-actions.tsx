"use client"

import { useState } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Menu } from "@base-ui/react/menu"
import { Ellipsis, ExternalLink, LoaderCircle, Mail, Pencil, RotateCcw, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { NewsletterDraft, StudioRemoval } from "@/lib/newsletter-studio"

type Props = {
  document: NewsletterDraft
  busy: boolean
  onOpen?: () => void
  onNewsletter: () => void
  onRemove: (action: StudioRemoval) => Promise<boolean>
}

const confirmations: Record<StudioRemoval, { title: string; detail: (d: NewsletterDraft) => string; label: string }> = {
  unpublish: { title: "Unpublish this post?", detail: () => "Readers will no longer see it. It stays here as a draft, and its URL and original date are kept.", label: "Unpublish" },
  discard: { title: "Discard unpublished changes?", detail: () => "The draft returns to the published version. This can’t be undone.", label: "Discard changes" },
  delete: { title: "Delete permanently?", detail: (d) => d.published_revision ? "The post will be removed from your site. This can’t be undone." : "This can’t be undone.", label: "Delete" },
}

// Ghost's unpublish and delete confirmations, reached from a row menu.
// The dialog sits outside the menu so it survives the menu closing.
// https://base-ui.com/react/components/alert-dialog
export function DocumentActions({ document: item, busy, onOpen, onNewsletter, onRemove }: Props) {
  const [pending, setPending] = useState<StudioRemoval | null>(null)
  const [open, setOpen] = useState(false)
  const post = item.kind === "post"
  const published = post && Boolean(item.published_revision)
  const changed = published && item.published_revision! < item.revision
  const deletable = post || ["draft", "error"].includes(item.state)
  const ask = (action: StudioRemoval) => { setPending(action); setOpen(true) }
  const copy = pending ? confirmations[pending] : null

  return <>
    <Menu.Root>
      <Menu.Trigger disabled={busy} render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.subject}`} />}><Ellipsis /></Menu.Trigger>
      <Menu.Portal><Menu.Positioner align="end" sideOffset={4} className="z-50"><Menu.Popup className="min-w-48 max-w-(--available-width) rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none">
        {onOpen ? <Menu.Item className="admin-menu-item" onClick={onOpen}><Pencil className="size-4" />{["draft", "error"].includes(item.state) ? "Edit" : "View"}</Menu.Item> : null}
        {published ? <>
          <Menu.LinkItem className="admin-menu-item" href={`/blog/${item.slug}`} target="_blank" rel="noreferrer" closeOnClick><ExternalLink className="size-4" />View post</Menu.LinkItem>
          <Menu.Item className="admin-menu-item" onClick={onNewsletter}><Mail className="size-4" />Create newsletter</Menu.Item>
          {changed ? <Menu.Item className="admin-menu-item" onClick={() => ask("discard")}><RotateCcw className="size-4" />Discard changes</Menu.Item> : null}
          <Menu.Item className="admin-menu-item" onClick={() => ask("unpublish")}><Undo2 className="size-4" />Unpublish</Menu.Item>
        </> : null}
        {deletable ? <Menu.Item className="admin-menu-item text-destructive" onClick={() => ask("delete")}><Trash2 className="size-4" />Delete</Menu.Item> : null}
      </Menu.Popup></Menu.Positioner></Menu.Portal>
    </Menu.Root>
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!busy) setOpen(next) }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-background/85" />
        <AlertDialog.Popup className="admin-dialog">
          <AlertDialog.Title className="text-title font-semibold">{copy?.title}</AlertDialog.Title>
          <p className="text-body font-medium break-words">{item.subject}</p>
          <AlertDialog.Description className="text-body text-muted-foreground">{copy?.detail(item)}</AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close disabled={busy} render={<Button variant="ghost" />}>Cancel</AlertDialog.Close>
            <Button variant="destructive" disabled={busy} onClick={() => { if (pending) void onRemove(pending).finally(() => setOpen(false)) }}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : null}{copy?.label}</Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  </>
}
