import type { Metadata } from "next"
import { HomeList } from "@/components/portfolio/home-list"

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
}

export default function Home() {
  return <HomeList />
}
