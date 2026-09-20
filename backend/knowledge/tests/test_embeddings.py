"""Phase 5 tests: embed_knowledge with a fake OpenAI client (no network)."""

from __future__ import annotations

import time
from types import SimpleNamespace
from typing import Any

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from knowledge.management.commands import embed_knowledge as ek
from knowledge.models import KnowledgeChunk

pytestmark = pytest.mark.django_db

DIMS = 1536


class FlakyError(Exception):
    """Stand-in transient error (avoids building real SDK error objects)."""


class FakeEmbeddings:
    """Mimics ``client.embeddings``; records every request."""

    def __init__(
        self,
        dims: int = DIMS,
        failures_left: int = 0,
        error: Exception | None = None,
        tokens_per_batch: int = 10,
    ) -> None:
        self.calls: list[tuple[list[str], str]] = []
        self.dims = dims
        self.failures_left = failures_left
        self.error = error or FlakyError("boom")
        self.tokens_per_batch = tokens_per_batch

    def create(self, input: list[str], model: str) -> Any:
        self.calls.append((list(input), model))
        if self.failures_left > 0:
            self.failures_left -= 1
            raise self.error
        return SimpleNamespace(
            data=[
                SimpleNamespace(embedding=[0.1] * self.dims) for _ in input
            ],
            usage=SimpleNamespace(prompt_tokens=self.tokens_per_batch),
        )


class FakeClient:
    def __init__(self, embeddings: FakeEmbeddings) -> None:
        self.embeddings = embeddings


def _make_chunks(n: int, embedded: int = 0) -> None:
    for i in range(n):
        KnowledgeChunk.objects.create(
            content=f"chunk content {i}",
            source_type="evidence",
            source_path=f"knowledge/evidence/chunk-{i}.md",
            embedding=([0.5] * DIMS) if i < embedded else None,
        )


def _vectors() -> list[list[float] | None]:
    return [
        list(row.embedding) if row.embedding is not None else None
        for row in KnowledgeChunk.objects.order_by("id")
    ]


# --------------------------------------------------------------------------- #
# happy path: batching, idempotency, resume
# --------------------------------------------------------------------------- #


def test_embeds_pending_chunks_and_is_idempotent():
    _make_chunks(3)
    embeddings = FakeEmbeddings()
    stats = ek.embed_pending(
        client=FakeClient(embeddings), model=ek.DEFAULT_MODEL, batch_size=100
    )

    assert stats == {
        "embedded": 3,
        "batches": 1,
        "tokens": 10,
        "already_embedded": 0,
        "remaining": 0,
    }
    assert embeddings.calls == [
        (["chunk content 0", "chunk content 1", "chunk content 2"], ek.DEFAULT_MODEL)
    ]
    assert all(vector == [0.1] * DIMS for vector in _vectors())

    # second run: nothing left to do, no API calls
    stats = ek.embed_pending(
        client=FakeClient(embeddings), model=ek.DEFAULT_MODEL, batch_size=100
    )
    assert stats["embedded"] == 0
    assert stats["batches"] == 0
    assert stats["already_embedded"] == 3
    assert stats["remaining"] == 0
    assert len(embeddings.calls) == 1


def test_skips_already_embedded_rows_without_touching_them():
    _make_chunks(3, embedded=1)
    embeddings = FakeEmbeddings()
    stats = ek.embed_pending(
        client=FakeClient(embeddings), model=ek.DEFAULT_MODEL, batch_size=100
    )

    assert stats["embedded"] == 2
    assert stats["already_embedded"] == 1
    vectors = _vectors()
    assert vectors[0] == [0.5] * DIMS  # pre-existing vector untouched
    assert vectors[1:] == [[0.1] * DIMS, [0.1] * DIMS]


def test_splits_into_batches_and_counts_tokens():
    _make_chunks(5)
    embeddings = FakeEmbeddings(tokens_per_batch=7)
    stats = ek.embed_pending(
        client=FakeClient(embeddings), model=ek.DEFAULT_MODEL, batch_size=2
    )

    assert stats["embedded"] == 5
    assert stats["batches"] == 3
    assert stats["tokens"] == 21
    assert [len(texts) for texts, _ in embeddings.calls] == [2, 2, 1]


def test_limit_caps_the_run_and_leaves_the_rest():
    _make_chunks(5)
    stats = ek.embed_pending(
        client=FakeClient(FakeEmbeddings()),
        model=ek.DEFAULT_MODEL,
        batch_size=100,
        limit=3,
    )

    assert stats["embedded"] == 3
    assert stats["remaining"] == 2


# --------------------------------------------------------------------------- #
# failure handling
# --------------------------------------------------------------------------- #


def test_retries_a_transient_error_then_succeeds(monkeypatch):
    monkeypatch.setattr(ek, "TRANSIENT_ERRORS", (FlakyError,))
    sleeps: list[float] = []
    monkeypatch.setattr(time, "sleep", sleeps.append)
    _make_chunks(2)
    embeddings = FakeEmbeddings(failures_left=1)

    stats = ek.embed_pending(
        client=FakeClient(embeddings), model=ek.DEFAULT_MODEL, batch_size=100
    )

    assert stats["embedded"] == 2
    assert len(embeddings.calls) == 2
    assert len(sleeps) == 1


def test_gives_up_after_max_attempts_and_writes_nothing(monkeypatch):
    monkeypatch.setattr(ek, "TRANSIENT_ERRORS", (FlakyError,))
    monkeypatch.setattr(ek, "MAX_ATTEMPTS", 3)
    monkeypatch.setattr(time, "sleep", lambda seconds: None)
    _make_chunks(2)
    embeddings = FakeEmbeddings(failures_left=99)

    with pytest.raises(CommandError) as excinfo:
        ek.embed_pending(
            client=FakeClient(embeddings), model=ek.DEFAULT_MODEL, batch_size=100
        )

    assert "3 attempts" in str(excinfo.value)
    assert len(embeddings.calls) == 3
    assert KnowledgeChunk.objects.filter(embedding=None).count() == 2


def test_dimension_mismatch_fails_fast_and_writes_nothing():
    _make_chunks(2)

    with pytest.raises(CommandError) as excinfo:
        ek.embed_pending(
            client=FakeClient(FakeEmbeddings(dims=8)),
            model="text-embedding-3-large",
            batch_size=100,
        )

    assert "8 dimensions" in str(excinfo.value)
    assert "1536" in str(excinfo.value)
    assert KnowledgeChunk.objects.filter(embedding=None).count() == 2


def test_real_sdk_rate_limit_error_is_treated_as_transient():
    import openai

    assert openai.RateLimitError in ek.TRANSIENT_ERRORS
    assert openai.APIConnectionError in ek.TRANSIENT_ERRORS
    assert openai.APITimeoutError in ek.TRANSIENT_ERRORS


def test_missing_api_key_fails_with_guidance(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(CommandError) as excinfo:
        ek.build_client()

    assert "OPENAI_API_KEY" in str(excinfo.value)


# --------------------------------------------------------------------------- #
# command surface
# --------------------------------------------------------------------------- #


def test_dry_run_reports_without_key_or_writes(monkeypatch, capsys):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    _make_chunks(3, embedded=1)

    call_command("embed_knowledge", "--dry-run")

    out = capsys.readouterr().out
    assert "DRY RUN" in out
    assert "chunks needing embeddings: 2" in out
    assert "already embedded (skipped): 1" in out
    assert KnowledgeChunk.objects.filter(embedding=None).count() == 2


def test_rejects_non_positive_batch_size():
    with pytest.raises(CommandError):
        call_command("embed_knowledge", "--batch-size", "0")
