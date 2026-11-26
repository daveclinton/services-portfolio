import { API_URL } from "./ai-client"

export type StudioSession = { configured: boolean; authenticated: boolean; csrf: string; login: string }
export type NewsletterDraft = {
  id: string; subject: string; markdown: string; revision: number
  state: "draft" | "error" | "checking" | "scheduled" | "sending" | "sent" | "stopped"
  campaign_id: number; scheduled_at: string | null; tested_revision: number; last_error: string; updated_at: string
  kind?: "post" | "newsletter"; slug?: string; description?: string; published_revision?: number; legacy?: boolean; cache_invalidated?: boolean; recipients?: string[] | null
}
export type StudioMeta = { sender: { name: string; email: string }; audience: string; subscribers: number; test_email: string; timezone: string }
export const STUDIO_SUBJECT_LIMIT = 180
export const STUDIO_BODY_LIMIT = 40_000
export const studioLoginURL = `${API_URL}/admin/newsletters/auth/login`

export type PublishedStudioPost = { slug: string; title: string; description: string; date: string }

async function request(path: string, csrf?: string, body?: Record<string, unknown> | FormData): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`${API_URL}/admin/newsletters/${path}`, {
      method: body ? "POST" : "GET", credentials: "include", cache: "no-store", signal: controller.signal,
      ...(body ? { headers: { ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }), "X-CSRF-Token": csrf ?? "" }, body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    })
    const value: unknown = await response.json().catch(() => null)
    const result = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
    if (!response.ok) throw new Error(typeof result?.detail === "string" ? result.detail : "The dashboard request failed. Please try again.")
    if (!result) throw new Error("The dashboard returned an incomplete response.")
    return result
  } catch (error) {
    if (controller.signal.aborted) throw new Error("That took too long. Check delivery status before trying another send.")
    if (error instanceof TypeError) throw new Error("Couldn’t connect. Check your connection and try again.")
    throw error
  } finally { clearTimeout(timeout) }
}

function draft(value: unknown): NewsletterDraft {
  if (!value || typeof value !== "object") throw new Error("Couldn’t read the saved newsletter.")
  const d = value as Record<string, unknown>
  if (typeof d.id !== "string" || !/^[0-9a-f-]{36}$/.test(d.id) || typeof d.subject !== "string" || typeof d.markdown !== "string" || !Number.isSafeInteger(d.revision) || (d.revision as number) < 1 || !["draft", "error", "checking", "scheduled", "sending", "sent", "stopped"].includes(String(d.state)) || typeof d.last_error !== "string" || typeof d.updated_at !== "string" || !Number.isSafeInteger(d.tested_revision) || !Number.isSafeInteger(d.campaign_id) || (d.scheduled_at !== null && typeof d.scheduled_at !== "string")) throw new Error("Couldn’t read the saved newsletter.")
  return d as NewsletterDraft
}
export async function studioSession(): Promise<StudioSession> {
  const result = await request("session")
  return session(result)
}
function session(result: Record<string, unknown>): StudioSession {
  if (typeof result.configured !== "boolean" || typeof result.authenticated !== "boolean" || (result.authenticated && (typeof result.csrf !== "string" || !/^[0-9a-f]{64}$/.test(result.csrf) || typeof result.login !== "string"))) throw new Error("Couldn’t verify your sign-in. Reload the dashboard.")
  return result as StudioSession
}
export type AdminDesk = { session: StudioSession; drafts: NewsletterDraft[]; posts: PublishedStudioPost[] }
type DeskSection = "posts" | "newsletters"
declare global { interface Window { __deskBoot?: { section: DeskSection; response: Promise<Response | null> } } }

// Lists live in memory only: never in storage, and cleared on sign-out.
const desks = new Map<DeskSection, AdminDesk>()
const deskRequests = new Map<DeskSection, Promise<AdminDesk>>()
const warmed = new Map<string, { version: string; at: number; value: Promise<NewsletterDraft> }>()
let generation = 0

