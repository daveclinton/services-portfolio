"""Map retrieved chunks back to the :class:`Evidence` rows that back them.

This is the whole point of the evidence layer: an answer is only as
trustworthy as the sources it can point at. Chunks carry enough metadata
(``project_slug``, ``company_slug``) to resolve their evidence without a
join table.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from django.db.models import Q

from knowledge.models import Evidence, KnowledgeChunk

#: Most trustworthy first when several rows back the same chunk.
CONFIDENCE_ORDER = {"confirmed": 0, "probable": 1, "unverified": 2}


def serialize_evidence(evidence: Evidence) -> dict:
    return {
        "slug": evidence.slug,
        "title": evidence.title or evidence.claim[:120],
        "claim": evidence.claim,
        "evidence_type": evidence.evidence_type,
        "confidence": evidence.confidence,
        "project_slug": evidence.project.slug if evidence.project_id else "",
        "company_slug": (
            evidence.employment.company.slug if evidence.employment_id else ""
        ),
        "source_url": evidence.source_url or "",
        "source_path": evidence.source_path or "",
    }


def citations_for_chunks(
    chunks: Iterable[KnowledgeChunk],
) -> dict[int, list[dict]]:
    """Return ``{chunk_id: [evidence, ...]}`` for the given chunks."""
    chunks = [chunk for chunk in chunks if chunk.pk is not None]
    if not chunks:
        return {}

    project_slugs = {chunk.project_slug for chunk in chunks if chunk.project_slug}
    company_slugs = {chunk.company_slug for chunk in chunks if chunk.company_slug}
    source_paths = {chunk.source_path for chunk in chunks if chunk.source_path}
    if not (project_slugs or company_slugs or source_paths):
        return {}

    query = Q()
    if project_slugs:
        query |= Q(project__slug__in=project_slugs)
    if company_slugs:
        query |= Q(employment__company__slug__in=company_slugs)
    if source_paths:
        query |= Q(source_path__in=source_paths)

    rows = Evidence.objects.filter(query).select_related(
        "project", "employment__company"
    )

    by_project: dict[str, list[Evidence]] = defaultdict(list)
    by_company: dict[str, list[Evidence]] = defaultdict(list)
    by_path: dict[str, list[Evidence]] = defaultdict(list)
    for row in rows:
        if row.project_id:
            by_project[row.project.slug].append(row)
        if row.employment_id:
            by_company[row.employment.company.slug].append(row)
        if row.source_path:
            by_path[row.source_path].append(row)

    resolved: dict[int, list[dict]] = {}
    for chunk in chunks:
        candidates: dict[str, Evidence] = {}
        for row in (
            by_project.get(chunk.project_slug, [])
            + by_company.get(chunk.company_slug, [])
            + by_path.get(chunk.source_path, [])
        ):
            # A standalone evidence file matched by source_path and by
            # project lands in two buckets; the slug-keyed dict dedupes it.
            candidates[row.slug] = row
        ordered = sorted(
            candidates.values(),
            key=lambda row: (CONFIDENCE_ORDER.get(row.confidence, 9), row.slug),
        )
        resolved[chunk.pk] = [serialize_evidence(row) for row in ordered]
    return resolved
