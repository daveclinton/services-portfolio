"""Explicit metadata filters for retrieval.

Filters are always applied *before* scoring. They are how callers pin a
question to a company, project or skill without relying on the text match.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from django.db.models import Q, QuerySet


def _clean(values: Iterable[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    if isinstance(values, str):
        values = [values]
    return tuple(str(value).strip() for value in values if str(value).strip())


@dataclass(frozen=True)
class SearchFilters:
    """Normalized, immutable filter set."""

    source_type: tuple[str, ...] = field(default_factory=tuple)
    source_group: tuple[str, ...] = field(default_factory=tuple)
    project_slug: tuple[str, ...] = field(default_factory=tuple)
    company_slug: tuple[str, ...] = field(default_factory=tuple)
    skill_slug: tuple[str, ...] = field(default_factory=tuple)

    @classmethod
    def from_payload(cls, payload: dict | None) -> "SearchFilters":
        payload = payload or {}
        return cls(
            source_type=_clean(payload.get("source_type")),
            source_group=_clean(payload.get("source_group")),
            project_slug=_clean(payload.get("project_slug")),
            company_slug=_clean(payload.get("company_slug")),
            skill_slug=_clean(payload.get("skill_slug")),
        )

    @property
    def is_empty(self) -> bool:
        return not any(
            (
                self.source_type,
                self.source_group,
                self.project_slug,
                self.company_slug,
                self.skill_slug,
            )
        )

    def as_dict(self) -> dict[str, list[str]]:
        return {
            "source_type": list(self.source_type),
            "source_group": list(self.source_group),
            "project_slug": list(self.project_slug),
            "company_slug": list(self.company_slug),
            "skill_slug": list(self.skill_slug),
        }

    def apply(self, queryset: QuerySet) -> QuerySet:
        """Restrict ``queryset`` to the chunks this filter set allows."""
        if self.source_type:
            queryset = queryset.filter(source_type__in=self.source_type)
        if self.source_group:
            # ``source_group`` is stored inside the JSON metadata, not as a
            # column, so it is filtered with a JSON lookup.
            group_q = Q()
            for group in self.source_group:
                group_q |= Q(metadata__source_group=group)
            queryset = queryset.filter(group_q)
        if self.project_slug:
            queryset = queryset.filter(project_slug__in=self.project_slug)
        if self.company_slug:
            queryset = queryset.filter(company_slug__in=self.company_slug)
        if self.skill_slug:
            queryset = queryset.filter(skill_slug__in=self.skill_slug)
        return queryset
