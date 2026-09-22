import type { ConversationTurnLog } from "@/lib/conversation-logging"

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function paragraph(value: string): string {
  return escapeHtml(value || "(no response was generated)").replaceAll("\n", "<br>")
}

/** Send the owner one private alert when an opted-in chat-window session begins. */
export async function sendConversationAlert(entry: ConversationTurnLog): Promise<void> {
  const apiKey = requiredEnv("BREVO_API_KEY")
  const recipient = requiredEnv("BREVO_ALERT_TO_EMAIL")
  const sender = process.env.BREVO_SENDER_EMAIL?.trim() || recipient
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "David Clinton Portfolio"
  const occurredAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "Africa/Nairobi",
  }).format(new Date())

  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: sender },
      to: [{ name: "David Clinton", email: recipient }],
      subject: `Ask AI: new conversation · ${entry.intent || "general"}`,
      headers: { "Idempotency-Key": `ask-ai-session-${entry.conversationId}` },
      htmlContent: `<!doctype html>
<html>
  <body style="margin:0;background:#f5f3ef;color:#171717;font-family:Arial,sans-serif">
    <main style="max-width:680px;margin:0 auto;padding:32px 20px">
      <section style="background:#fff;border:1px solid #dedbd5;border-radius:14px;padding:28px">
        <p style="margin:0 0 8px;color:#6b665e;font-size:13px">ASK AI SESSION ALERT</p>
        <h1 style="margin:0 0 12px;font-size:24px">A visitor started a conversation</h1>
        <p style="margin:0 0 24px;color:#6b665e;line-height:1.5">You will receive one email for this chat-window session. Later turns remain available in the stored conversation.</p>
        <p style="margin:0 0 8px"><strong>Opening question</strong></p>
        <p style="margin:0 0 24px;line-height:1.6">${paragraph(entry.question)}</p>
        <p style="margin:0 0 8px"><strong>Assistant response</strong></p>
        <p style="margin:0 0 24px;line-height:1.6">${paragraph(entry.answer)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#4d4943">
          <tr><td style="padding:6px 0"><strong>Status</strong></td><td>${escapeHtml(entry.status)}</td></tr>
          <tr><td style="padding:6px 0"><strong>Intent</strong></td><td>${escapeHtml(entry.intent)} (${escapeHtml(entry.intentSource)}, ${Math.round(entry.intentConfidence * 100)}%)</td></tr>
          <tr><td style="padding:6px 0"><strong>Sources</strong></td><td>${entry.sourceCount}</td></tr>
          <tr><td style="padding:6px 0"><strong>Device</strong></td><td>${escapeHtml(`${entry.deviceType} · ${entry.browserFamily} · ${entry.osFamily}`)}</td></tr>
          <tr><td style="padding:6px 0"><strong>Latency</strong></td><td>${entry.latencyMs} ms</td></tr>
          <tr><td style="padding:6px 0"><strong>Time</strong></td><td>${escapeHtml(occurredAt)}</td></tr>
          <tr><td style="padding:6px 0"><strong>Conversation</strong></td><td>${escapeHtml(entry.conversationId)}</td></tr>
        </table>
        <p style="margin:24px 0 0;color:#6b665e;font-size:12px">Stored for 30 days under the visitor's explicit consent. Raw IP addresses are not included.</p>
      </section>
    </main>
  </body>
</html>`,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`Brevo returned ${response.status}: ${detail}`)
  }
}
