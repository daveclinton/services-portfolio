import type { NextRequest } from "next/server"

import { purgeExpiredConversationLogs } from "@/lib/conversation-logging"

export const runtime = "nodejs"
export const maxDuration = 30

export async function GET(request: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 })
  }

  try {
    const deleted = await purgeExpiredConversationLogs()
    return Response.json(
      { deleted },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Failed to purge expired conversation logs", error)
    return Response.json({ detail: "Conversation cleanup failed" }, { status: 500 })
  }
}
