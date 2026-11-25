import type { Metadata } from "next"
import { NewsletterStudio } from "@/components/portfolio/newsletter-studio"

export const metadata: Metadata = { title: "Newsletters · Admin", robots: { index: false, follow: false } }

export default async function AdminNewslettersPage({ searchParams }: PageProps<"/admin/newsletters">) {
  const query = await searchParams
  const initialPost=typeof query.post === "string" ? query.post : undefined
  return <NewsletterStudio key={`newsletters-${initialPost??""}`} section="newsletters" initialPost={initialPost} />
}
