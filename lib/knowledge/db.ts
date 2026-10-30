import { neon } from "@neondatabase/serverless"

export class DatabaseUnavailable extends Error {}

type SqlClient = ReturnType<typeof neon>

let cached: SqlClient | null = null

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
