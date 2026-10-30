import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { NextRequest } from "next/server"

const VISITOR_COOKIE = "portfolio_visitor"
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365
const CONCURRENCY_TTL_SECONDS = 65

type RatelimitResponse = Awaited<ReturnType<Ratelimit["limit"]>>

type LimitName = "burst" | "visitor-hour" | "visitor-day" | "ip-hour" | "global-day"

type LimitCheck = {
  name: LimitName
  result: RatelimitResponse
}

export type RateLimitGate = {
  allowed: boolean
  visitorId: string
  cookie?: string
  failed?: LimitCheck
  daily?: RatelimitResponse
}

type Limiters = {
  redis: Redis
  chat: {
    burst: Ratelimit
    visitorHour: Ratelimit
    visitorDay: Ratelimit
    ipHour: Ratelimit
    globalDay: Ratelimit
  }
  search: {
    burst: Ratelimit
    visitorDay: Ratelimit
    ipHour: Ratelimit
    globalDay: Ratelimit
  }
}

let cachedLimiters: Limiters | null = null

function bypassRateLimits(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (!process.env.UPSTASH_REDIS_REST_URL?.trim() ||
      !process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
      !process.env.RATE_LIMIT_SECRET?.trim())
  )
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function makeLimiter(
  redis: Redis,
  prefix: string,
  limit: number,
  window: "1 m" | "60 m" | "24 h",
  dynamicLimits = false,
): Ratelimit {
  return new Ratelimit({
    redis,
    prefix,
    limiter: Ratelimit.slidingWindow(limit, window),
    dynamicLimits,
    analytics: false,
  })
}

function limiters(): Limiters {
  if (cachedLimiters) return cachedLimiters
  if (!process.env.UPSTASH_REDIS_REST_URL?.trim() || !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    throw new Error("Upstash Redis credentials are not configured")
  }

  const redis = Redis.fromEnv()
  cachedLimiters = {
    redis,
    chat: {
      burst: makeLimiter(redis, "portfolio:rl:chat:burst", 3, "1 m"),
      visitorHour: makeLimiter(redis, "portfolio:rl:chat:visitor-hour", 15, "60 m"),
      visitorDay: makeLimiter(redis, "portfolio:rl:chat:visitor-day", 30, "24 h"),
      ipHour: makeLimiter(redis, "portfolio:rl:chat:ip-hour", 40, "60 m"),
      globalDay: makeLimiter(
        redis,
        "portfolio:rl:chat:global-day",
        positiveInteger(process.env.AI_GLOBAL_DAILY_LIMIT, 200),
        "24 h",
        true,
      ),
    },
    search: {
      burst: makeLimiter(redis, "portfolio:rl:search:burst", 20, "1 m"),
      visitorDay: makeLimiter(redis, "portfolio:rl:search:visitor-day", 200, "24 h"),
      ipHour: makeLimiter(redis, "portfolio:rl:search:ip-hour", 100, "60 m"),
      globalDay: makeLimiter(
        redis,
        "portfolio:rl:search:global-day",
        positiveInteger(process.env.SEARCH_GLOBAL_DAILY_LIMIT, 2000),
        "24 h",
        true,
      ),
    },
  }
  return cachedLimiters
}

function secret(): string {
  const value = process.env.RATE_LIMIT_SECRET?.trim()
  if (!value || value.length < 32) {
    throw new Error("RATE_LIMIT_SECRET must contain at least 32 characters")
  }
  return value
}