export const studioCachedDesk = (section: DeskSection) => desks.get(section)
export function studioUpdateDesk(section: DeskSection, drafts: NewsletterDraft[]) {
  const desk = desks.get(section)
  generation++
  deskRequests.clear()
  desks.clear()
  if (desk) desks.set(section, { ...desk, drafts })
}
export function studioForget() { generation++; desks.clear(); deskRequests.clear(); warmed.clear() }

async function earlyBootstrap(section: DeskSection) {
  if (typeof window === "undefined" || window.__deskBoot?.section !== section) return null
  const early = window.__deskBoot
  delete window.__deskBoot
  const response = await early.response
  return response?.ok ? response.json().catch(() => null) as Promise<Record<string, unknown> | null> : null
}
async function loadDesk(section: DeskSection): Promise<AdminDesk> {
  const started = generation
  const result = await earlyBootstrap(section) ?? await request(`bootstrap?section=${section}`)
  if (!result.session || typeof result.session !== "object" || !Array.isArray(result.drafts) || !Array.isArray(result.posts)) throw new Error("Couldn’t load the writing desk.")
  const posts = result.posts.map((value): PublishedStudioPost => {
    if (!value || typeof value !== "object") throw new Error("Couldn’t read published posts.")
    const p=value as Record<string, unknown>
    if (typeof p.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) || typeof p.title !== "string" || typeof p.description !== "string" || typeof p.date !== "string") throw new Error("Couldn’t read published posts.")
    return p as PublishedStudioPost
  })
  const desk = { session: session(result.session as Record<string, unknown>), drafts: result.drafts.map(draft), posts }
  // A response that began before a change or sign-out must not refill the cache.
  if (started === generation) { if (desk.session.authenticated) desks.set(section, desk); else desks.delete(section) }
  return desk
}
export function studioBootstrap(section: DeskSection): Promise<AdminDesk> {
  const active = deskRequests.get(section)
  if (active) return active
  const pending = loadDesk(section).finally(() => { if (deskRequests.get(section) === pending) deskRequests.delete(section) })
  deskRequests.set(section, pending)
  return pending
}

