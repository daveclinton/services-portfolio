"use client"

import { useSearchParams } from "next/navigation"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"

// Reading the query in the browser keeps the page static and edge cached.
export function NewslettersDesk() {
  const post = useSearchParams().get("post") ?? undefined
  return <NewsletterStudio key={`newsletters-${post ?? ""}`} section="newsletters" initialPost={post} />
}
