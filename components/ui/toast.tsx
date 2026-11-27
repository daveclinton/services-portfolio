"use client"

import { Toast } from "@base-ui/react/toast"
import { Check, CircleAlert, LoaderCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export const toastManager = Toast.createToastManager<{ progress?: number | null }>()

// Base UI owns announcements, dismissal, keyboard access and toast lifetimes.
// https://base-ui.com/react/components/toast
export function Toaster() {
  return <Toast.Provider toastManager={toastManager}><ToastList /></Toast.Provider>
}

function ToastList() {
  const { toasts } = Toast.useToastManager<{ progress?: number | null }>()
  return <Toast.Portal><Toast.Viewport className="fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-2 outline-none sm:left-auto sm:w-80" aria-label="Notifications">
    {toasts.map((toast) => <Toast.Root key={toast.id} toast={toast} className="flex w-full items-start gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-sm data-limited:hidden">
      {toast.type === "loading" ? <LoaderCircle className="mt-0.5 size-4 shrink-0 motion-safe:animate-spin" /> : toast.type === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" /> : <Check className="mt-0.5 size-4 shrink-0 text-primary" />}
      <Toast.Content className="min-w-0 flex-1">
        <Toast.Title className="text-caption font-semibold" />
        <Toast.Description className="mt-1 break-words text-caption text-muted-foreground" />
        {toast.type === "loading" ? <progress aria-label="Upload progress" max={100} value={toast.data?.progress ?? undefined} className="mt-2 h-1.5 w-full accent-primary" /> : null}
        {toast.actionProps ? <Toast.Action {...toast.actionProps} render={<Button variant="ghost" size="sm" className="mt-2" />} /> : null}
      </Toast.Content>
      <Toast.Close render={<Button variant="ghost" size="icon-sm" aria-label="Dismiss notification" />}><X /></Toast.Close>
    </Toast.Root>)}
  </Toast.Viewport></Toast.Portal>
}