function signature(value: string): string {
  return createHmac("sha256", secret()).update(`visitor:${value}`).digest("base64url")
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function readVisitor(request: NextRequest): { id: string; cookie?: string } {
  const raw = request.cookies.get(VISITOR_COOKIE)?.value
  if (raw) {
    const separator = raw.lastIndexOf(".")
    const id = raw.slice(0, separator)
    const suppliedSignature = raw.slice(separator + 1)
    if (
      separator > 0 &&
      /^[0-9a-f-]{36}$/.test(id) &&
      suppliedSignature &&
      safeEqual(suppliedSignature, signature(id))
    ) {
      return { id }
    }
  }

  const id = randomUUID()
  const value = `${id}.${signature(id)}`
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return {
    id,
    cookie:
      `${VISITOR_COOKIE}=${value}; Path=/; Max-Age=${VISITOR_MAX_AGE}; ` +
      `HttpOnly; SameSite=Lax${secure}`,
  }
}

function clientIp(request: NextRequest, visitorId: string): string {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0]?.trim() || `unknown:${visitorId}`
  return createHmac("sha256", secret()).update(`ip:${ip}`).digest("hex")
}

async function runChecks(
  checks: Array<[LimitName, () => Promise<RatelimitResponse>]>,
): Promise<{ failed?: LimitCheck; daily?: RatelimitResponse }> {
  let daily: RatelimitResponse | undefined
  for (const [name, check] of checks) {
    const result = await check()
    if (name === "visitor-day") daily = result
    if (!result.success) return { failed: { name, result }, daily }
  }
  return { daily }
}

export async function enforceRateLimit(
  request: NextRequest,
  endpoint: "chat" | "search",
): Promise<RateLimitGate> {
  if (bypassRateLimits()) {
    return { allowed: true, visitorId: randomUUID() }
  }

  const visitor = readVisitor(request)
  const ip = clientIp(request, visitor.id)
  const configured = limiters()

  const checks: Array<[LimitName, () => Promise<RatelimitResponse>]> =
    endpoint === "chat"
      ? [
          ["burst", () => configured.chat.burst.limit(visitor.id)],
          ["visitor-hour", () => configured.chat.visitorHour.limit(visitor.id)],
          ["visitor-day", () => configured.chat.visitorDay.limit(visitor.id)],
          ["ip-hour", () => configured.chat.ipHour.limit(ip)],
          ["global-day", () => configured.chat.globalDay.limit("site")],
        ]
      : [
          ["burst", () => configured.search.burst.limit(visitor.id)],
          ["visitor-day", () => configured.search.visitorDay.limit(visitor.id)],
          ["ip-hour", () => configured.search.ipHour.limit(ip)],
          ["global-day", () => configured.search.globalDay.limit("site")],
        ]

  const outcome = await runChecks(checks)
  return {
    allowed: !outcome.failed,
    visitorId: visitor.id,
    cookie: visitor.cookie,
    ...outcome,
  }
}

export function withRateLimitHeaders(response: Response, gate: RateLimitGate): Response {
  if (gate.cookie) response.headers.append("Set-Cookie", gate.cookie)
  if (gate.daily) {
    response.headers.set("X-RateLimit-Limit", String(gate.daily.limit))
    response.headers.set("X-RateLimit-Remaining", String(gate.daily.remaining))
    response.headers.set("X-RateLimit-Reset", String(gate.daily.reset))
  }
  return response
}

export function rateLimitResponse(gate: RateLimitGate): Response {
  const failed = gate.failed!
  const retryAfter = Math.max(1, Math.ceil((failed.result.reset - Date.now()) / 1000))
  const response = Response.json(
    {
      detail: "Too many requests. Please try again shortly.",
      code: "rate_limited",
      limit: failed.name,
      retryAfter,
      challengeRequired: failed.name === "ip-hour",
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  )
  return withRateLimitHeaders(response, gate)
}

export async function acquireChatLock(visitorId: string): Promise<string | null> {
  if (bypassRateLimits()) return randomUUID()

  const token = randomUUID()
  const result = await limiters().redis.set(`portfolio:lock:chat:${visitorId}`, token, {
    nx: true,
    ex: CONCURRENCY_TTL_SECONDS,
  })
  return result === "OK" ? token : null
}

export async function releaseChatLock(visitorId: string, token: string): Promise<void> {
  if (bypassRateLimits()) return

  await limiters().redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    [`portfolio:lock:chat:${visitorId}`],
    [token],
  )
}
