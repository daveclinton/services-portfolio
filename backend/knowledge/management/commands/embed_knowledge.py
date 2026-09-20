"""``manage.py embed_knowledge`` — fill NULL KnowledgeChunk embeddings.

Walks ``KnowledgeChunk`` rows where ``embedding IS NULL`` in id order and
embeds them with the OpenAI embeddings API::

    python manage.py embed_knowledge
    python manage.py embed_knowledge --batch-size 50 --model text-embedding-3-small
    python manage.py embed_knowledge --limit 200
    python manage.py embed_knowledge --dry-run

Properties:

* idempotent — rows that already have an embedding are skipped, so
  re-running only processes what is left;
* resumable — every batch is written back immediately, so interrupting
  the run (Ctrl-C) loses at most the in-flight batch;
* rate-limit aware — transient errors (429s, timeouts, connection
  resets, 5xx) are retried with exponential backoff before giving up.

Needs ``OPENAI_API_KEY`` in the environment (see ``.env.example``).
``--dry-run`` counts the work and estimates the cost without calling
the API, so it works with no key configured.
"""

from __future__ import annotations

import time
from typing import Any

import openai
from django.core.management.base import BaseCommand, CommandError

from knowledge.models import KnowledgeChunk

DEFAULT_MODEL = "text-embedding-3-small"
DEFAULT_BATCH_SIZE = 100

#: Must match ``KnowledgeChunk.embedding`` (``VectorField(dimensions=1536)``).
EXPECTED_DIMENSIONS = 1536

#: USD per million tokens (OpenAI list prices, for the cost line only).
PRICE_PER_MTOK = {
    "text-embedding-3-small": 0.02,
    "text-embedding-3-large": 0.13,
    "text-embedding-ada-002": 0.10,
}

MAX_ATTEMPTS = 5
BACKOFF_BASE_SECONDS = 2.0

TRANSIENT_ERRORS = (
    openai.RateLimitError,
    openai.APIConnectionError,
    openai.APITimeoutError,
    openai.InternalServerError,
)


class Command(BaseCommand):
    help = (
        "Embed KnowledgeChunk rows with NULL embeddings via the OpenAI "
        "embeddings API. Idempotent and resumable; needs OPENAI_API_KEY."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--batch-size",
            dest="batch_size",
            type=int,
            default=DEFAULT_BATCH_SIZE,
            metavar="N",
            help=f"texts per API request (default: {DEFAULT_BATCH_SIZE})",
        )
        parser.add_argument(
            "--model",
            dest="model",
            default=DEFAULT_MODEL,
            metavar="MODEL",
            help=f"embedding model (default: {DEFAULT_MODEL})",
        )
        parser.add_argument(
            "--limit",
            dest="limit",
            type=int,
            default=None,
            metavar="N",
            help="embed at most N chunks this run (default: no limit)",
        )
        parser.add_argument(
            "--dry-run",
            dest="dry_run",
            action="store_true",
            help="count the pending chunks and estimate the cost; "
            "make no API calls and write nothing",
        )

    def handle(self, *args, **options) -> None:
        batch_size = options["batch_size"]
        if batch_size < 1:
            raise CommandError("--batch-size must be at least 1")

        if options["dry_run"]:
            self.stdout.write(self._dry_run_report(batch_size, options["limit"]))
            return

        client = build_client()
        stats = embed_pending(
            client=client,
            model=options["model"],
            batch_size=batch_size,
            limit=options["limit"],
        )
        self.stdout.write(self._render(options["model"], batch_size, stats))

    def _dry_run_report(self, batch_size: int, limit: int | None) -> str:
        pending = list_pending(limit)
        chars = sum(len(chunk.content) for chunk in pending)
        batches = (len(pending) + batch_size - 1) // batch_size if pending else 0
        lines = [
            "Embeddings — DRY RUN (no API calls, nothing written)",
            f"chunks needing embeddings: {len(pending)} "
            f"(~{chars // 4:,} tokens) in {batches} request(s)",
            f"already embedded (skipped): {count_embedded()}",
        ]
        price = PRICE_PER_MTOK.get(DEFAULT_MODEL)
        if price is not None:
            lines.append(f"estimated cost: ≈${chars / 4 / 1_000_000 * price:.4f}")
        lines.append("dry run: nothing was written and no API calls were made")
        return "\n".join(lines)

    def _render(self, model: str, batch_size: int, stats: dict[str, Any]) -> str:
        lines = [
            f"Embeddings — model: {model} — batch size: {batch_size}",
            f"chunks embedded: {stats['embedded']} "
            f"({stats['batches']} batches, {stats['tokens']:,} tokens"
            + (
                f", ≈${stats['tokens'] / 1_000_000 * PRICE_PER_MTOK[model]:.4f}"
                if model in PRICE_PER_MTOK
                else ""
            )
            + ")",
            f"already embedded (skipped): {stats['already_embedded']}",
            f"remaining with NULL embedding: {stats['remaining']}",
        ]
        return "\n".join(lines)


