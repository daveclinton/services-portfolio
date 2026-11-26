// Shared by server pages and the browser-rendered draft preview.
export function formatPostDate(date: string, month: "short" | "long" = "long") {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  })
}
