"use client"

import { useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Menu } from "@base-ui/react/menu"
import Image from "next/image"
import { FileText, Mail, Users, PanelLeft, PanelLeftClose, PanelLeftOpen, ChevronsUpDown, ExternalLink, LogOut, X, LoaderCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { enterAdminTheme } from "@/lib/tone"
import { site } from "@/lib/portfolio-data"
import type { StudioSession } from "@/lib/newsletter-studio"

export type AdminSection = "posts" | "newsletters" | "contacts"
type Props = { section: AdminSection; session: StudioSession | null; loading: boolean; busy: boolean; title?: string; actions?: ReactNode; editing?: boolean; compactTitle?: boolean; onNavigate: (href: string) => Promise<void>; onLogout: () => void; children: ReactNode }

// The sidebar preference lives on <html> (set before paint by the desk layout)
// and in localStorage; the server always renders it expanded.
const sidebarListeners = new Set<() => void>()
const sidebarCollapsed = () => document.documentElement.dataset.deskSidebar === "collapsed"
function subscribeSidebar(listener: () => void) { sidebarListeners.add(listener); return () => { sidebarListeners.delete(listener) } }
function setSidebarCollapsed(next: boolean) {
  if (next) document.documentElement.dataset.deskSidebar = "collapsed"; else delete document.documentElement.dataset.deskSidebar
  try { localStorage.setItem("desk-sidebar", next ? "collapsed" : "expanded") } catch {}
  sidebarListeners.forEach((listener) => listener())
}

// Header / content / profile-footer hierarchy follows shadcn sidebar-07.
// https://ui.shadcn.com/blocks/sidebar#sidebar-07
export function AdminShell({ section, session, loading, busy, title, actions, editing, compactTitle, onNavigate, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  // shadcn's collapsible="icon" sidebar. The width comes from a data attribute
  // the layout sets before paint; this state only drives labels and tooltips.
  const collapsed = useSyncExternalStore(subscribeSidebar, sidebarCollapsed, () => false)
  useLayoutEffect(enterAdminTheme, [])
  const toggleSidebar = () => setSidebarCollapsed(!collapsed)

  // The phone drawer always shows full labels; only the desktop rail collapses.
  const content = (compact: boolean) => <>
    <div className="admin-sidebar-header"><Image src="/icon.svg" alt="" width={32} height={32} className="size-8 shrink-0" /><div className="admin-sidebar-text"><p className="text-body font-semibold">Writing desk</p><p className="text-caption text-muted-foreground">{site.name}</p></div></div>
    <div className="admin-sidebar-content">
      <nav aria-label="Admin navigation" className="flex flex-col gap-4">
        {([["Content", [{ id: "posts", label: "Posts", icon: FileText }, { id: "newsletters", label: "Newsletters", icon: Mail }]], ["Audience", [{ id: "contacts", label: "Contacts", icon: Users }]]] as const).map(([group, items]) => <div key={group}>
          <p className="admin-sidebar-group px-3 pb-2 text-caption text-muted-foreground">{group}</p>
          <ul className="flex flex-col gap-1">{items.map(({ id, label, icon: Icon }) => <li key={id}><Tooltip disabled={!compact}><TooltipTrigger render={<a href={`/admin/${id}`} aria-current={section === id ? "page" : undefined} className="admin-nav-link" onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          if (busy) return
          void onNavigate(`/admin/${id}`).then(() => setMobileOpen(false))
        }} />}><Icon className="size-4 shrink-0" /><span className="admin-sidebar-text">{label}</span></TooltipTrigger><TooltipContent side="right">{label}</TooltipContent></Tooltip></li>)}</ul>
        </div>)}
      </nav>
    </div>
    <div className="admin-sidebar-footer">
      {loading ? <div className="flex items-center gap-3 p-2"><Skeleton className="size-8 rounded-full" /><div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div></div> : session?.authenticated ? <Menu.Root>
        <Menu.Trigger render={<Button variant="ghost" className="h-auto w-full justify-start gap-3 p-2.5 text-left" aria-label="Open profile menu" />}>
          <Avatar><AvatarFallback>{session.login.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <span className="admin-sidebar-text min-w-0 flex-1"><span className="block truncate text-caption font-medium">{session.login}</span><span className="block text-caption text-muted-foreground">Owner</span></span><ChevronsUpDown className="admin-sidebar-text size-4" />
        </Menu.Trigger>
        <Menu.Portal><Menu.Positioner side="top" align="start" sideOffset={4} className="z-50"><Menu.Popup className="w-64 max-w-(--available-width) rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none">
          <Menu.Group><Menu.GroupLabel className="px-2.5 py-2 text-caption text-muted-foreground">{session.login}</Menu.GroupLabel>
            <Menu.LinkItem href="/" className="admin-menu-item" onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (!busy) void onNavigate("/") }}><ExternalLink className="size-4" />View site</Menu.LinkItem>
            <Menu.Item className="admin-menu-item" disabled={busy} onClick={onLogout}><LogOut className="size-4" />Sign out</Menu.Item>
          </Menu.Group>
        </Menu.Popup></Menu.Positioner></Menu.Portal>
      </Menu.Root> : <div className="flex items-center gap-3 p-2.5 text-caption text-muted-foreground"><Avatar><AvatarFallback>DC</AvatarFallback></Avatar><span className="admin-sidebar-text">Owner access</span></div>}
    </div>
  </>

  return <TooltipProvider delay={300}><div className="admin-shell">
    <aside id="admin-sidebar" className="admin-sidebar glass-surface" aria-label="Admin sidebar">{content(collapsed)}</aside>
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="admin-header glass-surface">
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" />}><PanelLeft /></Dialog.Trigger>
          <Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-40 bg-background/85" /><Dialog.Popup className="admin-mobile-sidebar glass-surface">
            <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
            <Dialog.Close render={<Button variant="ghost" size="icon" className="absolute top-3 right-2" aria-label="Close navigation" />}><X /></Dialog.Close>
            {content(false)}
          </Dialog.Popup></Dialog.Portal>
        </Dialog.Root>
        {/* Desktop: collapse the sidebar to icons, beside where it sits. */}
        <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className="max-md:hidden" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-controls="admin-sidebar" aria-expanded={!collapsed} onClick={toggleSidebar} />}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</TooltipTrigger><TooltipContent>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent></Tooltip>
        {/* On phones, document steps give the header row to their actions; the page keeps its own heading. */}
        <span className={`min-w-0 truncate text-caption font-medium${compactTitle ? " max-sm:sr-only" : ""}`}>{title ?? { posts: "Posts", newsletters: "Newsletters", contacts: "Contacts" }[section]}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">{busy ? <span role="status" aria-label="Working"><LoaderCircle className="size-4 motion-safe:animate-spin" /></span> : null}{actions}</div>
      </header>
      <main id="content" className={`admin-content${editing ? " admin-content-editing" : ""}`} aria-busy={loading || busy}>{children}</main>
    </div>
  </div></TooltipProvider>
}
