import { API_URL } from "@/lib/ai-client"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-site">{API_URL ? <link rel="preconnect" href={API_URL} crossOrigin="use-credentials" /> : null}{children}</div>
}
