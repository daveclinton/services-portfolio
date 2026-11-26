"use client"

import { useSearchParams } from "next/navigation"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"
import { ContactsDesk } from "@/components/portfolio/contacts-desk"

// Reading the query in the browser keeps the desk pages static and edge cached.
// The desk is not keyed by the query: a changed address updates it in place.
export function PostsDesk() {
  return <NewsletterStudio section="posts" query={useSearchParams()} />
}
export function NewslettersDesk() {
  const query = useSearchParams()
  return <NewsletterStudio section="newsletters" initialPost={query.get("post") ?? undefined} query={query} />
}
export function ContactsRoute() {
  return <ContactsDesk query={useSearchParams()} />
}
