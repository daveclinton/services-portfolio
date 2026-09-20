"""Discovery and parsing of knowledge base Markdown files.

Discovery maps file *locations* to file types (``knowledge/experience/<company>/
overview.md`` is always an ``experience-overview`` document), then each parser
validates the frontmatter and returns a normalized dictionary that the
upserters can consume without knowing anything about Markdown.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import frontmatter
import yaml

from . import validators as v
from .errors import KnowledgeIngestionError, Problem

#: The five values accepted by ``--only``.
SOURCE_TYPES: tuple[str, ...] = ("person", "experience", "projects", "skills", "evidence")


@dataclass(frozen=True)
class DocumentPattern:
    """A glob (relative to the knowledge base root) and the file type it means."""

    pattern: str
    file_type: str


DOCUMENT_PATTERNS: dict[str, tuple[DocumentPattern, ...]] = {
    "person": (DocumentPattern("knowledge/person/profile.md", "person-profile"),),
    "experience": (
        DocumentPattern("knowledge/experience/*/overview.md", "experience-overview"),
        DocumentPattern(
            "knowledge/experience/*/responsibilities.md", "experience-responsibilities"
        ),
        DocumentPattern("knowledge/experience/*/projects.md", "experience-projects"),
        DocumentPattern(
            "knowledge/experience/*/accomplishments.md", "experience-accomplishments"
        ),
        DocumentPattern(
            "knowledge/experience/*/technologies.md", "experience-technologies"
        ),
    ),
    "projects": (
        DocumentPattern("knowledge/projects/*/overview.md", "project-overview"),
        DocumentPattern("knowledge/projects/*/architecture.md", "project-architecture"),
        DocumentPattern(
            "knowledge/projects/*/technical-decisions.md", "project-technical-decisions"
        ),
        DocumentPattern("knowledge/projects/*/evidence.md", "project-evidence"),
    ),
    "skills": (DocumentPattern("knowledge/skills/*.md", "skill"),),
    "evidence": (DocumentPattern("knowledge/evidence/*.md", "evidence"),),
}


@dataclass(frozen=True)
class DiscoveredDocument:
    """A Markdown file that matches the contract."""

    path: Path
    source_path: str  # relative to the knowledge base root, posix separators
    source_group: str  # person | experience | projects | skills | evidence
    file_type: str  # person-profile | experience-overview | ...
    slug: str  # the slug implied by the file location ("" for person/profile.md)


def discover_documents(
    kb_path: Path, only: str | None = None
) -> list[DiscoveredDocument]:
    """Return every contract file in ``kb_path``, ordered by path."""
    groups = (only,) if only else SOURCE_TYPES
    documents: list[DiscoveredDocument] = []
    seen: set[str] = set()

    for group in groups:
        for spec in DOCUMENT_PATTERNS[group]:
            for path in sorted(kb_path.glob(spec.pattern)):
                if not path.is_file():
                    continue
                source_path = path.relative_to(kb_path).as_posix()
                if source_path in seen:
                    continue
                seen.add(source_path)
                documents.append(
                    DiscoveredDocument(
                        path=path,
                        source_path=source_path,
                        source_group=group,
                        file_type=spec.file_type,
                        slug=_location_slug(path, spec),
                    )
                )

    documents.sort(key=lambda document: document.source_path)
    return documents


def find_unexpected_documents(
    kb_path: Path, documents: list[DiscoveredDocument]
) -> list[str]:
    """Markdown files under ``knowledge/`` that no parser claims."""
    known = {document.source_path for document in documents}
    unexpected: list[str] = []
    for path in sorted(kb_path.glob("knowledge/**/*.md")):
        relative = path.relative_to(kb_path).as_posix()
        if relative in known or path.name in {"README.md", "AGENTS.md"}:
            continue
        unexpected.append(relative)
    return unexpected


def _location_slug(path: Path, spec: DocumentPattern) -> str:
    """Slug implied by the location: the file stem, or the parent directory."""
    return path.stem if spec.pattern.endswith("/*.md") else path.parent.name


def parse_document(document: DiscoveredDocument) -> dict[str, Any]:
    """Parse and validate one file into a normalized dictionary."""
    return _PARSERS[document.file_type](document)


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #


def _load(document: DiscoveredDocument) -> tuple[dict[str, Any], str]:
    """Return ``(frontmatter metadata, body)`` for a file."""
    try:
        post = frontmatter.load(str(document.path))
    except yaml.YAMLError as exc:
        raise KnowledgeIngestionError(
            [
                Problem(
                    document.source_path,
                    "YAML frontmatter could not be parsed",
                    (" ".join(str(exc).split()),),
                )
            ]
        )
    except UnicodeDecodeError as exc:
        raise KnowledgeIngestionError(
            [
                Problem(
                    document.source_path,
                    "file is not valid UTF-8",
                    (str(exc),),
                )
            ]
        )

    metadata = post.metadata if isinstance(post.metadata, dict) else {}
    return metadata, (post.content or "").strip()


def _base(
    document: DiscoveredDocument,
    *,
    body: str,
    metadata: dict[str, Any],
    chunk_slugs: dict[str, str] | None = None,
    **payload: Any,
) -> dict[str, Any]:
    """Common envelope every parser returns."""
    return {
        "file_type": document.file_type,
        "source_group": document.source_group,
        "source_path": document.source_path,
        "body": body,
        "raw": metadata,
        "chunk_slugs": chunk_slugs or {},
        **payload,
    }


def _validate(
    document: DiscoveredDocument, metadata: dict[str, Any]
) -> v.StrictModel:
    return v.validate_frontmatter(document.file_type, metadata, document.source_path)


def _require_body(document: DiscoveredDocument, body: str, expectation: str) -> str:
    if not body:
        raise KnowledgeIngestionError(
            [
                Problem(
                    document.source_path,
                    "the Markdown body is empty",
                    (expectation,),
                )
            ]
        )
    return body


def _reject_location_mismatch(
    document: DiscoveredDocument, key: str, declared: str
) -> None:
    if declared == document.slug:
        return
    raise KnowledgeIngestionError(
        [
            Problem(
                document.source_path,
                "frontmatter does not match the file location",
                (
                    f"frontmatter {key} is '{declared}' but the path implies '{document.slug}'",
                    "rename the directory/file or fix the frontmatter key",
                ),
            )
        ]
    )


def _bullets(items: list[str]) -> str:
    """Render a YAML list as a Markdown bullet list (stored verbatim)."""
    return "\n".join(f"- {item}" for item in items)


def _normalize_references(items: list[v.Reference]) -> list[dict[str, Any]]:
    """Normalize ``str | CatalogEntry`` references to plain dictionaries."""
    normalized: list[dict[str, Any]] = []
    for item in items:
        if isinstance(item, str):
            normalized.append({"slug": item, "name": None, "category": ""})
        else:
            normalized.append(
                {"slug": item.slug, "name": item.name, "category": item.category}
            )
    return normalized


def _coerce_verified_at(value: dt.datetime | dt.date | None) -> dt.datetime | None:
    """Normalize frontmatter ``verified_at`` to a timezone-aware datetime."""
    import datetime as _dt

    if value is None:
        return None
    if isinstance(value, _dt.datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=_dt.timezone.utc)
        return value
    return _dt.datetime(value.year, value.month, value.day, tzinfo=_dt.timezone.utc)


def _normalize_evidence(items: list[v.EvidenceItem]) -> list[dict[str, Any]]:
    return [
        {
            "slug": item.slug,
            "claim": item.claim,
            "confidence": item.confidence,
            "evidence_type": item.evidence_type,
            "title": item.title,
            "description": item.description,
            "verified_at": _coerce_verified_at(item.verified_at),
            "external_id": item.external_id,
            "source_url": item.source_url,
            "source_path": item.source_path,
        }
        for item in items
    ]


# --------------------------------------------------------------------------- #
# one parser per file type
# --------------------------------------------------------------------------- #


def parse_person_profile(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, raw_body = _load(document)
    data: v.PersonProfileFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    body = _require_body(
        document,
        raw_body,
        "knowledge/person/profile.md must contain the profile summary in its body",
    )
    return _base(
        document,
        body=body,
        metadata=metadata,
        person={
            "slug": data.slug,
            "name": data.name,
            "title": data.title,
            "location": data.location,
            "summary": body,
            "specializations": list(data.specializations),
            "career_focus": list(data.career_focus),
            "experience_years": data.experience_years,
        },
    )


def parse_experience_overview(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, body = _load(document)
    data: v.ExperienceOverviewFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "company", data.company)
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"company_slug": data.company},
        company={
            "slug": data.company,
            "name": data.company_name,
            "website": data.website,
            "description": body,
        },
        employment={
            "company_slug": data.company,
            "role": data.role,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "location": data.location,
        },
    )


def parse_experience_responsibilities(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, raw_body = _load(document)
    data: v.ExperienceResponsibilitiesFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "company", data.company)
    body = _require_body(
        document,
        raw_body,
        "write the responsibilities as a Markdown list in the body of the file",
    )
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"company_slug": data.company},
        company_slug=data.company,
        responsibilities=body,
    )


def parse_experience_projects(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, body = _load(document)
    data: v.ExperienceProjectsFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "company", data.company)
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"company_slug": data.company},
        company_slug=data.company,
        project_slugs=list(data.projects),
    )


def parse_experience_accomplishments(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, body = _load(document)
    data: v.ExperienceAccomplishmentsFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "company", data.company)
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"company_slug": data.company},
        company_slug=data.company,
        evidence=_normalize_evidence(list(data.accomplishments)),
    )


def parse_experience_technologies(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, body = _load(document)
    data: v.ExperienceTechnologiesFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "company", data.company)
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"company_slug": data.company},
        company_slug=data.company,
        technologies=_normalize_references(list(data.technologies)),
    )


def parse_project_overview(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, raw_body = _load(document)
    data: v.ProjectOverviewFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "slug", data.slug)
    body = _require_body(
        document,
        raw_body,
        "write the project overview prose in the body of the file",
    )
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"project_slug": data.slug},
        project={
            "slug": data.slug,
            "name": data.name,
            "overview": body,
            "problem": data.problem,
            "context": data.context,
            "github_url": data.github_url,
            "demo_url": data.demo_url,
            "docs_url": data.docs_url,
        },
        skill_refs=_normalize_references(list(data.skills)),
        technology_refs=_normalize_references(list(data.technologies)),
    )


def parse_project_architecture(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, raw_body = _load(document)
    data: v.ProjectArchitectureFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "project", data.project)
    body = _require_body(
        document,
        raw_body,
        "write the architecture description in the body of the file",
    )
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"project_slug": data.project},
        project_patch={
            "slug": data.project,
            "architecture": body,
            "challenges": _bullets(list(data.challenges)),
            "solutions": _bullets(list(data.solutions)),
        },
    )


def parse_project_technical_decisions(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, raw_body = _load(document)
    data: v.ProjectTechnicalDecisionsFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "project", data.project)
    body = _require_body(
        document,
        raw_body,
        "write the technical decisions in the body of the file",
    )
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"project_slug": data.project},
        project_patch={
            "slug": data.project,
            "technical_decisions": body,
            "results": _bullets(list(data.results)),
        },
    )


def parse_project_evidence(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, body = _load(document)
    data: v.ProjectEvidenceFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "project", data.project)
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"project_slug": data.project},
        project_slug=data.project,
        evidence=_normalize_evidence(list(data.claims)),
    )


def parse_skill(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, body = _load(document)
    data: v.SkillFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "slug", data.slug)
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"skill_slug": data.slug},
        skill={
            "slug": data.slug,
            "name": data.name,
            "category": data.category,
        },
    )


def parse_evidence(document: DiscoveredDocument) -> dict[str, Any]:
    metadata, body = _load(document)
    data: v.EvidenceFrontmatter = _validate(document, metadata)  # type: ignore[assignment]
    _reject_location_mismatch(document, "slug", data.slug)
    return _base(
        document,
        body=body,
        metadata=metadata,
        chunk_slugs={"company_slug": data.company or "", "project_slug": data.project or ""},
        evidence=[
            {
                "slug": data.slug,
                "claim": data.claim,
                "confidence": data.confidence,
                "evidence_type": data.evidence_type,
                "title": data.title,
                # the notes body doubles as the description when no explicit
                # description is given
                "description": data.description or body,
                "verified_at": _coerce_verified_at(data.verified_at),
                "external_id": data.external_id,
                "source_url": data.source_url,
                "source_path": data.source_path,
                "company_slug": data.company,
                "project_slug": data.project,
            }
        ],
    )


_PARSERS: dict[str, Callable[[DiscoveredDocument], dict[str, Any]]] = {
    "person-profile": parse_person_profile,
    "experience-overview": parse_experience_overview,
    "experience-responsibilities": parse_experience_responsibilities,
    "experience-projects": parse_experience_projects,
    "experience-accomplishments": parse_experience_accomplishments,
    "experience-technologies": parse_experience_technologies,
    "project-overview": parse_project_overview,
    "project-architecture": parse_project_architecture,
    "project-technical-decisions": parse_project_technical_decisions,
    "project-evidence": parse_project_evidence,
    "skill": parse_skill,
    "evidence": parse_evidence,
}
