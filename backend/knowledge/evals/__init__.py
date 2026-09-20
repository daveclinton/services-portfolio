"""Retrieval evaluation harness (Phase 10).

A hand-written question set lives in ``questions.json`` next to this module.
Each question declares what a correct retrieval looks like (a project slug,
a company slug, a skill slug, a source path, or a phrase that must appear).
The harness runs every question through the retrieval layer and reports:

* **hit@k** — did at least one expected source appear in the top *k*?
* **recall@k** — what fraction of the expected sources appeared?
* **MRR** — mean reciprocal rank of the first correct hit.

This is deliberately LLM-free: it measures retrieval, which is the part you
can tune. Generation quality is downstream of it.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

from knowledge.retrieval.service import SearchResult, search

DEFAULT_QUESTIONS_PATH = Path(__file__).resolve().parent / "questions.json"

#: Expectation keys mapped onto the ``KnowledgeChunk`` field they check.
FIELD_EXPECTATIONS = {
    "project_slug": "project_slug",
    "company_slug": "company_slug",
    "skill_slug": "skill_slug",
    "source_path": "source_path",
}


@dataclass(frozen=True)
class EvalQuestion:
    id: str
    question: str
    expect: dict[str, list[str]]
    tags: tuple[str, ...] = ()
    notes: str = ""

    @property
    def expected_units(self) -> int:
        return sum(len(values) for values in self.expect.values())


@dataclass
class QuestionOutcome:
    question: EvalQuestion
    hit: bool
    reciprocal_rank: float
    recall: float
    first_rank: int | None
    missing: list[str] = field(default_factory=list)


@dataclass
class ModeReport:
    mode: str
    k: int
    outcomes: list[QuestionOutcome]

    @property
    def hit_rate(self) -> float:
        if not self.outcomes:
            return 0.0
        return sum(1 for outcome in self.outcomes if outcome.hit) / len(self.outcomes)

    @property
    def recall(self) -> float:
        if not self.outcomes:
            return 0.0
        return sum(outcome.recall for outcome in self.outcomes) / len(self.outcomes)

    @property
    def mrr(self) -> float:
        if not self.outcomes:
            return 0.0
        return sum(outcome.reciprocal_rank for outcome in self.outcomes) / len(
            self.outcomes
        )

    @property
    def misses(self) -> list[QuestionOutcome]:
        return [outcome for outcome in self.outcomes if not outcome.hit]

    def as_dict(self) -> dict:
        return {
            "mode": self.mode,
            "k": self.k,
            "questions": len(self.outcomes),
            "hit_rate": round(self.hit_rate, 4),
            "recall": round(self.recall, 4),
            "mrr": round(self.mrr, 4),
            "misses": [outcome.question.id for outcome in self.misses],
        }


def load_questions(path: str | Path | None = None) -> list[EvalQuestion]:
    """Load and validate the question set."""
    source = Path(path) if path else DEFAULT_QUESTIONS_PATH
    payload = json.loads(source.read_text(encoding="utf-8"))
    questions = []
    seen: set[str] = set()
    for raw in payload["questions"]:
        question = EvalQuestion(
            id=raw["id"],
            question=raw["question"],
            expect={
                key: list(values) for key, values in (raw.get("expect") or {}).items()
            },
            tags=tuple(raw.get("tags") or ()),
            notes=raw.get("notes", ""),
        )
        if question.id in seen:
            raise ValueError(f"duplicate question id: {question.id}")
        if not question.expect:
            raise ValueError(f"question {question.id} has no expectations")
        known = set(FIELD_EXPECTATIONS) | {"strings"}
        unknown = set(question.expect) - known
        if unknown:
            raise ValueError(
                f"question {question.id} uses unknown expectation keys: "
                f"{', '.join(sorted(unknown))}"
            )
        seen.add(question.id)
        questions.append(question)
    return questions


def _found_units(results: Iterable[SearchResult], expect: dict[str, list[str]]) -> set[str]:
    """Which expected values appeared in the retrieved results."""
    found: set[str] = set()
    results = list(results)
    for key, values in expect.items():
        if key == "strings":
            for needle in values:
                lowered = needle.lower()
                for result in results:
                    if lowered in result.chunk.content.lower():
                        found.add(f"strings:{needle}")
                        break
            continue
        field_name = FIELD_EXPECTATIONS[key]
        actual = {
            getattr(result.chunk, field_name)
            for result in results
            if getattr(result.chunk, field_name)
        }
        for value in values:
            if value in actual:
                found.add(f"{key}:{value}")
    return found


def evaluate_question(
    question: EvalQuestion,
    *,
    mode: str,
    k: int,
    client: Any | None = None,
) -> QuestionOutcome:
    outcome = search(question.question, mode=mode, limit=k, client=client)
    results = outcome.results
    found = _found_units(results, question.expect)

    first_rank: int | None = None
    for result in results:
        if _found_units([result], question.expect):
            first_rank = result.rank
            break

    expected_units = question.expected_units
    expected_labels = {
        f"{key}:{value}"
        for key, values in question.expect.items()
        for value in values
    }
    return QuestionOutcome(
        question=question,
        hit=first_rank is not None,
        reciprocal_rank=(1.0 / first_rank) if first_rank else 0.0,
        recall=(len(found) / expected_units) if expected_units else 0.0,
        first_rank=first_rank,
        missing=sorted(expected_labels - found),
    )


def evaluate(
    questions: list[EvalQuestion],
    *,
    mode: str = "hybrid",
    k: int = 5,
    client: Any | None = None,
) -> ModeReport:
    return ModeReport(
        mode=mode,
        k=k,
        outcomes=[
            evaluate_question(question, mode=mode, k=k, client=client)
            for question in questions
        ],
    )
