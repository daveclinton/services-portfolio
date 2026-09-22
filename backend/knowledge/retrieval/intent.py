"""Question intent detection and intent-aware result ordering.

This is deliberately deterministic.  Broad portfolio questions need different
sources from technology, rate, project, or impact questions; asking the LLM to
repair a poor retrieval set is too late because it can only see those sources.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import TYPE_CHECKING, Iterable

from knowledge.models import Evidence, KnowledgeChunk

if TYPE_CHECKING:
    from .service import SearchResult


@dataclass(frozen=True)
class QuestionIntent:
    name: str
    guidance: str
    anchor_paths: tuple[str, ...] = ()


GENERAL = QuestionIntent(
    "general",
    "Answer the exact question directly and use only relevant retrieved facts.",
)

INTENTS = {
    "biography": QuestionIntent(
        "biography",
        "Lead with David's professional identity and the kinds of problems he solves. "
        "Summarize representative verified contributions and outcomes. Mention a "
        "technology only when it clarifies a contribution; do not answer with a stack list.",
        ("knowledge/person/profile.md",),
    ),
    "rates": QuestionIntent(
        "rates",
        "State the applicable rates precisely, distinguish direct and marketplace "
        "rates, and avoid unrelated career or technology detail.",
        (
            "knowledge/evidence/contracting-rate-2026.md",
            "knowledge/person/profile.md",
        ),
    ),
    "experience": QuestionIntent(
        "experience",
        "Prioritize roles, companies, responsibilities, dates and contributions. "
        "Use projects and technologies only as supporting detail.",
        ("knowledge/person/profile.md",),
    ),
    "projects": QuestionIntent(
        "projects",
        "Prioritize named products, the problem each solved, David's contribution, "
        "delivery status and verified outcomes over raw technology inventories.",
    ),
    "skills": QuestionIntent(
        "skills",
        "Describe capabilities in terms of demonstrated work and representative "
        "evidence, not an unexplained keyword list.",
    ),
    "technologies": QuestionIntent(
        "technologies",
        "Answer with the relevant languages, frameworks, platforms or tools, grouped "
        "by purpose and tied to verified usage where useful.",
    ),
    "outcomes": QuestionIntent(
        "outcomes",
        "Lead with measurable or operational results and clearly distinguish exact "
        "metrics from qualitative outcomes.",
    ),
}


def _matches(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(pattern, text) for pattern in patterns)


def classify_question(question: str) -> QuestionIntent:
    """Classify common portfolio questions without an additional model call."""
    text = " ".join(question.lower().split())

    ordered_patterns = (
        (
            "rates",
            (
                r"\b(rate|rates|pricing|price|cost|charge|salary|compensation)\b",
                r"\bhow much\b",
            ),
        ),
        (
            "outcomes",
            (
                r"\b(impact|outcome|outcomes|result|results|metric|metrics)\b",
                r"\b(how many|improve[ds]?|automate[ds]?|saved|grew|growth)\b",
            ),
        ),
        (
            "technologies",
            (
                r"\b(tech stack|technology|technologies|framework|frameworks)\b",
                r"\b(language|languages|tool|tools|database|databases)\b",
                r"\b(react|next\.js|python|django|kotlin|flutter|rust|sap hana)\b",
            ),
        ),
        (
            "skills",
            (
                r"\b(skill|skills|expertise|speciali[sz]e[ds]?|capabilit(?:y|ies))\b",
                r"\b(good at|strong at|proficient|strengths?)\b",
            ),
        ),
        (
            "experience",
            (
                r"\b(experience|experiences|experiance|experiances|career|employment|employer|company|companies|role|roles)\b",
                r"\b(worked at|work history|background|where (has|did) (he|david) work(?:ed)?)\b",
            ),
        ),
        (
            "projects",
            (
                r"\b(project|projects|product|products|portfolio|built|build|shipped)\b",
                r"\b(showcase|case stud(?:y|ies))\b",
            ),
        ),
        (
            "biography",
            (
                r"\bwho is david\b",
                r"\bwhat does david do\b",
                r"\bwhat can david do\b",
                r"\btell me about david\b",
                r"\btell me about you\b",
                r"\bwho are you\b",
                r"\btell me about (him|the candidate)\b",
                r"\b(introduce|summari[sz]e|overview) david\b",
                r"^what does (he|the candidate) do\??$",
                r"^who is (he|the candidate)\??$",
            ),
        ),
    )
    for name, patterns in ordered_patterns:
        if _matches(text, patterns):
            return INTENTS[name]
    return GENERAL


def _source_priority(intent: str, chunk: KnowledgeChunk) -> int:
    source_type = chunk.source_type
    path = chunk.source_path
    if intent == "biography":
        if path == "knowledge/person/profile.md":
            return 0
        if source_type == "experience-overview":
            return 1
        if source_type == "project-overview":
            return 2
        if source_type == "experience-responsibilities":
            return 3
        if source_type == "skill":
            return 4
        if source_type in ("project-evidence", "experience-accomplishments", "evidence"):
            return 5
        if source_type == "experience-technologies":
            return 7
        return 6
    preferred = {
        "rates": ("evidence", "person-profile"),
        "experience": ("experience-overview", "experience-responsibilities"),
        "projects": ("project-overview", "project-architecture", "project-technical-decisions"),
        "skills": ("skill", "project-overview", "experience-responsibilities"),
        "technologies": ("experience-technologies", "project-overview", "skill"),
        "outcomes": ("project-evidence", "experience-accomplishments", "evidence", "project-overview"),
    }.get(intent, ())
    try:
        return preferred.index(source_type)
    except ValueError:
        return len(preferred) + 1


def rerank_for_intent(
    results: list["SearchResult"],
    intent: QuestionIntent,
    *,
    limit: int,
) -> list["SearchResult"]:
    """Add required anchors, prioritize suitable file types, and diversify."""
    # Local import avoids a module cycle with service.py.
    from .service import SearchResult

    by_id = {result.chunk.pk: result for result in results}
    anchored_ids: list[int] = []
    if intent.anchor_paths:
        anchors = KnowledgeChunk.objects.filter(
            source_path__in=intent.anchor_paths
        )
        anchors_by_path = {chunk.source_path: chunk for chunk in anchors}
        for path in intent.anchor_paths:
            chunk = anchors_by_path.get(path)
            if chunk is None:
                continue
            if chunk.pk not in by_id:
                by_id[chunk.pk] = SearchResult(
                    chunk=chunk,
                    score=1.0,
                    rank=0,
                    matched_by=("intent",),
                )
            anchored_ids.append(chunk.pk)

    metric_project_slugs: set[str] = set()
    metric_company_slugs: set[str] = set()
    if intent.name == "outcomes":
        metric_rows = Evidence.objects.filter(
            confidence="confirmed", evidence_type="metric"
        ).select_related("project", "employment__company")
        metric_project_slugs = {
            row.project.slug for row in metric_rows if row.project_id
        }
        metric_company_slugs = {
            row.employment.company.slug for row in metric_rows if row.employment_id
        }

    def metric_priority(result: "SearchResult") -> int:
        if intent.name != "outcomes":
            return 0
        chunk = result.chunk
        return 0 if (
            chunk.project_slug in metric_project_slugs
            or chunk.company_slug in metric_company_slugs
        ) else 1

    original_position = {
        result.chunk.pk: position for position, result in enumerate(results)
    }
    ordered = sorted(
        by_id.values(),
        key=lambda result: (
            0 if result.chunk.pk in anchored_ids else 1,
            anchored_ids.index(result.chunk.pk)
            if result.chunk.pk in anchored_ids
            else metric_priority(result),
            _source_priority(intent.name, result.chunk),
            original_position.get(result.chunk.pk, -1),
        ),
    )

    selected: list[SearchResult] = []
    entity_counts: Counter[str] = Counter()
    type_counts: Counter[str] = Counter()
    for result in ordered:
        chunk = result.chunk
        entity = chunk.project_slug or chunk.company_slug or chunk.skill_slug
        if intent.name == "biography" and chunk.pk not in anchored_ids:
            # A broad answer should not become eight files from one employer or
            # eight audit/evidence files of the same kind.
            if entity and entity_counts[entity] >= 1:
                continue
            caps = {
                "experience-overview": 3,
                "project-overview": 3,
                "skill": 1,
                "experience-technologies": 1,
                "project-evidence": 1,
                "evidence": 1,
            }
            if type_counts[chunk.source_type] >= caps.get(chunk.source_type, 2):
                continue
        selected.append(result)
        if entity:
            entity_counts[entity] += 1
        type_counts[chunk.source_type] += 1
        if len(selected) == limit:
            break

    # Fill any unused slots without diversity constraints.
    selected_ids = {result.chunk.pk for result in selected}
    for result in ordered:
        if len(selected) == limit:
            break
        if result.chunk.pk not in selected_ids:
            selected.append(result)
            selected_ids.add(result.chunk.pk)

    for rank, result in enumerate(selected, start=1):
        result.rank = rank
    return selected
