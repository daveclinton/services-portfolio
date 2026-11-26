import { API_URL } from "@/lib/ai-client"

// Ask for the desk's data while its JavaScript is still downloading. The client
// consumes this response once; a failed early request falls back to a normal one.
const bootScript = `(function(){var m=location.pathname.match(/^\\/admin\\/(posts|newsletters|contacts)\\/?$/);if(!m)return;var s=m[1]==="contacts"?"posts":m[1];window.__deskBoot={section:s,response:fetch(${JSON.stringify(`${API_URL}/admin/newsletters/bootstrap?section=`)}+s,{credentials:"include",cache:"no-store",signal:AbortSignal.timeout(15000)}).catch(function(){return null})}})()`

// Apply the saved sidebar width before the desk paints, so it never jumps.
const sidebarScript = `try{if(localStorage.getItem("desk-sidebar")==="collapsed")document.documentElement.dataset.deskSidebar="collapsed"}catch(e){}`

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-site"><script dangerouslySetInnerHTML={{ __html: sidebarScript }} />{API_URL ? <><link rel="preconnect" href={API_URL} crossOrigin="use-credentials" /><script dangerouslySetInnerHTML={{ __html: bootScript }} /></> : null}{children}</div>
}
