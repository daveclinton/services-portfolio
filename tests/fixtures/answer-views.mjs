export function answerViewFixture(kind = "projects") {
  const evidence = [{ id: 1, title: "Order integration", excerpt: "David connected order processing with SAP Business One and kept uncertain matches for review.", links: [{ title: "Published work", url: "https://example.com/project", verified_at: "2026-11-24" }] }]
  const item = (id, title) => ({ id, title, summary: "Published contribution with a bounded outcome.", detail: "The integration keeps uncertain records for human review.", period: kind === "timeline" ? "2024–2026" : "", status: kind === "scope" ? "proposed" : "context", source_ids: [1] })
  const items = kind === "scope" ? ["goal", "release", "data", "relevant", "questions", "next"].map((id) => item(id, id))
    : [item("orders", "Order processing"), item("sap", "SAP Business One")]
  if (kind === "comparison") items.forEach((row) => { row.status = "related" })
  return { kind, title: "Explore the answer", items, evidence,
    connections: kind === "architecture" ? [{ from: "orders", to: "sap", label: "Documented order integration", source_ids: [1] }] : [],
    follow_ups: [{ label: "Review the integration", prompt: "Explain the documented order integration." }, { label: "Validate gaps", prompt: "What remains unverified?" }],
  }
}
