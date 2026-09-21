import { GmailIcon } from "@/components/portfolio/brand-icons"
import { email } from "@/lib/portfolio-data"

export function EmailLink() {
  return (
    <a
      href={email.href}
      title="Email"
      className="flex size-12 shrink-0 items-center justify-center rounded-md transition-opacity outline-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <GmailIcon className="size-8" />
      <span className="sr-only">Send an email</span>
    </a>
  )
}
