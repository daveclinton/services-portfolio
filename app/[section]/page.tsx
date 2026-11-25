import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { HomeList } from "@/components/portfolio/home-list"
import { plainText, sectionMetadata, summary } from "@/lib/section"
import { signals } from "@/lib/signals"

type Props = { params: Promise<{ section: string }> }

const find = async ({ params }: Props) => {
  const { section } = await params
  const index = signals.findIndex((item) => item.slug === section)
  if (index < 0) redirect("/blog")
  return index
}

export function generateStaticParams() {
  return signals.map((item) => ({ section: item.slug }))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const item = signals[await find(props)]
  return sectionMetadata({ title: item.title, description: summary(plainText(item.body)), path: `/${item.slug}` })
}

export default async function SectionPage(props: Props) {
  return <HomeList initial={await find(props)} />
}
