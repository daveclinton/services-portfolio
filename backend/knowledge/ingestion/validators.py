"""Frontmatter schemas and validation for the knowledge base.

The authoring contract is documented in ``knowledge/docs/frontmatter-contract.md``.

Why pydantic (v2) instead of hand-written dataclasses:

* every schema is a short, declarative statement of the contract, so the code
  and the documentation can be compared at a glance;
* ``extra="forbid"`` rejects typo'd keys (``company_namee``) instead of
  silently ignoring them, which is the failure mode that hurts a
  human-authored knowledge base the most;
* validation errors are reported per field, which is what lets us build the
  "file path + missing keys" message the management command promises;
* YAML already gives us dates, integers and lists, so we need *checking* with
  good error aggregation more than parsing, and that is exactly pydantic's
  strength.
"""

from __future__ import annotations

import datetime as dt
from typing import Annotated, Literal, Union

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationError,
    model_validator,
)

from .errors import KnowledgeIngestionError, Problem

#: Slugs are the natural keys used for upserts, so they are validated up front.
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
SLUG_MAX_LENGTH = 50  # matches Django's default SlugField max_length
SlugString = Annotated[
    str,
    StringConstraints(pattern=SLUG_PATTERN, min_length=1, max_length=SLUG_MAX_LENGTH),
]

Confidence = Literal["confirmed", "probable", "unverified"]


