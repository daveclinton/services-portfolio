import type { Metadata } from "next"
import { Suspense } from "react"
import { ContactsDesk } from "@/components/portfolio/contacts-desk"
import { ContactsRoute } from "@/components/portfolio/newsletters-desk"

export const metadata: Metadata = { title: "Contacts · Admin", robots: { index: false, follow: false } }

export default function AdminContactsPage() {
  return <Suspense fallback={<ContactsDesk />}><ContactsRoute /></Suspense>
}
