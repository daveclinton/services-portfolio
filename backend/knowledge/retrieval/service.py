"""The retrieval entry point: choose a strategy, fuse, resolve citations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from knowledge.models import KnowledgeChunk

from .citations import citations_for_chunks
from .filters import SearchFilters
from .fusion import reciprocal_rank_fusion
from .semantic import SemanticUnavailable, search_semantic
from .structured import search_structured

MODES = ("structured", "semantic", "hybrid")

#: How many candidates each strategy contributes before fusion. Fusion needs
#: a wider pool than the final limit or RRF has nothing to rerank.
CANDIDATE_MULTIPLIER = 4
MIN_CANDIDATE_POOL = 20


@dataclass
class SearchResult:
    chunk: KnowledgeChunk
    score: float
    rank: int
    matched_by: tuple[str, ...]
    structured_rank: int | None = None
    semantic_rank: int | None = None
    distance: float | None = None
    citations: list[dict] = field(default_factory=list)

    def as_dict(self, *, include_content: bool = True) -> dict:
        payload = {
            "rank": self.rank,
            "score": round(self.score, 6),
            "matched_by": list(self.matched_by),
            "structured_rank": self.structured_rank,
            "semantic_rank": self.semantic_rank,
            "distance": (
                round(self.distance, 6) if self.distance is not None else None
            ),
            "chunk_id": self.chunk.pk,
            "source_type": self.chunk.source_type,
            "source_group": self.chunk.metadata.get("source_group", ""),
            "source_path": self.chunk.source_path,
            "project_slug": self.chunk.project_slug,
            "company_slug": self.chunk.company_slug,
            "skill_slug": self.chunk.skill_slug,
            "citations": self.citations,
        }
        if include_content:
            payload["content"] = self.chunk.content
        return payload


@dataclass
class SearchOutcome:
    query: str
    mode: str
    filters: SearchFilters
    results: list[SearchResult]
    notes: list[str] = field(default_factory=list)
    strategies: dict[str, int] = field(default_factory=dict)

    @property
    def semantic_used(self) -> bool:
        return any("semantic" in result.matched_by for result in self.results)

    def as_dict(self, *, include_content: bool = True) -> dict:
        return {
            "query": self.query,
            "mode": self.mode,
            "count": len(self.results),
            "filters": self.filters.as_dict(),
            "strategies": self.strategies,
            "notes": self.notes,
            "results": [
                result.as_dict(include_content=include_content)
                for result in self.results
            ],
        }


def search(
    query: str,
    *,
    mode: str = "hybrid",
    filters: SearchFilters | dict | None = None,
    limit: int = 10,
    client: Any | None = None,
) -> SearchOutcome:
    """Retrieve the chunks that best answer ``query``.

    :param mode: ``structured``, ``semantic`` or ``hybrid``.
    :param filters: a :class:`SearchFilters` or its dict payload.
    :param client: an OpenAI client override, used by tests.
    """
    if mode not in MODES:
        raise ValueError(f"mode must be one of {', '.join(MODES)}; got {mode!r}")
    if limit < 1:
        raise ValueError("limit must be at least 1")

    if isinstance(filters, dict) or filters is None:
        filters = SearchFilters.from_payload(filters)

    pool = max(limit * CANDIDATE_MULTIPLIER, MIN_CANDIDATE_POOL)
    notes: list[str] = []
    structured_ranked: list[KnowledgeChunk] = []
    semantic_ranked: list[tuple[KnowledgeChunk, float]] = []
    distances: dict[int, float] = {}
    strategies: dict[str, int] = {}

    if mode in ("structured", "hybrid"):
        structured_ranked = search_structured(
            query, filters=filters, limit=pool
        )
        strategies["structured"] = len(structured_ranked)

    if mode in ("semantic", "hybrid"):
        try:
            semantic_ranked = search_semantic(
                query, filters=filters, limit=pool, client=client
            )
            distances = {chunk.pk: distance for chunk, distance in semantic_ranked}
            strategies["semantic"] = len(semantic_ranked)
        except SemanticUnavailable as exc:
            strategies["semantic"] = 0
            notes.append(exc.reason)
            if mode == "semantic":
                return SearchOutcome(
                    query=query,
                    mode=mode,
                    filters=filters,
                    results=[],
                    notes=notes,
                    strategies=strategies,
                )

    if mode == "structured":
        results = _from_single_ranking(
            "structured", structured_ranked, distances, None
        )
    elif mode == "semantic":
        results = _from_single_ranking(
            "semantic", [chunk for chunk, _ in semantic_ranked], distances, None
        )
    else:
        results = _fuse(structured_ranked, semantic_ranked, distances)

    results = results[:limit]
    citations = citations_for_chunks([result.chunk for result in results])
    for result in results:
        result.citations = citations.get(result.chunk.pk, [])
    return SearchOutcome(
        query=query,
        mode=mode,
        filters=filters,
        results=results,
        notes=notes,
        strategies=strategies,
    )


def _from_single_ranking(
    strategy: str,
    chunks: list[KnowledgeChunk],
    distances: dict[int, float],
    _unused: None,
) -> list[SearchResult]:
    results = []
    for rank, chunk in enumerate(chunks, start=1):
        results.append(
            SearchResult(
                chunk=chunk,
                # A single-strategy list has no fusion score, so expose a
                # monotonically decreasing one for stable client sorting.
                score=1.0 / rank,
                rank=rank,
                matched_by=(strategy,),
                structured_rank=rank if strategy == "structured" else None,
                semantic_rank=rank if strategy == "semantic" else None,
                distance=distances.get(chunk.pk),
            )
        )
    return results


def _fuse(
    structured_ranked: list[KnowledgeChunk],
    semantic_ranked: list[tuple[KnowledgeChunk, float]],
    distances: dict[int, float],
) -> list[SearchResult]:
    by_id: dict[int, KnowledgeChunk] = {}
    rankings: dict[str, list[int]] = {}
    if structured_ranked:
        rankings["structured"] = []
        for chunk in structured_ranked:
            by_id[chunk.pk] = chunk
            rankings["structured"].append(chunk.pk)
    if semantic_ranked:
        rankings["semantic"] = []
        for chunk, _distance in semantic_ranked:
            by_id[chunk.pk] = chunk
            rankings["semantic"].append(chunk.pk)

    hits = reciprocal_rank_fusion(rankings)
    results = []
    for rank, hit in enumerate(hits, start=1):
        chunk = by_id[hit.key]
        results.append(
            SearchResult(
                chunk=chunk,
                score=hit.score,
                rank=rank,
                matched_by=hit.matched_by,
                structured_rank=hit.ranks.get("structured"),
                semantic_rank=hit.ranks.get("semantic"),
                distance=distances.get(chunk.pk),
            )
        )
    return results
