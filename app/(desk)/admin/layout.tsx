import { API_URL } from "@/lib/ai-client"

// Ask for the desk's data while its JavaScript is still downloading. The client
// consumes this response once; a failed early request falls back to a normal one.
const bootScript = `(function(){var m=location.pathname.match(/^\\/admin\\/(posts|newsletters)\\/?$/);if(!m)return;window.__deskBoot={section:m[1],response:fetch(${JSON.stringify(`${API_URL}/admin/newsletters/bootstrap?section=`)}+m[1],{credentials:"include",cache:"no-store",signal:AbortSignal.timeout(15000)}).catch(function(){return null})}})()`

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-site">{API_URL ? <><link rel="preconnect" href={API_URL} crossOrigin="use-credentials" /><script dangerouslySetInnerHTML={{ __html: bootScript }} /></> : null}{children}</div>
}
