import { Children, isValidElement, type ReactNode } from "react"
import type { Metadata } from "next"
import { site } from "@/lib/portfolio-data"

/** The plain words inside an item, for search results and link previews. */
export function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(plainText).join("")
  if (isValidElement<{ children?: ReactNode }>(node)) return Children.toArray(node.props.children).map(plainText).join("")
  return ""
}

/** Whole sentences, up to the length previews show. */
export function summary(text: string, limit = 200) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  let result = sentences[0].trim()
  for (const sentence of sentences.slice(1)) {
    if (result.length + sentence.length > limit) break
    result += ` ${sentence.trim()}`
  }
  return result
}

export function sectionMetadata({ title, description, path, canonical = path }: { title: string; description: string; path: string; canonical?: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", siteName: site.name, title, description, url: path },
    twitter: { card: "summary_large_image", title, description },
  }
}

/** "Paperspace (now DigitalOcean)" becomes "My work at Paperspace". */
export const roleTitle = (company: string) => `My work at ${company.replace(/\s*\(.*\)/, "").replace(" · ", " and ")}`
