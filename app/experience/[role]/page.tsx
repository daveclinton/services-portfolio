import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ExperienceList } from "@/components/portfolio/experience-list"
import { backgroundItems } from "@/lib/portfolio-data"
import { roleTitle, sectionMetadata, summary } from "@/lib/section"

type Props = { params: Promise<{ role: string }> }

const find = async ({ params }: Props) => {
  const { role } = await params
  const index = backgroundItems.findIndex((item) => item.slug === role)
  if (index < 0) redirect("/experience")
  return index
}

export function generateStaticParams() {
  return backgroundItems.map((item) => ({ role: item.slug }))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const item = backgroundItems[await find(props)]
  return sectionMetadata({ title: roleTitle(item.company), description: summary(item.description), path: `/experience/${item.slug}` })
}

export default async function RolePage(props: Props) {
  return <ExperienceList initial={await find(props)} />
}
