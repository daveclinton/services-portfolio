import type { Metadata } from "next"
import { ExperienceList } from "@/components/portfolio/experience-list"
import { site } from "@/lib/portfolio-data"

export const metadata: Metadata = {
  title: "Work experience",
  alternates: { canonical: "/experience" },
  openGraph: { type: "website", siteName: site.name, title: "Work experience", description: site.description, url: "/experience" },
  twitter: { card: "summary_large_image", title: "Work experience", description: site.description },
}

export default function ExperiencePage() {
  return <ExperienceList />
}
