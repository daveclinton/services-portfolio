import { Mail } from "lucide-react"
import { email } from "@/lib/portfolio-data"

export function EmailLink() {
  return (
    <a
      href={email.href}
      className="group mt-3 flex h-12 items-center gap-3 rounded-full bg-card px-5 text-body text-muted-foreground transition-colors outline-none hover:bg-card-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <Mail className="size-4 text-subtle-foreground" aria-hidden="true" />
      {email.label}
    </a>
  )
}
