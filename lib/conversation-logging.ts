import { createHmac } from "node:crypto"

import type { NextRequest } from "next/server"

import { sql } from "@/lib/knowledge/db"

const DEFAULT_RETENTION_DAYS = 30

export type ConversationLogContext = {
  networkHash: string
  deviceType: string
  browserFamily: string
  osFamily: string
}

export type ConversationTurnLog = ConversationLogContext & {
  conversationId: string
  turnId: string
  question: string
  answer: string
  status: "completed" | "no_evidence" | "error"
  intent: string
  intentSource: "rules" | "model" | "fallback"
  intentConfidence: number
  model: string
  sourceCount: number
  latencyMs: number
}

function privacySecret(): string {
  const value = process.env.RATE_LIMIT_SECRET?.trim()
  if (!value || value.length < 32) {
    throw new Error("RATE_LIMIT_SECRET must contain at least 32 characters")
  }
  return value
}

function requestIp(request: NextRequest): string {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip")
  return forwarded?.split(",")[0]?.trim() || "unknown"
}

function deviceDetails(userAgent: string): Omit<ConversationLogContext, "networkHash"> {
  const deviceType = /bot|crawler|spider|slurp/i.test(userAgent)
    ? "bot"
    : /ipad|tablet/i.test(userAgent)
      ? "tablet"
      : /mobile|android|iphone/i.test(userAgent)
        ? "mobile"
        : userAgent
          ? "desktop"
          : "unknown"

  const browserFamily = /edg\//i.test(userAgent)
    ? "Edge"
    : /firefox\//i.test(userAgent)
      ? "Firefox"
      : /(?:chrome|crios)\//i.test(userAgent)
        ? "Chrome"
        : /safari\//i.test(userAgent)
          ? "Safari"
          : "Other"

  const osFamily = /android/i.test(userAgent)
    ? "Android"
    : /iphone|ipad|ipod/i.test(userAgent)
      ? "iOS"
      : /windows/i.test(userAgent)
        ? "Windows"
        : /mac os|macintosh/i.test(userAgent)
          ? "macOS"
          : /cros/i.test(userAgent)
            ? "ChromeOS"
            : /linux/i.test(userAgent)
              ? "Linux"
              : "Other"

  return { deviceType, browserFamily, osFamily }
}

/** Build coarse, pseudonymous request metadata without retaining raw IP or user-agent data. */
export function conversationLogContext(request: NextRequest): ConversationLogContext {
  const day = new Date().toISOString().slice(0, 10)
  const networkHash = createHmac("sha256", privacySecret())
    .update(`conversation-network:${day}:${requestIp(request)}`)
    .digest("hex")
  return {
    networkHash,
    ...deviceDetails(request.headers.get("user-agent") ?? ""),
  }
}

/** Store one opted-in turn and opportunistically remove expired conversations. */
export async function logConversationTurn(entry: ConversationTurnLog): Promise<void> {
  await sql().query(
    `WITH purged AS (
       DELETE FROM knowledge_aiconversation
        WHERE expires_at <= NOW()
        RETURNING id
     ), conversation AS (
       INSERT INTO knowledge_aiconversation
         (id, network_hash, device_type, browser_family, os_family,
          consent_version, consented_at, created_at, updated_at, expires_at)
       VALUES
         ($1::uuid, $2, $3, $4, $5, '2026-09-22', NOW(), NOW(), NOW(),
          NOW() + ($6::integer * INTERVAL '1 day'))
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
       RETURNING id
     )
     INSERT INTO knowledge_aiconversationturn
       (id, conversation_id, question, answer, status, intent, intent_source,
        intent_confidence, model, source_count, latency_ms, created_at)
     SELECT $7::uuid, id, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
       FROM conversation
     ON CONFLICT (id) DO NOTHING`,
    [
      entry.conversationId,
      entry.networkHash,
      entry.deviceType,
      entry.browserFamily,
      entry.osFamily,
      DEFAULT_RETENTION_DAYS,
      entry.turnId,
      entry.question,
      entry.answer,
      entry.status,
      entry.intent,
      entry.intentSource,
      entry.intentConfidence,
      entry.model,
      entry.sourceCount,
      entry.latencyMs,
    ],
  )
}

export async function purgeExpiredConversationLogs(): Promise<number> {
  const deleted = (await sql().query(
    "DELETE FROM knowledge_aiconversation WHERE expires_at <= NOW() RETURNING id",
    [],
  )) as Array<{ id: string }>
  return deleted.length
}
