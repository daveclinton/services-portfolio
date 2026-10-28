import type { Metadata } from "next"
import { BackgroundSection } from "@/components/portfolio"

export const metadata: Metadata = {
  title: "Work experience",
  alternates: { canonical: "/experience" },
}

export default function ExperiencePage() {
  return <BackgroundSection />
}
