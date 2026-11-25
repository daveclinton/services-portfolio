import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Writing desk",
  robots: { index: false, follow: false },
}

export default async function WritingDeskPage({ searchParams }: PageProps<"/admin/writing">) {
  const query = await searchParams
  redirect(query.login === "failed" ? "/admin/posts?login=failed" : "/admin/posts")
}
