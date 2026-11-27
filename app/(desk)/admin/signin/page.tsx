import type { Metadata } from "next"
import { AdminSignIn } from "@/components/portfolio/admin-signin"

export const metadata: Metadata = { title: "Sign in · Admin", robots: { index: false, follow: false } }

export default function AdminSignInPage() {
  return <AdminSignIn />
}
