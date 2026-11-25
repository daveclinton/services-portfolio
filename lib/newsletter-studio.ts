import { API_URL } from "./ai-client"

export type StudioSession = { configured: boolean; authenticated: boolean; csrf: string; login: string }
export type NewsletterDraft = {
  id: string; subject: string; markdown: string; revision: number
  state: "draft" | "error" | "checking" | "scheduled" | "sending" | "sent" | "stopped"
  campaign_id: number; scheduled_at: string | null; tested_revision: number; last_error: string; updated_at: string
}
export type StudioMeta = { sender: { name: string; email: string }; audience: string; subscribers: number; test_email: string; timezone: string }
export const STUDIO_SUBJECT_LIMIT = 180
export const STUDIO_BODY_LIMIT = 40_000
export const studioLoginURL = `${API_URL}/admin/newsletters/auth/login`

export type PublishedStudioPost = { slug: string; title: string; description: string; date: string }

export function newsletterFromPost(post: PublishedStudioPost, siteURL: string) {
  const url = new URL(`/blog/${encodeURIComponent(post.slug)}`, siteURL).href
  return { subject: post.title, markdown: `${post.description}\n\n[Read the post](<${url}>)` }
}

async function request(path: string, csrf?: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`${API_URL}/admin/newsletters/${path}`, {
      method: body ? "POST" : "GET", credentials: "include", cache: "no-store", signal: controller.signal,
      ...(body ? { headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf ?? "" }, body: JSON.stringify(body) } : {}),
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
  if (typeof result.configured !== "boolean" || typeof result.authenticated !== "boolean" || (result.authenticated && (typeof result.csrf !== "string" || !/^[0-9a-f]{64}$/.test(result.csrf) || typeof result.login !== "string"))) throw new Error("Couldn’t verify your sign-in. Reload the dashboard.")
  return result as StudioSession
}
export async function studioDrafts(): Promise<NewsletterDraft[]> {
  const result = await request("drafts")
  if (!Array.isArray(result.drafts)) throw new Error("Couldn’t read your newsletters.")
  return result.drafts.map(draft)
}
export async function studioCreate(csrf: string, subject: string): Promise<NewsletterDraft> { return draft(await request("drafts", csrf, { subject })) }
export async function studioSave(csrf: string, current: NewsletterDraft, subject: string, markdown: string): Promise<NewsletterDraft> {
  if (new TextEncoder().encode(markdown).length > STUDIO_BODY_LIMIT) throw new Error("This newsletter is too long. Shorten it before saving.")
  const result = draft(await request(`drafts/${current.id}/save`, csrf, { subject, markdown, revision: current.revision }))
  if (result.revision !== current.revision + 1 || result.subject !== subject.trim() || result.markdown !== markdown) throw new Error("The latest changes were not confirmed as saved. Reload before sending.")
  return result
}
export async function studioPreview(csrf: string, current: NewsletterDraft): Promise<string> {
  const result = await request(`drafts/${current.id}/preview`, csrf, { revision: current.revision })
  if (typeof result.html !== "string" || !result.html || result.revision !== current.revision) throw new Error("Couldn’t preview the latest saved newsletter.")
  return result.html
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
export async function studioLogout(csrf: string): Promise<void> { await request("logout", csrf, {}) }
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