const version = (d: NewsletterDraft) => `${d.revision}/${d.updated_at}/${d.state}`
export function studioWarm(d: NewsletterDraft) {
  const entry = warmed.get(d.id)
  if (entry && entry.version === version(d) && Date.now() - entry.at < 30_000) return
  const value = studioDraft(d.id)
  value.catch(() => warmed.delete(d.id))
  warmed.set(d.id, { version: version(d), at: Date.now(), value })
}
export async function studioOpen(d: NewsletterDraft): Promise<NewsletterDraft> {
  const entry = warmed.get(d.id)
  warmed.delete(d.id)
  if (entry && entry.version === version(d) && Date.now() - entry.at < 30_000) return entry.value.catch(() => studioDraft(d.id))
  return studioDraft(d.id)
}
export type StudioContact = { email: string; status: "subscribed" | "pending" | "suppressed"; joined_at: string; confirmed_at: string | null }
export async function studioContacts(): Promise<{ contacts: StudioContact[]; limit: number }> {
  const result = await request("contacts")
  if (!Array.isArray(result.contacts) || !Number.isSafeInteger(result.limit)) throw new Error("Couldn’t read your contacts.")
  const contacts = result.contacts.map((value): StudioContact => {
    const c = value as Record<string, unknown>
    if (!c || typeof c.email !== "string" || !["subscribed", "pending", "suppressed"].includes(String(c.status)) || typeof c.joined_at !== "string" || (c.confirmed_at !== null && typeof c.confirmed_at !== "string")) throw new Error("Couldn’t read your contacts.")
    return c as StudioContact
  })
  return { contacts, limit: result.limit as number }
}
// null sends to every confirmed subscriber; a list narrows it to those contacts.
export async function studioRecipients(csrf: string, current: NewsletterDraft, recipients: string[] | null): Promise<NewsletterDraft> {
  const result = draft(await request(`drafts/${current.id}/recipients`, csrf, { revision: current.revision, recipients }))
  const saved = result.recipients ?? null
  const wanted = recipients ? [...new Set(recipients.map((email) => email.toLowerCase()))].sort() : null
  if (result.id !== current.id || JSON.stringify(saved) !== JSON.stringify(wanted)) throw new Error("The recipients were not confirmed. Review them before sending.")
  return result
}
export type StudioRemoval = "unpublish" | "discard" | "delete"
export async function studioRemove(csrf: string, current: NewsletterDraft, action: StudioRemoval): Promise<NewsletterDraft | null> {
  const result = await request(`drafts/${current.id}/${action}`, csrf, { revision: current.revision })
  warmed.delete(current.id)
  if (action === "delete") {
    if (result.deleted !== current.id) throw new Error("Deletion was not confirmed. Reload to check this document.")
    return null
  }
  const updated = draft(result)
  if (updated.id !== current.id || (action === "unpublish" ? updated.published_revision !== 0 : updated.published_revision !== updated.revision)) throw new Error("The change was not confirmed. Reload to check this post.")
  return updated
}
// The desk tells open preview tabs when a draft is saved, so they reload.
export const PREVIEW_CHANNEL = "writing-desk-preview"
export function announceSaved(id: string) {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(PREVIEW_CHANNEL)
  channel.postMessage({ id }); channel.close()
}
export const previewPath = (id: string) => `/p/${id}`
export async function studioDraft(id: string): Promise<NewsletterDraft> { return draft(await request(`drafts/${id}`)) }
export async function studioFromPost(csrf: string, slug: string): Promise<NewsletterDraft> { return draft(await request("from-post", csrf, { slug })) }
export async function studioPublish(csrf: string, current: NewsletterDraft, slug: string, description: string): Promise<NewsletterDraft> {
  const result=draft(await request(`drafts/${current.id}/publish`,csrf,{revision:current.revision,slug,description}))
  if(result.published_revision!==current.revision || result.slug!==slug) throw new Error("Publication was not confirmed. Reload this post to check its status.")
  return result
}
// Cloudinary when it is set up: the API signs, the browser uploads directly, so
// large files never pass through the VPS. Otherwise PostgreSQL, as before.
// https://cloudinary.com/documentation/authentication_signatures
export async function studioUpload(csrf: string, file: File): Promise<string> {
  const signed = await request("media/sign", csrf, {})
  if (signed.configured === true) return cloudinaryUpload(signed, file)
  if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a PNG, JPEG or GIF of up to 5 MB, or set up Cloudinary to upload any image.")
  const data=new FormData(); data.set("file", file)
  const result=await request("media",csrf,data)
  if(typeof result.url!=="string" || !studioImageURL(result.url)) throw new Error("Couldn’t confirm the uploaded image.")
  return result.url
}
async function cloudinaryUpload(signed: Record<string, unknown>, file: File): Promise<string> {
  const cloud = signed.cloud_name, key = signed.api_key, signature = signed.signature, params = signed.params as Record<string, unknown> | undefined
  if (typeof cloud !== "string" || !/^[a-z0-9_-]+$/i.test(cloud) || typeof key !== "string" || typeof signature !== "string" || !params || typeof params.public_id !== "string" || typeof params.folder !== "string") throw new Error("Couldn’t prepare the upload. Reload and try again.")
  const data = new FormData()
  data.set("file", file); data.set("api_key", key); data.set("signature", signature)
  for (const [name, value] of Object.entries(params)) data.set(name, String(value))
  let response: Response
  try { response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: data, signal: AbortSignal.timeout(120_000) }) }
  catch { throw new Error("The upload didn’t finish. Check your connection and try again.") }
  const result = await response.json().catch(() => null) as { secure_url?: unknown; error?: { message?: unknown } } | null
  if (!response.ok) throw new Error(typeof result?.error?.message === "string" ? `Cloudinary: ${result.error.message}` : "Cloudinary declined this image. Try another file.")
  // Only an address for this upload, in this account, is accepted back.
  const url = result?.secure_url
  const expected = `https://res.cloudinary.com/${cloud}/image/upload/`
  if (typeof url !== "string" || !url.startsWith(expected) || !new RegExp(`^v\\d+/${params.folder}/${params.public_id}\\.[a-z0-9]+$`).test(url.slice(expected.length))) throw new Error("Couldn’t confirm the uploaded image.")
  return url
}
export function studioImageURL(value: string): boolean {
  try {
    const url=new URL(value)
    return !url.username && !url.password && (url.protocol==="https:" || (process.env.NODE_ENV==="development" && url.protocol==="http:" && url.origin===new URL(API_URL).origin))
  } catch {return false}
}
export async function studioDrafts(): Promise<NewsletterDraft[]> {
  const result = await request("drafts")
  if (!Array.isArray(result.drafts)) throw new Error("Couldn’t read your newsletters.")
  return result.drafts.map(draft)
}
export async function studioCreate(csrf: string, subject: string, kind: "post" | "newsletter" = "newsletter"): Promise<NewsletterDraft> { return draft(await request("drafts", csrf, { subject, kind })) }
export const STUDIO_SUMMARY_LIMIT = 300
// Posts save their summary with each change; newsletters leave it out.
export async function studioSave(csrf: string, current: NewsletterDraft, subject: string, markdown: string, description?: string): Promise<NewsletterDraft> {
  if (new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT) throw new Error("This newsletter is too long. Shorten it before saving.")
  const result = draft(await request(`drafts/${current.id}/save`, csrf, { subject, markdown, revision: current.revision, ...(description === undefined ? {} : { description }) }))
  if (result.revision !== current.revision + 1 || result.subject !== subject.trim() || result.markdown !== markdown || (description !== undefined && result.description !== description.trim())) throw new Error("The latest changes were not confirmed as saved. Reload before sending.")
  return result
}
export async function studioPreview(csrf: string, current: NewsletterDraft): Promise<{ html: string; preheader: string }> {
  const result = await request(`drafts/${current.id}/preview`, csrf, { revision: current.revision })
  if (typeof result.html !== "string" || !result.html || result.revision !== current.revision) throw new Error("Couldn’t preview the latest saved newsletter.")
  return { html: result.html, preheader: typeof result.preheader === "string" ? result.preheader : "" }
}
export async function studioMeta(): Promise<StudioMeta> {
  const result = await request("meta")
  const sender = result.sender as StudioMeta["sender"] | undefined
  if (!sender || typeof sender.name !== "string" || typeof sender.email !== "string" || !Number.isSafeInteger(result.subscribers) || (result.subscribers as number) < 0 || typeof result.audience !== "string" || typeof result.test_email !== "string" || result.timezone !== "Africa/Nairobi") throw new Error("Couldn’t verify the newsletter audience.")
  return result as StudioMeta
}
export async function studioAction(csrf: string, current: NewsletterDraft, action: "test" | "send" | "schedule" | "cancel" | "refresh", scheduledAt?: string): Promise<NewsletterDraft> {
  return draft(await request(`drafts/${current.id}/${action}`, csrf, { revision: current.revision, ...(scheduledAt ? { scheduled_at: scheduledAt } : {}) }))
}
export async function studioLogout(csrf: string): Promise<void> { await request("logout", csrf, {}); studioForget() }
export function nairobiSchedule(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Choose a date and time in Nairobi time.")
  const date = new Date(`${value}:00+03:00`)
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16) !== value) throw new Error("Choose a valid date and time.")
  if (date.getTime() <= Date.now() + 60_000) throw new Error("Choose a time at least a minute in the future.")
  return date.toISOString()
}
export function newsletterStateLabel(state: NewsletterDraft["state"]): string {
  return { draft: "Draft", error: "Needs attention", checking: "Check delivery status", scheduled: "Scheduled", sending: "Submitted for delivery", sent: "Sent", stopped: "Delivery stopped" }[state]
}
