"""Searchable text from the existing, validated Markdown/frontmatter contract."""

from __future__ import annotations

import json
from typing import Any


def chunk_content(document: dict[str, Any]) -> str:
    """Keep prose and index facts that otherwise exist only in YAML.

    Confidence labels stay next to evidence claims. Source paths remain in
    metadata rather than becoming search terms or public answer text.
    """
    raw = document["raw"]
    fields = (
        "name", "title", "location", "role", "company_name", "company",
        "project", "start_date", "end_date", "experience_years",
        "specializations", "career_focus", "problem", "context", "category",
        "technologies", "skills", "projects", "challenges", "solutions",
        "results", "github_url", "demo_url", "docs_url", "website",
        "claim", "confidence", "evidence_type", "description", "source_url",
        "verified_at",
    )
    facts = {key: raw[key] for key in fields if key in raw and raw[key] != ""}
    for key in ("claims", "accomplishments"):
        if key in raw:
            facts[key] = [
                {
                    "claim": item["claim"],
                    "confidence": item.get("confidence", "confirmed"),
                    **{field: item[field] for field in (
                        "title", "description", "evidence_type", "source_url", "verified_at"
                    ) if item.get(field)},
                }
                for item in raw[key]
            ]
    parts = [document["body"].strip()]
    if facts:
        parts.append("Recorded facts:\n" + json.dumps(facts, ensure_ascii=False, indent=2, default=str))
    return "\n\n".join(part for part in parts if part)
