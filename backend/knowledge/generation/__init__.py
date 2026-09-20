"""Grounded answer generation (Phase 7).

The model is never asked to answer from its own knowledge. It receives a
numbered list of retrieved chunks and is instructed to either cite them or
say it does not know. Everything in this module is provider-thin so the
tests can drive it with a fake OpenAI client.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Iterator

from knowledge.retrieval.service import SearchOutcome, SearchResult

DEFAULT_MODEL = "gpt-4o-mini"

#: Returned verbatim (no model call) when retrieval finds nothing to stand on.
NO_EVIDENCE_MESSAGE = (
    "I don't have verified evidence in the knowledge base that answers that. "
    "Try asking about a specific project, company, or technology from the "
    "timeline."
)

SYSTEM_PROMPT = """\
You are the portfolio assistant for {name}. You answer questions about their \
background, work and skills.

Hard rules:
1. Answer ONLY from the numbered sources below. They come from a curated \
knowledge base where every claim is tied to evidence.
2. Cite the sources you use inline with their bracketed number, e.g. [1] or \
[2][3]. Every factual sentence needs at least one citation.
3. If the sources do not contain the answer, say you don't have verified \
evidence for it and stop. Never guess.
4. Never invent employers, dates, metrics, technologies or outcomes that are \
not in the sources.
5. Write in the third person about {name}, not in their voice.
6. Be concise: 2-5 sentences unless the question asks for detail.

Sources:
{context}
"""


@dataclass(frozen=True)
class Source:
    """One numbered source handed to the model, kept for the citation event."""

    index: int
    chunk_id: int
    source_type: str
    source_path: str
    project_slug: str
    company_slug: str
    skill_slug: str
    excerpt: str
    citations: list[dict]

    def as_dict(self) -> dict:
        return {
            "index": self.index,
            "chunk_id": self.chunk_id,
            "source_type": self.source_type,
            "source_path": self.source_path,
            "project_slug": self.project_slug,
            "company_slug": self.company_slug,
            "skill_slug": self.skill_slug,
            "excerpt": self.excerpt,
            "citations": self.citations,
        }


def _excerpt(text: str, limit: int = 700) -> str:
    collapsed = " ".join((text or "").split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 1].rstrip() + "…"


def build_sources(results: Iterable[SearchResult]) -> list[Source]:
    sources = []
    for index, result in enumerate(results, start=1):
        chunk = result.chunk
        sources.append(
            Source(
                index=index,
                chunk_id=chunk.pk,
                source_type=chunk.source_type,
                source_path=chunk.source_path,
                project_slug=chunk.project_slug,
                company_slug=chunk.company_slug,
                skill_slug=chunk.skill_slug,
                excerpt=_excerpt(chunk.content),
                citations=result.citations,
            )
        )
    return sources


def format_context(sources: Iterable[Source]) -> str:
    blocks = []
    for source in sources:
        label = source.project_slug or source.company_slug or source.skill_slug
        location = f" — {label}" if label else ""
        blocks.append(
            f"[{source.index}] ({source.source_type}{location})\n{source.excerpt}"
        )
    return "\n\n".join(blocks) if blocks else "(no sources retrieved)"


def build_messages(
    question: str,
    sources: list[Source],
    *,
    person_name: str = "the candidate",
    history: list[dict] | None = None,
) -> list[dict]:
    """Assemble the chat-completions message list."""
    messages: list[dict] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(
                name=person_name, context=format_context(sources)
            ),
        }
    ]
    for turn in history or []:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": question})
    return messages


def person_name() -> str:
    from knowledge.models import Person

    person = Person.objects.order_by("id").first()
    return person.name if person else "the candidate"


def stream_answer(
    client: Any,
    *,
    model: str,
    messages: list[dict],
) -> Iterator[str]:
    """Yield answer text deltas from a streaming chat completion."""
    stream = client.chat.completions.create(
        model=model, messages=messages, stream=True, temperature=0.2
    )
    for event in stream:
        choices = getattr(event, "choices", None) or []
        if not choices:
            continue
        delta = getattr(choices[0], "delta", None)
        text = getattr(delta, "content", None) if delta is not None else None
        if text:
            yield text


def complete(
    client: Any,
    *,
    model: str,
    messages: list[dict],
) -> str:
    """Non-streaming completion, used by the job-fit narrative."""
    response = client.chat.completions.create(
        model=model, messages=messages, temperature=0.2
    )
    choices = getattr(response, "choices", None) or []
    if not choices:
        return ""
    message = getattr(choices[0], "message", None)
    return (getattr(message, "content", None) or "").strip()


def has_content(outcome: SearchOutcome) -> bool:
    """True when retrieval produced at least one chunk worth grounding on."""
    return bool(outcome.results)
