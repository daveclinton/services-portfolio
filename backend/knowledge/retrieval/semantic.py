"""Vector retrieval over ``KnowledgeChunk.embedding``.

The query is embedded with the same model family used by
``manage.py embed_knowledge``. Everything here is optional at runtime: if no
chunks have embeddings, or ``OPENAI_API_KEY`` is missing, callers get a
:class:`SemanticUnavailable` and the hybrid strategy falls back to lexical
search rather than failing the request.
"""

from __future__ import annotations

from typing import Any

from pgvector.django import CosineDistance

from knowledge.models import KnowledgeChunk

from .filters import SearchFilters

DEFAULT_MODEL = "text-embedding-3-small"


class SemanticUnavailable(RuntimeError):
    """Semantic search cannot run; :attr:`reason` is safe to show a caller."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def count_embedded() -> int:
    return KnowledgeChunk.objects.exclude(embedding=None).count()


def embed_query(
    query: str,
    *,
    client: Any | None = None,
    model: str = DEFAULT_MODEL,
) -> list[float]:
    """Embed a single query string, raising :class:`SemanticUnavailable`."""
    from knowledge.management.commands.embed_knowledge import (
        EXPECTED_DIMENSIONS,
        build_client,
    )

    if client is None:
        try:
            client = build_client()
        except Exception as exc:  # CommandError, or a missing key
            raise SemanticUnavailable(
                "semantic search is unavailable: OPENAI_API_KEY is not configured"
            ) from exc

    try:
        response = client.embeddings.create(input=[query], model=model)
    except Exception as exc:
        raise SemanticUnavailable(f"semantic search is unavailable: {exc}") from exc

    vector = list(response.data[0].embedding)
    if len(vector) != EXPECTED_DIMENSIONS:
        raise SemanticUnavailable(
            f"model {model} returned {len(vector)} dimensions; "
            f"KnowledgeChunk.embedding needs {EXPECTED_DIMENSIONS}"
        )
    return vector


def search_by_vector(
    vector: list[float],
    *,
    filters: SearchFilters | None = None,
    limit: int = 10,
) -> list[tuple[KnowledgeChunk, float]]:
    """Return ``(chunk, cosine_distance)`` pairs, nearest first."""
    filters = filters or SearchFilters()
    queryset = filters.apply(
        KnowledgeChunk.objects.exclude(embedding=None)
    )
    rows = (
        queryset.annotate(distance=CosineDistance("embedding", vector))
        .order_by("distance", "id")[:limit]
    )
    return [(row, float(row.distance)) for row in rows]


def search_semantic(
    query: str,
    *,
    filters: SearchFilters | None = None,
    limit: int = 10,
    client: Any | None = None,
    model: str = DEFAULT_MODEL,
) -> list[tuple[KnowledgeChunk, float]]:
    """Embed ``query`` and return the nearest chunks."""
    if count_embedded() == 0:
        raise SemanticUnavailable(
            "semantic search is unavailable: no KnowledgeChunk rows have "
            "embeddings yet (run manage.py embed_knowledge)"
        )
    vector = embed_query(query, client=client, model=model)
    return search_by_vector(vector, filters=filters, limit=limit)
