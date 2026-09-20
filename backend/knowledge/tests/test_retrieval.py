"""Phase 6 tests: retrieval strategies, fusion and citations.

All semantic tests use a fake OpenAI client, so nothing here touches the
network or costs money.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from knowledge.models import Evidence, KnowledgeChunk, Project
from knowledge.retrieval import SearchFilters, search
from knowledge.retrieval.citations import citations_for_chunks
from knowledge.retrieval.fusion import reciprocal_rank_fusion
from knowledge.retrieval.semantic import SemanticUnavailable, search_semantic
from knowledge.retrieval.structured import search_structured
from knowledge.retrieval.text import tokenize

pytestmark = pytest.mark.django_db

DIMS = 1536


def unit_vector(axis: int) -> list[float]:
    vector = [0.0] * DIMS
    vector[axis] = 1.0
    return vector


class FakeEmbeddings:
    def __init__(self, vector: list[float]) -> None:
        self.vector = vector
        self.calls: list[tuple[list[str], str]] = []

    def create(self, input: list[str], model: str) -> Any:
        self.calls.append((list(input), model))
        return SimpleNamespace(
            data=[SimpleNamespace(embedding=self.vector) for _ in input]
        )


class FakeClient:
    def __init__(self, vector: list[float]) -> None:
        self.embeddings = FakeEmbeddings(vector)


def make_chunk(
    content: str,
    *,
    project_slug: str = "",
    company_slug: str = "",
    skill_slug: str = "",
    source_type: str = "project-overview",
    source_path: str = "",
    source_group: str = "projects",
    embedding: list[float] | None = None,
) -> KnowledgeChunk:
    return KnowledgeChunk.objects.create(
        content=content,
        source_type=source_type,
        source_path=source_path or f"knowledge/{source_group}/{content[:10]}.md",
        project_slug=project_slug,
        company_slug=company_slug,
        skill_slug=skill_slug,
        metadata={"source_group": source_group},
        embedding=embedding,
    )


# --------------------------------------------------------------------------- #
# tokenization
# --------------------------------------------------------------------------- #


def test_tokenize_drops_stopwords_and_keeps_technology_tokens():
    assert tokenize("What did he build with React Native and Node.js?") == [
        "build",
        "react",
        "native",
        "node.js",
    ]


def test_tokenize_is_deduplicated_and_ordered():
    assert tokenize("react react Native react") == ["react", "native"]


# --------------------------------------------------------------------------- #
# structured retrieval
# --------------------------------------------------------------------------- #


def test_structured_search_ranks_lexical_matches():
    make_chunk("Wrote GPU computing tutorials for Paperspace.")
    warranty = make_chunk("Built a React Native warranty app with offline sync.")

    results = search_structured("react native", limit=5)

    assert results == [warranty]


def test_structured_search_applies_filters_without_a_query():
    make_chunk("Alpha content", project_slug="alpha")
    beta = make_chunk("Beta content", project_slug="beta")

    results = search_structured("", filters=SearchFilters(project_slug=("beta",)), limit=5)

    assert results == [beta]


def test_structured_search_filters_by_source_group_from_metadata():
    project = make_chunk("shared wording", source_group="projects")
    make_chunk("shared wording", source_group="skills", source_type="skill")

    results = search_structured(
        "", filters=SearchFilters(source_group=("projects",)), limit=5
    )

    assert results == [project]


# --------------------------------------------------------------------------- #
# semantic retrieval
# --------------------------------------------------------------------------- #


def test_semantic_search_orders_by_cosine_distance():
    near = make_chunk("nearest", project_slug="near", embedding=unit_vector(0))
    far = make_chunk("farthest", project_slug="far", embedding=unit_vector(1))

    rows = search_semantic(
        "anything", client=FakeClient(unit_vector(0)), limit=5
    )

    assert [chunk for chunk, _ in rows] == [near, far]
    assert rows[0][1] == pytest.approx(0.0, abs=1e-6)
    assert rows[1][1] == pytest.approx(1.0, abs=1e-6)


def test_semantic_search_explains_when_nothing_is_embedded():
    make_chunk("no vector here")

    with pytest.raises(SemanticUnavailable) as excinfo:
        search_semantic("anything", client=FakeClient(unit_vector(0)))

    assert "embed_knowledge" in excinfo.value.reason


def test_semantic_search_surfaces_a_missing_api_key(monkeypatch):
    from knowledge.management.commands import embed_knowledge

    make_chunk("has a vector", embedding=unit_vector(0))
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(
        embed_knowledge,
        "build_client",
        lambda: (_ for _ in ()).throw(RuntimeError("no key")),
    )

    with pytest.raises(SemanticUnavailable) as excinfo:
        search_semantic("anything")

    assert "OPENAI_API_KEY" in excinfo.value.reason


# --------------------------------------------------------------------------- #
# fusion
# --------------------------------------------------------------------------- #


def test_rrf_prefers_a_document_found_by_both_strategies():
    fused = reciprocal_rank_fusion(
        {"structured": ["b", "a"], "semantic": ["a"]}
    )

    assert fused[0].key == "a"
    assert fused[0].matched_by == ("semantic", "structured")
    assert fused[1].key == "b"


def test_rrf_score_matches_the_formula():
    fused = reciprocal_rank_fusion({"structured": ["x"]}, k=60)

    assert fused[0].score == pytest.approx(1 / 61)


# --------------------------------------------------------------------------- #
# the search() entry point
# --------------------------------------------------------------------------- #


def test_hybrid_lifts_a_semantic_hit_above_a_purely_lexical_one():
    # ``lexical_only`` matches both query terms (structured rank 1) but has no
    # embedding; ``both`` matches one term (structured rank 2) and is the
    # nearest vector, so reciprocal rank fusion should put it first.
    lexical_only = make_chunk("warranty offline support notes", project_slug="lex")
    both = make_chunk("warranty app", project_slug="both", embedding=unit_vector(0))

    outcome = search(
        "warranty offline", mode="hybrid", limit=5, client=FakeClient(unit_vector(0))
    )

    assert [result.chunk.pk for result in outcome.results][:2] == [both.pk, lexical_only.pk]
    assert outcome.results[0].matched_by == ("semantic", "structured")
    assert outcome.strategies == {"structured": 2, "semantic": 1}


def test_hybrid_degrades_to_structured_with_a_note_when_semantics_unavailable():
    make_chunk("react native warranty app")

    outcome = search("react native", mode="hybrid", limit=5)

    assert len(outcome.results) == 1
    assert outcome.results[0].matched_by == ("structured",)
    assert any("embeddings" in note for note in outcome.notes)
    assert outcome.strategies["semantic"] == 0


def test_semantic_mode_returns_an_empty_result_set_with_a_note():
    make_chunk("react native warranty app")

    outcome = search("react native", mode="semantic", limit=5)

    assert outcome.results == []
    assert outcome.notes


def test_search_rejects_an_unknown_mode():
    with pytest.raises(ValueError, match="mode must be one of"):
        search("anything", mode="magic")


# --------------------------------------------------------------------------- #
# citations
# --------------------------------------------------------------------------- #


def test_citations_resolve_evidence_by_project_slug():
    project = Project.objects.create(slug="warranty", name="Warranty", overview="…")
    evidence = Evidence.objects.create(
        slug="warranty-shipped",
        claim="The warranty app shipped to both stores.",
        evidence_type="project",
        confidence="confirmed",
        title="Store shipping",
        project=project,
        source_url="https://example.com/warranty",
    )
    chunk = make_chunk("Warranty app shipped.", project_slug="warranty")

    resolved = citations_for_chunks([chunk])

    assert [row["slug"] for row in resolved[chunk.pk]] == [evidence.slug]
    assert resolved[chunk.pk][0]["source_url"] == "https://example.com/warranty"
    assert resolved[chunk.pk][0]["project_slug"] == "warranty"


def test_citations_are_empty_for_a_chunk_with_nothing_linked():
    chunk = make_chunk("An unrelated skill note.", source_group="skills", source_type="skill")

    assert citations_for_chunks([chunk]) == {chunk.pk: []}


def test_search_attaches_citations_to_results():
    project = Project.objects.create(slug="warranty", name="Warranty", overview="…")
    Evidence.objects.create(
        slug="warranty-shipped",
        claim="Shipped to the App Store and Play Store.",
        project=project,
    )
    make_chunk("Warranty app shipped to both stores.", project_slug="warranty")

    outcome = search("warranty shipped", mode="structured", limit=5)

    assert outcome.results[0].citations[0]["slug"] == "warranty-shipped"
