"""Lexical retrieval: Postgres full-text search plus metadata filters."""

from __future__ import annotations

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector

from knowledge.models import KnowledgeChunk

from .filters import SearchFilters
from .text import tokenize


def build_query(terms: list[str]) -> SearchQuery | None:
    """OR the terms together so a chunk matching any one of them is a hit."""
    query: SearchQuery | None = None
    for term in terms:
        clause = SearchQuery(term, config="english")
        query = clause if query is None else query | clause
    return query


def search_structured(
    query: str,
    *,
    filters: SearchFilters | None = None,
    limit: int = 10,
) -> list[KnowledgeChunk]:
    """Rank chunks by full-text relevance.

    With no usable search terms this degrades to a plain filtered listing,
    which is what makes ``mode="structured"`` useful for browsing ("show me
    every chunk for the mika-warranty-app project").
    """
    filters = filters or SearchFilters()
    queryset = filters.apply(KnowledgeChunk.objects.all())

    terms = tokenize(query)
    if not terms:
        return list(queryset.order_by("id")[:limit])

    search_query = build_query(terms)
    if search_query is None:
        return list(queryset.order_by("id")[:limit])

    # Title-ish content (project overviews, evidence claims) is short and
    # dense, so weight it above long responsibility lists.
    vector = SearchVector("content", config="english", weight="A")
    return list(
        queryset.annotate(rank=SearchRank(vector, search_query))
        .filter(rank__gt=0)
        .order_by("-rank", "id")[:limit]
    )
