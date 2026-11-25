"use client"

import { useLayoutEffect, useState, type ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Menu } from "@base-ui/react/menu"
import { FileText, Mail, PenLine, PanelLeft, ChevronsUpDown, ExternalLink, LogOut, X, LoaderCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { enterAdminTheme } from "@/lib/tone"
import { site } from "@/lib/portfolio-data"
import type { StudioSession } from "@/lib/newsletter-studio"

export type AdminSection = "posts" | "newsletters"
type Props = { section: AdminSection; session: StudioSession | null; loading: boolean; busy: boolean; onNavigate: (href: string) => Promise<void>; onLogout: () => void; children: ReactNode }

// Header / content / profile-footer hierarchy follows shadcn sidebar-07.
// https://ui.shadcn.com/blocks/sidebar#sidebar-07
export function AdminShell({ section, session, loading, busy, onNavigate, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  useLayoutEffect(enterAdminTheme, [])

  const content = <>
    <div className="admin-sidebar-header"><PenLine className="size-5" /><div><p className="text-body font-semibold">Writing desk</p><p className="text-caption text-muted-foreground">{site.name}</p></div></div>
    <div className="admin-sidebar-content">
      <p className="px-3 pb-2 text-caption text-muted-foreground">Content</p>
      <nav aria-label="Admin navigation"><ul className="flex flex-col gap-1">
        {([{ id: "posts", label: "Posts", icon: FileText }, { id: "newsletters", label: "Newsletters", icon: Mail }] as const).map(({ id, label, icon: Icon }) => <li key={id}><a href={`/admin/${id}`} aria-current={section === id ? "page" : undefined} className="admin-nav-link" onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          if (busy) return
          void onNavigate(`/admin/${id}`).then(() => setMobileOpen(false))
        }}><Icon className="size-4" />{label}</a></li>)}
      </ul></nav>
    </div>
    <div className="admin-sidebar-footer">
      {loading ? <div className="flex items-center gap-3 p-2"><Skeleton className="size-8 rounded-full" /><div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div></div> : session?.authenticated ? <Menu.Root>
        <Menu.Trigger render={<Button variant="ghost" className="h-auto w-full justify-start gap-3 p-2.5 text-left" aria-label="Open profile menu" />}>
          <Avatar><AvatarFallback>{session.login.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <span className="min-w-0 flex-1"><span className="block truncate text-caption font-medium">{session.login}</span><span className="block text-caption text-muted-foreground">Owner</span></span><ChevronsUpDown className="size-4" />
        </Menu.Trigger>
        <Menu.Portal><Menu.Positioner side="top" align="start" sideOffset={4} className="z-50"><Menu.Popup className="w-64 max-w-(--available-width) rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none">
          <Menu.Group><Menu.GroupLabel className="px-2.5 py-2 text-caption text-muted-foreground">{session.login}</Menu.GroupLabel>
            <Menu.LinkItem href="/" className="admin-menu-item" onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (!busy) void onNavigate("/") }}><ExternalLink className="size-4" />View site</Menu.LinkItem>
            <Menu.Item className="admin-menu-item" disabled={busy} onClick={onLogout}><LogOut className="size-4" />Sign out</Menu.Item>
          </Menu.Group>
        </Menu.Popup></Menu.Positioner></Menu.Portal>
      </Menu.Root> : <div className="flex items-center gap-3 p-2.5 text-caption text-muted-foreground"><Avatar><AvatarFallback>DC</AvatarFallback></Avatar>Owner access</div>}
    </div>
  </>

  return <TooltipProvider delay={300}><div className="admin-shell">
    <aside className="admin-sidebar" aria-label="Admin sidebar">{content}</aside>
    <div className="min-w-0 flex-1">
      <header className="admin-header">
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" />}><PanelLeft /></Dialog.Trigger>
          <Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-40 bg-background/85" /><Dialog.Popup className="admin-mobile-sidebar">
            <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" className="absolute top-3 right-2" aria-label="Close navigation" />}><X /></Dialog.Close>
            {content}
          </Dialog.Popup></Dialog.Portal>
        </Dialog.Root>
        <span className="text-caption text-muted-foreground">Content</span><span className="text-caption text-muted-foreground" aria-hidden="true">/</span><span className="text-caption font-medium">{section === "posts" ? "Posts" : "Newsletters"}</span>
        {busy ? <span role="status" aria-label="Working" className="ml-auto"><LoaderCircle className="size-4 motion-safe:animate-spin" /></span> : null}
      </header>
      <main id="content" className="admin-content" aria-busy={loading || busy}>{children}</main>
    </div>
  </div></TooltipProvider>
}
