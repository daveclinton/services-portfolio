import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Writing desk",
  robots: { index: false, follow: false },
}

export default async function LegacyStudioPage({ searchParams }: PageProps<"/admin/newsletters">) {
  const query = await searchParams
  redirect(query.login === "failed" ? "/admin/writing?login=failed" : "/admin/writing")
}
