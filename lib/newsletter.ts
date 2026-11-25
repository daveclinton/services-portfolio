import { API_URL } from "./ai-client"

async function newsletterRequest(path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(`${API_URL}/newsletter/${path}`, {
      method: body ? "POST" : "GET", cache: "no-store", signal: controller.signal,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    })
    const result: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 429) throw new Error("Please wait a little before trying again.")
      if (response.status === 400) throw new Error("Please check your email address and try again.")
      throw new Error("Email signup is unavailable right now. Please try again later.")
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("We couldn’t complete that request. Please try again.")
    return result as Record<string, unknown>
  } catch (error) {
    if (controller.signal.aborted) throw new Error("That took a little too long. Please try again.")
    if (error instanceof TypeError) throw new Error("We couldn’t connect. Please try again.")
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function newsletterAvailable(): Promise<boolean> {
  return (await newsletterRequest("status")).enabled === true
}

export type NewsletterStatus = "pending" | "subscribed" | "suppressed"

export async function subscribeToNewsletter(email: string, website = ""): Promise<NewsletterStatus> {
  const result = await newsletterRequest("subscribe", { email: email.trim(), consent: true, website })
  if (result.status !== "pending" && result.status !== "subscribed" && result.status !== "suppressed") throw new Error("We couldn’t confirm that request. Please try again.")
  return result.status
}
