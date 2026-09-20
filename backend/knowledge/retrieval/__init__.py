"""Retrieval over the knowledge base (Phase 6).

Three strategies, no LLM involved:

* ``structured`` — Postgres full-text search plus explicit metadata filters
  (``source_type``, ``project_slug``, ``company_slug``, ``skill_slug``).
* ``semantic`` — cosine distance over ``KnowledgeChunk.embedding`` using a
  query vector from the OpenAI embeddings API.
* ``hybrid`` — reciprocal rank fusion (RRF) of the two, which is the default
  because it is the most robust: lexical hits cover exact technology names
  and semantic hits cover paraphrases.

Public entry point::

    from knowledge.retrieval import search

    outcome = search("what did he build with React Native?", mode="hybrid")
    for result in outcome.results:
        print(result.rank, result.score, result.chunk.source_path)
"""

from .filters import SearchFilters
from .service import SearchOutcome, SearchResult, search

__all__ = ["SearchFilters", "SearchOutcome", "SearchResult", "search"]
