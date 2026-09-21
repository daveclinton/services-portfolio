/**
 * Server-only Postgres access via Neon's HTTP driver.
 *
 * This module must never be imported from client components: `DATABASE_URL`
 * is a secret and only exists in the server runtime (`.env.local` locally,
 * Project → Settings → Environment Variables on Vercel).
 */

import { neon } from "@neondatabase/serverless"

export class DatabaseUnavailable extends Error {}

type SqlClient = ReturnType<typeof neon>

let cached: SqlClient | null = null

/** Tagged-template SQL client, or throws when `DATABASE_URL` is missing. */
export function sql(): SqlClient {
  if (cached) return cached
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new DatabaseUnavailable(
      "DATABASE_URL is not configured on the server, so the knowledge base cannot be queried",
    )
  }
  cached = neon(url)
  return cached
}
