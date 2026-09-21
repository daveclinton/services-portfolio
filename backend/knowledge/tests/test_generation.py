"""Phase 7 tests: prompt building and streaming, with a fake OpenAI client."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from knowledge import generation
from knowledge.models import Evidence, KnowledgeChunk, Project
from knowledge.retrieval import search

pytestmark = pytest.mark.django_db


class FakeStream:
    def __init__(self, chunks: list[str]) -> None:
        self.chunks = chunks
        self.requests: list[dict] = []

    def create(self, **kwargs: Any):
        self.requests.append(kwargs)
        return [
            SimpleNamespace(
                choices=[SimpleNamespace(delta=SimpleNamespace(content=text))]
            )
            for text in self.chunks
        ]


class FakeCompletions:
    def __init__(self, chunks: list[str]) -> None:
        self.stream = FakeStream(chunks)

    def create(self, **kwargs: Any):
        return self.stream.create(**kwargs)


class FakeClient:
    def __init__(self, chunks: list[str]) -> None:
        self.chat = SimpleNamespace(completions=FakeCompletions(chunks))


def make_chunk(content: str, project_slug: str = "") -> KnowledgeChunk:
    return KnowledgeChunk.objects.create(
        content=content,
        source_type="project-overview",
        source_path=f"knowledge/projects/{project_slug or 'x'}/overview.md",
        project_slug=project_slug,
        metadata={"source_group": "projects"},
    )


def test_build_sources_numbers_the_retrieved_chunks():
    make_chunk("Warranty app shipped.", project_slug="warranty")
    make_chunk("GPU tutorials.", project_slug="paperspace")

    outcome = search("warranty", mode="structured", limit=5)
    sources = generation.build_sources(outcome.results)

    assert [source.index for source in sources] == list(range(1, len(sources) + 1))
    assert sources[0].project_slug == "warranty"


def test_profile_source_gets_more_context_than_regular_chunks():
    profile_text = "P" * 1_200
    project_text = "David " + ("X" * 1_200)
    KnowledgeChunk.objects.create(
        content=profile_text,
        source_type="person-profile",
        source_path="knowledge/person/profile.md",
        metadata={"source_group": "person"},
    )
    make_chunk(project_text, project_slug="long-project")

    outcome = search("What does David do?", mode="structured", limit=2)
    sources = generation.build_sources(outcome.results)

    profile = next(source for source in sources if source.source_type == "person-profile")
    project = next(source for source in sources if source.project_slug == "long-project")
    assert len(profile.excerpt) == 1_200
    assert len(project.excerpt) == 900


def test_system_prompt_carries_the_sources_and_the_hard_rules():
    make_chunk("Warranty app shipped.", project_slug="warranty")
    outcome = search("warranty", mode="structured", limit=5)

    sources = generation.build_sources(outcome.results)
    messages = generation.build_messages("Did he ship a warranty app?", sources)

    system = messages[0]["content"]
    assert messages[0]["role"] == "system"
    assert "[1]" in system
    assert "Answer ONLY from the numbered sources" in system
    assert "do not include source numbers" in system
    assert "Question intent:" in system
    assert messages[-1] == {
        "role": "user",
        "content": "Did he ship a warranty app?",
    }


def test_biography_prompt_tells_model_not_to_return_a_stack_inventory():
    make_chunk("David builds products with React and Rust.", project_slug="portfolio")
    outcome = search("What does David do?", mode="structured", limit=5)

    messages = generation.build_messages(
        "What does David do?", generation.build_sources(outcome.results)
    )

    system = messages[0]["content"]
    assert "Question intent: biography" in system
    assert "do not answer with a stack list" in system


def test_context_includes_confirmed_evidence_claims_not_only_markdown_body():
    project = Project.objects.create(slug="warehouse", name="Warehouse", overview="…")
    Evidence.objects.create(
        slug="warehouse-impact",
        claim="Automated delivery notes and goods issues after document scans.",
        project=project,
        confidence="confirmed",
    )
    make_chunk("Implementation notes.", project_slug="warehouse")
    outcome = search("implementation", mode="structured", limit=5)

    context = generation.format_context(generation.build_sources(outcome.results))

    assert "Verified claims:" in context
    assert "Automated delivery notes" in context


def test_history_is_included_before_the_new_question():
    sources = generation.build_sources([])
    messages = generation.build_messages(
        "and then?",
        sources,
        history=[
            {"role": "user", "content": "What did he build?"},
            {"role": "assistant", "content": "A warranty app [1]."},
        ],
    )

    assert [message["role"] for message in messages] == [
        "system",
        "user",
        "assistant",
        "user",
    ]


def test_stream_answer_yields_each_delta_in_order():
    client = FakeClient(["He ", "shipped ", "it [1]."])

    text = "".join(
        generation.stream_answer(client, model="gpt-4o-mini", messages=[])
    )

    assert text == "He shipped it [1]."
    assert client.chat.completions.stream.requests[0]["stream"] is True


def test_complete_returns_the_message_content(monkeypatch):
    class Client:
        def __init__(self) -> None:
            self.chat = SimpleNamespace(
                completions=SimpleNamespace(
                    create=lambda **kwargs: SimpleNamespace(
                        choices=[
                            SimpleNamespace(
                                message=SimpleNamespace(content="  A summary.  ")
                            )
                        ]
                    )
                )
            )

    assert generation.complete(Client(), model="m", messages=[]) == "A summary."