class StrictModel(BaseModel):
    """Base class: unknown keys are errors, strings are trimmed."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CatalogEntry(StrictModel):
    """A skill or technology written out in full (``slug`` + ``name``)."""

    slug: SlugString
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(default="", max_length=100)


#: A reference is either a bare slug (the catalog entry must already exist) or a
#: full catalog entry (it is upserted, creating the row when missing).
Reference = Union[SlugString, CatalogEntry]


class EvidenceItem(StrictModel):
    """One claim, used by ``accomplishments.md`` and ``evidence.md`` files."""

    slug: SlugString
    claim: str = Field(min_length=1)
    confidence: Confidence = "confirmed"
    source_url: str = Field(default="", max_length=200)
    source_path: str = Field(default="", max_length=500)


class PersonProfileFrontmatter(StrictModel):
    type: Literal["person-profile"]
    slug: SlugString
    name: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    location: str = Field(min_length=1, max_length=200)
    specializations: list[str] = Field(default_factory=list)
    career_focus: list[str] = Field(default_factory=list)
    experience_years: int | None = Field(default=None, ge=0, le=80)


class ExperienceOverviewFrontmatter(StrictModel):
    type: Literal["experience-overview"]
    company: SlugString
    company_name: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    start_date: dt.date
    end_date: dt.date | None = None
    website: str = Field(default="", max_length=200)
    location: str = Field(default="", max_length=200)

    @model_validator(mode="after")
    def _end_date_after_start_date(self) -> "ExperienceOverviewFrontmatter":
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class ExperienceResponsibilitiesFrontmatter(StrictModel):
    type: Literal["experience-responsibilities"]
    company: SlugString


class ExperienceProjectsFrontmatter(StrictModel):
    type: Literal["experience-projects"]
    company: SlugString
    projects: list[SlugString] = Field(min_length=1)


class ExperienceAccomplishmentsFrontmatter(StrictModel):
    type: Literal["experience-accomplishments"]
    company: SlugString
    accomplishments: list[EvidenceItem] = Field(min_length=1)


class ExperienceTechnologiesFrontmatter(StrictModel):
    type: Literal["experience-technologies"]
    company: SlugString
    technologies: list[Reference] = Field(min_length=1)


class ProjectOverviewFrontmatter(StrictModel):
    type: Literal["project-overview"]
    slug: SlugString
    name: str = Field(min_length=1, max_length=200)
    problem: str = ""
    context: str = ""
    github_url: str = Field(default="", max_length=200)
    demo_url: str = Field(default="", max_length=200)
    docs_url: str = Field(default="", max_length=200)
    skills: list[Reference] = Field(default_factory=list)
    technologies: list[Reference] = Field(default_factory=list)


class ProjectArchitectureFrontmatter(StrictModel):
    type: Literal["project-architecture"]
    project: SlugString
    challenges: list[str] = Field(default_factory=list)
    solutions: list[str] = Field(default_factory=list)


class ProjectTechnicalDecisionsFrontmatter(StrictModel):
    type: Literal["project-technical-decisions"]
    project: SlugString
    results: list[str] = Field(default_factory=list)


class ProjectEvidenceFrontmatter(StrictModel):
    type: Literal["project-evidence"]
    project: SlugString
    claims: list[EvidenceItem] = Field(min_length=1)


class SkillFrontmatter(StrictModel):
    type: Literal["skill"]
    slug: SlugString
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(default="", max_length=100)


class EvidenceFrontmatter(StrictModel):
    type: Literal["evidence"]
    slug: SlugString
    claim: str = Field(min_length=1)
    confidence: Confidence = "confirmed"
    company: SlugString | None = None
    project: SlugString | None = None
    source_url: str = Field(default="", max_length=200)
    source_path: str = Field(default="", max_length=500)


#: file type (matching the frontmatter ``type`` key) -> schema
SCHEMAS: dict[str, type[StrictModel]] = {
    "person-profile": PersonProfileFrontmatter,
    "experience-overview": ExperienceOverviewFrontmatter,
    "experience-responsibilities": ExperienceResponsibilitiesFrontmatter,
    "experience-projects": ExperienceProjectsFrontmatter,
    "experience-accomplishments": ExperienceAccomplishmentsFrontmatter,
    "experience-technologies": ExperienceTechnologiesFrontmatter,
    "project-overview": ProjectOverviewFrontmatter,
    "project-architecture": ProjectArchitectureFrontmatter,
    "project-technical-decisions": ProjectTechnicalDecisionsFrontmatter,
    "project-evidence": ProjectEvidenceFrontmatter,
    "skill": SkillFrontmatter,
    "evidence": EvidenceFrontmatter,
}


def validate_frontmatter(
    file_type: str,
    metadata: object,
    source_path: str,
) -> StrictModel:
    """Validate parsed YAML frontmatter against the schema for ``file_type``.

    Raises :class:`KnowledgeIngestionError` with the file path, the missing
    required keys and every other invalid field.
    """
    schema = SCHEMAS[file_type]
    expected_type = file_type

    if not isinstance(metadata, dict) or not metadata:
        raise KnowledgeIngestionError(
            [
                Problem(
                    source_path,
                    "no YAML frontmatter found",
                    (
                        f"the file must start with a '---' delimited YAML block declaring 'type: {expected_type}'",
                        "see knowledge/docs/frontmatter-contract.md for the exact schema",
                    ),
                )
            ]
        )

    declared_type = metadata.get("type")
    if declared_type is not None and declared_type != expected_type:
        raise KnowledgeIngestionError(
            [
                Problem(
                    source_path,
                    f"frontmatter declares type '{declared_type}' but this file must use type '{expected_type}'",
                    ("either move the file or correct the 'type' key",),
                )
            ]
        )

    try:
        return schema.model_validate(metadata)
    except ValidationError as exc:
        raise KnowledgeIngestionError(_validation_problems(exc, source_path, expected_type))


def _validation_problems(
    exc: ValidationError,
    source_path: str,
    expected_type: str,
) -> list[Problem]:
    missing: list[str] = []
    invalid: list[str] = []

    for error in exc.errors():
        location = ".".join(str(part) for part in error["loc"]) or "<frontmatter>"
        if error["type"] == "missing":
            missing.append(location)
        else:
            invalid.append(f"{location}: {error['msg']}")

    details: list[str] = []
    if missing:
        label = "missing required key" if len(missing) == 1 else "missing required keys"
        details.append(f"{label}: {', '.join(sorted(missing))}")
    details.extend(invalid)
    details.append("see knowledge/docs/frontmatter-contract.md for the exact schema")

    return [
        Problem(
            source_path,
            f"invalid frontmatter for type '{expected_type}'",
            tuple(details),
        )
    ]