def build_client() -> openai.OpenAI:
    """Construct the API client, failing fast with a helpful message."""
    try:
        return openai.OpenAI()
    except openai.OpenAIError as exc:
        raise CommandError(
            "cannot create the OpenAI client: "
            f"{exc} — set OPENAI_API_KEY in portfolio/backend/.env "
            "(see .env.example)"
        )


def list_pending(limit: int | None = None) -> list[KnowledgeChunk]:
    """Chunks still needing an embedding, oldest first."""
    queryset = KnowledgeChunk.objects.filter(embedding=None).order_by("id")
    if limit is not None:
        queryset = queryset[:limit]
    return list(queryset)


def count_embedded() -> int:
    return KnowledgeChunk.objects.exclude(embedding=None).count()


def embed_pending(
    *,
    client: openai.OpenAI,
    model: str,
    batch_size: int,
    limit: int | None = None,
) -> dict[str, int]:
    """Embed every pending chunk; return run statistics.

    Each batch is requested and written back before the next one starts,
    so an interrupted run can simply be re-run to continue where it left
    off. Raises :class:`CommandError` on bad credentials, dimension
    mismatches, or exhausted retries.
    """
    already_embedded = count_embedded()
    pending = list_pending(limit)
    embedded = 0
    batches = 0
    tokens = 0

    for start in range(0, len(pending), batch_size):
        batch = pending[start : start + batch_size]
        response = _create_with_retry(
            client, [chunk.content for chunk in batch], model
        )
        vectors = [list(item.embedding) for item in response.data]
        if len(vectors) != len(batch):
            raise CommandError(
                f"embedding API returned {len(vectors)} vectors "
                f"for {len(batch)} texts; nothing from this batch was written"
            )
        for chunk, vector in zip(batch, vectors):
            _check_dimensions(vector, model)
            chunk.embedding = vector
            chunk.save(update_fields=["embedding"])
        embedded += len(batch)
        batches += 1
        tokens += _prompt_tokens(response)

    return {
        "embedded": embedded,
        "batches": batches,
        "tokens": tokens,
        "already_embedded": already_embedded,
        "remaining": KnowledgeChunk.objects.filter(embedding=None).count(),
    }


def _create_with_retry(
    client: openai.OpenAI, texts: list[str], model: str
) -> Any:
    """One embeddings request with exponential backoff on transient errors."""
    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        if attempt > 1:
            time.sleep(BACKOFF_BASE_SECONDS * 2 ** (attempt - 2))
        try:
            return client.embeddings.create(input=texts, model=model)
        except openai.AuthenticationError as exc:
            raise CommandError(
                f"OpenAI rejected the API key: {exc} — check OPENAI_API_KEY"
            )
        except TRANSIENT_ERRORS as exc:
            last_error = exc
    raise CommandError(
        f"embedding API still failing after {MAX_ATTEMPTS} attempts "
        f"({last_error}); re-run to resume — written batches are kept"
    )


def _check_dimensions(vector: list[float], model: str) -> None:
    if len(vector) != EXPECTED_DIMENSIONS:
        raise CommandError(
            f"model {model} returned {len(vector)} dimensions but "
            f"KnowledgeChunk.embedding needs {EXPECTED_DIMENSIONS}; "
            "nothing from this batch was written"
        )


def _prompt_tokens(response: Any) -> int:
    usage = getattr(response, "usage", None)
    return int(getattr(usage, "prompt_tokens", 0) or 0)
