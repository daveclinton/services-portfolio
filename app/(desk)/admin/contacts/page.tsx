import type { Metadata } from "next"
import { ContactsDesk } from "@/components/portfolio/contacts-desk"

export const metadata: Metadata = { title: "Contacts · Admin", robots: { index: false, follow: false } }

export default function AdminContactsPage() {
  return <ContactsDesk />
}
