"""Idempotent database upserts for normalized knowledge base documents.

Every model is keyed on its natural key (a slug, or ``(person, company)`` for
``Employment``), so re-running the ingestion updates rows in place instead of
creating duplicates.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any, Iterable, Sequence

from django.core.exceptions import ValidationError as DjangoValidationError

from knowledge.models import (
    Company,
    Employment,
    Evidence,
    KnowledgeChunk,
    Person,
    Project,
    Skill,
    Technology,
)

from .errors import KnowledgeIngestionError, Problem
from .chunks import chunk_content
from .report import Recorder

MODELS_BY_NAME = {
    "Company": Company,
    "Employment": Employment,
    "Evidence": Evidence,
    "KnowledgeChunk": KnowledgeChunk,
    "Person": Person,
    "Project": Project,
    "Skill": Skill,
    "Technology": Technology,
}


@dataclass
class IngestionState:
    """Rows created in this run, so later phases do not have to re-query."""

    employments: dict[str, Employment] = field(default_factory=dict)  # company slug
    projects: dict[str, Project] = field(default_factory=dict)  # project slug
    technologies: dict[str, list[Technology]] = field(default_factory=dict)  # company slug
    #: evidence written in this run, for --strict checks without re-querying
    evidence: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class IngestionContext:
    """Everything the upserters need: reporting, dry-run flag, in-memory rows."""

    recorder: Recorder
    dry_run: bool = False
    state: IngestionState = field(default_factory=IngestionState)
    #: rows that exist only in memory during a dry run, keyed by (model, slug)
    _pending: dict[tuple[str, str], Any] = field(default_factory=dict)

    def remember(self, model: type, key: str, obj: Any) -> None:
        self._pending[(model.__name__, key)] = obj

    def pending(self, model: type, key: str) -> Any | None:
        return self._pending.get((model.__name__, key))

    def warn(self, message: str) -> None:
        self.recorder.warn(message)

    def fail(self, source_path: str, message: str, details: Iterable[str] = ()) -> None:
        raise KnowledgeIngestionError([Problem(source_path, message, tuple(details))])


# --------------------------------------------------------------------------- #
# core upsert helpers
# --------------------------------------------------------------------------- #


def _differs(obj: Any, defaults: dict[str, Any]) -> bool:
    return any(getattr(obj, name) != value for name, value in defaults.items())


def _apply(obj: Any, defaults: dict[str, Any]) -> bool:
    changed = False
    for name, value in defaults.items():
        if getattr(obj, name) != value:
            setattr(obj, name, value)
            changed = True
    return changed


def _save(obj: Any, source_path: str) -> None:
    """Validate with Django's own validators, then save."""
    try:
        obj.full_clean(validate_unique=False, validate_constraints=False)
        obj.save()
    except DjangoValidationError as exc:
        details: list[str] = []
        for field, messages in (exc.message_dict or {}).items():
            details.append(f"{field}: {', '.join(str(message) for message in messages)}")
        if not details:
            details = [str(message) for message in exc.messages]
        raise KnowledgeIngestionError(
            [Problem(source_path, f"{type(obj).__name__} has invalid data", tuple(details))]
        )


def _upsert(
    ctx: IngestionContext,
    model: type,
    key: str,
    lookup: dict[str, Any],
    defaults: dict[str, Any],
    source_path: str,
) -> Any:
    """Look the row up by its natural key, then create / update / skip it."""
    if ctx.dry_run:
        planned = ctx.pending(model, key)
        if planned is not None:
            if _apply(planned, defaults):
                ctx.recorder.record(model.__name__, key, "updated")
            return planned
        return _upsert_from_database(ctx, model, key, lookup, defaults, source_path)
    return _upsert_from_database(ctx, model, key, lookup, defaults, source_path)


def _upsert_from_database(
    ctx: IngestionContext,
    model: type,
    key: str,
    lookup: dict[str, Any],
    defaults: dict[str, Any],
    source_path: str,
) -> Any:
    try:
        obj = model.objects.get(**lookup)
    except model.DoesNotExist:
        obj = model(**lookup, **defaults)
        if not ctx.dry_run:
            _save(obj, source_path)
        ctx.remember(model, key, obj)
        ctx.recorder.record(model.__name__, key, "created")
        return obj

    changed = _apply(obj, defaults)
    if changed and not ctx.dry_run:
        _save(obj, source_path)
    ctx.recorder.record(model.__name__, key, "updated" if changed else "skipped")
    return obj


def _sync_many_to_many(
    ctx: IngestionContext,
    obj: Any,
    field_name: str,
    items: Sequence[Any],
    source_path: str,
) -> None:
    """Replace a M2M set, recording an update when the set changes.

    Used for the lists a document owns outright (a project's ``skills`` and
    ``technologies``).
    """
    if not items:
        return
    model_name = type(obj).__name__
    key = _natural_key(obj)

    if obj.pk is None:  # only happens in a dry run: the row will be created
        ctx.recorder.record(model_name, key, "updated")
        return

    manager = getattr(obj, field_name)
    current = set(manager.values_list("pk", flat=True))
    wanted = {item.pk for item in items}
    if current == wanted:
        return
    if not ctx.dry_run:
        manager.set(list(items))
    ctx.recorder.record(model_name, key, "updated")


def _add_many_to_many(
    ctx: IngestionContext,
    obj: Any,
    field_name: str,
    items: Sequence[Any],
    source_path: str,
) -> None:
    """Add to a M2M set without removing anything.

    Used when a company-level list enriches the projects it owns: editing
    ``technologies.md`` must not silently drop a technology that a project
    declares in its own ``overview.md``.
    """
    if not items:
        return
    model_name = type(obj).__name__
    key = _natural_key(obj)

    if obj.pk is None:  # only happens in a dry run: the row will be created
        ctx.recorder.record(model_name, key, "updated")
        return

    manager = getattr(obj, field_name)
    current = set(manager.values_list("pk", flat=True))
    additions = [item for item in items if item.pk not in current]
    if not additions:
        return
    if not ctx.dry_run:
        manager.add(*additions)
    ctx.recorder.record(model_name, key, "updated")


def _natural_key(obj: Any) -> str:
    slug = getattr(obj, "slug", None)
    if slug:
        return str(slug)
    if isinstance(obj, Employment):
        return obj.company.slug
    return str(obj.pk)


# --------------------------------------------------------------------------- #
# person
# --------------------------------------------------------------------------- #


def upsert_person(ctx: IngestionContext, document: dict[str, Any]) -> Person:
    data = document["person"]
    person = _upsert(
        ctx,
        Person,
        data["slug"],
        {"slug": data["slug"]},
        {
            "name": data["name"],
            "title": data["title"],
            "location": data["location"],
            "summary": data["summary"],
            "specializations": data["specializations"],
            "career_focus": data["career_focus"],
            "experience_years": data["experience_years"],
        },
        document["source_path"],
    )
    return person


def warn_if_multiple_people(ctx: IngestionContext) -> None:
    """The public API returns the first Person row, so extra rows are a bug."""
    if ctx.dry_run:
        return
    count = Person.objects.count()
    if count > 1:
        ctx.warn(
            f"{count} Person rows exist; the portfolio API returns the first one. "
            "Delete the duplicates in the admin or re-ingest after fixing the profile slug."
        )


def _primary_person(ctx: IngestionContext, source_path: str) -> Person:
    if ctx.dry_run:
        for (model_name, _key), obj in ctx._pending.items():
            if model_name == "Person":
                return obj
    person = Person.objects.order_by("id").first()
    if person is None:
        ctx.fail(
            source_path,
            "no Person row exists yet",
            (
                "ingest the profile first: python manage.py ingest_knowledge --only person",
                "or run the full ingestion: python manage.py ingest_knowledge",
            ),
        )
    return person


# --------------------------------------------------------------------------- #
# experience: company + employment
# --------------------------------------------------------------------------- #


def upsert_employment_overview(
    ctx: IngestionContext, document: dict[str, Any]
) -> tuple[Company, Employment]:
    company_data = document["company"]
    company = _upsert(
        ctx,
        Company,
        company_data["slug"],
        {"slug": company_data["slug"]},
        {
            "name": company_data["name"],
            "website": company_data["website"],
            "description": company_data["description"],
        },
        document["source_path"],
    )
    person = _primary_person(ctx, document["source_path"])
    employment = _upsert_employment(
        ctx, person, company, document["employment"], document["source_path"]
    )
    ctx.state.employments[company.slug] = employment
    return company, employment


def _upsert_employment(
    ctx: IngestionContext,
    person: Person,
    company: Company,
    data: dict[str, Any],
    source_path: str,
) -> Employment:
    """One Employment row per (person, company)."""
    defaults = {
        "role": data["role"],
        "start_date": data["start_date"],
        "end_date": data["end_date"],
        "location": data["location"],
    }
    key = company.slug

    if ctx.dry_run:
        planned = ctx.pending(Employment, key)
        if planned is not None:
            if _apply(planned, defaults):
                ctx.recorder.record("Employment", key, "updated")
            return planned

    if ctx.dry_run and (person.pk is None or company.pk is None):
        # the person/company rows only exist in memory, so the employment cannot
        employment = Employment(
            person=person, company=company, responsibilities="", **defaults
        )
        ctx.remember(Employment, key, employment)
        ctx.recorder.record("Employment", key, "created")
        return employment

    try:
        employment = Employment.objects.get(person=person, company=company)
    except Employment.DoesNotExist:
        employment = Employment(
            person=person, company=company, responsibilities="", **defaults
        )
        if not ctx.dry_run:
            _save(employment, source_path)
        ctx.remember(Employment, key, employment)
        ctx.recorder.record("Employment", key, "created")
        return employment

    changed = _apply(employment, defaults)
    if changed and not ctx.dry_run:
        _save(employment, source_path)
    ctx.recorder.record("Employment", key, "updated" if changed else "skipped")
    return employment


def _require_employment(
    ctx: IngestionContext, company_slug: str, source_path: str
) -> Employment:
    employment = ctx.state.employments.get(company_slug)
    if employment is not None:
        return employment
    if ctx.dry_run:
        planned = ctx.pending(Employment, company_slug)
        if planned is not None:
            return planned
    employment = (
        Employment.objects.filter(company__slug=company_slug)
        .select_related("company")
        .order_by("-start_date", "-id")
        .first()
    )
    if employment is None:
        ctx.fail(
            source_path,
            f"no employment found for company '{company_slug}'",
            (
                f"ingest knowledge/experience/{company_slug}/overview.md first",
                "or run the full ingestion: python manage.py ingest_knowledge",
            ),
        )
    return employment


def _patch_employment(
    ctx: IngestionContext,
    employment: Employment,
    defaults: dict[str, Any],
    source_path: str,
) -> Employment:
    key = employment.company.slug
    if employment.pk is None:
        if _apply(employment, defaults):
            ctx.recorder.record("Employment", key, "updated")
        return employment
    changed = _apply(employment, defaults)
    if changed and not ctx.dry_run:
        _save(employment, source_path)
    ctx.recorder.record("Employment", key, "updated" if changed else "skipped")
    return employment


def upsert_employment_responsibilities(
    ctx: IngestionContext, document: dict[str, Any]
) -> Employment:
    employment = _require_employment(
        ctx, document["company_slug"], document["source_path"]
    )
    return _patch_employment(
        ctx,
        employment,
        {"responsibilities": document["responsibilities"]},
        document["source_path"],
    )


def upsert_employment_accomplishments(
    ctx: IngestionContext, document: dict[str, Any]
) -> list[Evidence]:
    employment = _require_employment(
        ctx, document["company_slug"], document["source_path"]
    )
    return [
        upsert_evidence(
            ctx, entry, employment=employment, project=None, source_path=document["source_path"]
        )
        for entry in document["evidence"]
    ]


# --------------------------------------------------------------------------- #
# catalog: skills and technologies
# --------------------------------------------------------------------------- #


def upsert_skill(ctx: IngestionContext, document: dict[str, Any]) -> Skill:
    data = document["skill"]
    return _upsert(
        ctx,
        Skill,
        data["slug"],
        {"slug": data["slug"]},
        {"name": data["name"], "category": data["category"]},
        document["source_path"],
    )


_CATALOG_HINTS = {
    "Skill": "add knowledge/skills/<slug>.md for it",
    "Technology": "add it to knowledge/experience/<company>/technologies.md, "
    "or give it a name in the referencing file",
}


def resolve_catalog(
    ctx: IngestionContext,
    model: type,
    references: Sequence[dict[str, Any]],
    source_path: str,
) -> list[Any]:
    """Resolve ``slug`` references, upserting the ones written out in full."""
    resolved: list[Any] = []
    missing: list[str] = []

    for reference in references:
        slug = reference["slug"]
        name = reference["name"]
        if name is None:
            obj = ctx.pending(model, slug) if ctx.dry_run else None
            if obj is None:
                obj = model.objects.filter(slug=slug).first()
            if obj is None:
                missing.append(slug)
                continue
        else:
            obj = _upsert(
                ctx,
                model,
                slug,
                {"slug": slug},
                {"name": name, "category": reference.get("category", "")},
                source_path,
            )
        resolved.append(obj)

    if missing:
        ctx.fail(
            source_path,
            f"unknown {model.__name__.lower()} slug(s) referenced",
            tuple(
                [f"missing {model.__name__.lower()}: {slug}" for slug in sorted(missing)]
                + [f"hint: {_CATALOG_HINTS[model.__name__]}"]
                + ["bare slug references must already exist; write the entry out in full to create it"]
            ),
        )
    return resolved


def upsert_employment_technologies(
    ctx: IngestionContext, document: dict[str, Any]
) -> list[Technology]:
    technologies = resolve_catalog(
        ctx, Technology, document["technologies"], document["source_path"]
    )
    ctx.state.technologies[document["company_slug"]] = technologies
    return technologies


# --------------------------------------------------------------------------- #
# projects
# --------------------------------------------------------------------------- #


def upsert_project_overview(ctx: IngestionContext, document: dict[str, Any]) -> Project:
    data = document["project"]
    project = _upsert(
        ctx,
        Project,
        data["slug"],
        {"slug": data["slug"]},
        {
            "name": data["name"],
            "overview": data["overview"],
            "problem": data["problem"],
            "context": data["context"],
            "github_url": data["github_url"],
            "demo_url": data["demo_url"],
            "docs_url": data["docs_url"],
        },
        document["source_path"],
    )
    skills = resolve_catalog(ctx, Skill, document["skill_refs"], document["source_path"])
    technologies = resolve_catalog(
        ctx, Technology, document["technology_refs"], document["source_path"]
    )
    _sync_many_to_many(ctx, project, "skills", skills, document["source_path"])
    _sync_many_to_many(
        ctx, project, "technologies", technologies, document["source_path"]
    )
    ctx.state.projects[data["slug"]] = project
    return project


def _require_project(
    ctx: IngestionContext, slug: str, source_path: str
) -> Project:
    project = ctx.state.projects.get(slug)
    if project is not None:
        return project
    if ctx.dry_run:
        planned = ctx.pending(Project, slug)
        if planned is not None:
            return planned
    project = Project.objects.filter(slug=slug).first()
    if project is None:
        ctx.fail(
            source_path,
            f"no project found for slug '{slug}'",
            (
                f"create knowledge/projects/{slug}/overview.md first",
                "or run the full ingestion: python manage.py ingest_knowledge",
            ),
        )
    ctx.state.projects[slug] = project
    return project


def upsert_project_patch(ctx: IngestionContext, document: dict[str, Any]) -> Project:
    patch = dict(document["project_patch"])
    slug = patch.pop("slug")
    project = _require_project(ctx, slug, document["source_path"])
    if project.pk is None:
        if _apply(project, patch):
            ctx.recorder.record("Project", slug, "updated")
        return project
    changed = _apply(project, patch)
    if changed and not ctx.dry_run:
        _save(project, document["source_path"])
    ctx.recorder.record("Project", slug, "updated" if changed else "skipped")
    return project


def upsert_project_evidence(
    ctx: IngestionContext, document: dict[str, Any]
) -> list[Evidence]:
    project = _require_project(ctx, document["project_slug"], document["source_path"])
    return [
        upsert_evidence(
            ctx, entry, employment=None, project=project, source_path=document["source_path"]
        )
        for entry in document["evidence"]
    ]


# --------------------------------------------------------------------------- #
# evidence
# --------------------------------------------------------------------------- #


def upsert_evidence(
    ctx: IngestionContext,
    entry: dict[str, Any],
    *,
    employment: Employment | None,
    project: Project | None,
    source_path: str,
) -> Evidence:
    row = _upsert(
        ctx,
        Evidence,
        entry["slug"],
        {"slug": entry["slug"]},
        {
            "claim": entry["claim"],
            "confidence": entry["confidence"],
            "evidence_type": entry.get("evidence_type", "documentation"),
            "title": entry.get("title", ""),
            "description": entry.get("description", ""),
            "verified_at": entry.get("verified_at"),
            "external_id": entry.get("external_id", ""),
            "source_url": entry["source_url"],
            "source_path": entry["source_path"],
            "employment": employment,
            "project": project,
        },
        source_path,
    )
    company_slug = employment.company.slug if employment is not None else None
    project_slug = project.slug if project is not None else None
    tracked = {
        "slug": entry["slug"],
        "confidence": entry["confidence"],
        "source_url": entry["source_url"],
        "source_path": entry["source_path"],
        "company_slug": company_slug,
        "project_slug": project_slug,
    }
    if all(previous["slug"] != tracked["slug"] for previous in ctx.state.evidence):
        ctx.state.evidence.append(tracked)
    return row


def upsert_evidence_document(
    ctx: IngestionContext, document: dict[str, Any]
) -> list[Evidence]:
    """Standalone ``knowledge/evidence/<slug>.md`` file."""
    entries: list[Evidence] = []
    for entry in document["evidence"]:
        employment = None
        project = None
        if entry["project_slug"]:
            project = _require_project(
                ctx, entry["project_slug"], document["source_path"]
            )
        if entry["company_slug"]:
            employment = _require_employment(
                ctx, entry["company_slug"], document["source_path"]
            )
        entries.append(
            upsert_evidence(
                ctx,
                entry,
                employment=employment,
                project=project,
                source_path=document["source_path"],
            )
        )
    return entries


# --------------------------------------------------------------------------- #
# links between experience and projects
# --------------------------------------------------------------------------- #


def link_employment_projects(
    ctx: IngestionContext, document: dict[str, Any]
) -> list[Project]:
    """``experience/<company>/projects.md`` decides which projects belong where."""
    employment = _require_employment(
        ctx, document["company_slug"], document["source_path"]
    )
    linked: list[Project] = []

    for slug in document["project_slugs"]:
        project = ctx.state.projects.get(slug)
        if project is None and ctx.dry_run:
            project = ctx.pending(Project, slug)
        if project is None:
            project = Project.objects.filter(slug=slug).first()
        if project is None:
            ctx.warn(
                f"{document['source_path']}: project '{slug}' has not been ingested, "
                "so it was not linked to this employment (run the full ingestion "
                "without --only to link it)"
            )
            continue

        if project.pk is None:
            if _apply(project, {"employment": employment}):
                ctx.recorder.record("Project", slug, "updated")
        else:
            changed = _apply(project, {"employment": employment})
            if changed and not ctx.dry_run:
                _save(project, document["source_path"])
            ctx.recorder.record("Project", slug, "updated" if changed else "skipped")
        ctx.state.projects[slug] = project
        linked.append(project)

    return linked


def link_employment_technologies(
    ctx: IngestionContext, document: dict[str, Any]
) -> int:
    """Attach the technologies of an employment to that employment's projects."""
    company_slug = document["company_slug"]
    employment = _require_employment(ctx, company_slug, document["source_path"])
    technologies = ctx.state.technologies.get(company_slug)
    if not technologies:
        return 0

    linked = 0
    for project in _projects_of_employment(ctx, employment):
        _add_many_to_many(
            ctx, project, "technologies", technologies, document["source_path"]
        )
        linked += 1
    return linked


def _projects_of_employment(
    ctx: IngestionContext, employment: Employment
) -> list[Project]:
    projects = [
        project
        for project in ctx.state.projects.values()
        if _same_employment(project.employment, employment)
    ]
    if employment.pk is not None:
        known = {project.pk for project in projects}
        projects.extend(
            project
            for project in Project.objects.filter(employment=employment)
            if project.pk not in known
        )
    return projects


def _same_employment(candidate: Employment | None, employment: Employment) -> bool:
    if candidate is None:
        return False
    if candidate is employment:
        return True
    return candidate.pk is not None and candidate.pk == employment.pk


# --------------------------------------------------------------------------- #
# knowledge chunks (body plus indexed frontmatter facts; content changes clear embeddings)
# --------------------------------------------------------------------------- #


def upsert_knowledge_chunk(
    ctx: IngestionContext, document: dict[str, Any]
) -> KnowledgeChunk | None:
    """One searchable row per document, including frontmatter-only facts."""
    content = chunk_content(document)
    if not content:
        return None

    key = document["source_path"]
    chunk_slugs = document.get("chunk_slugs", {})
    defaults = {
        "content": content,
        # fine grained file type, e.g. "project-overview"
        "source_type": document["file_type"],
        "company_slug": chunk_slugs.get("company_slug", ""),
        "project_slug": chunk_slugs.get("project_slug", ""),
        "skill_slug": chunk_slugs.get("skill_slug", ""),
        "metadata": {
            "file_type": document["file_type"],
            "source_group": document["source_group"],
            "frontmatter": _jsonable(document["raw"]),
        },
    }

    existing = KnowledgeChunk.objects.filter(source_path=key).first()
    if existing is None:
        if ctx.dry_run:
            ctx.recorder.record("KnowledgeChunk", key, "created")
            return None
        chunk = KnowledgeChunk(source_path=key, embedding=None, **defaults)
        chunk.save()
        ctx.recorder.record("KnowledgeChunk", key, "created")
        return chunk

    changed = _differs(existing, defaults)
    if changed and not ctx.dry_run:
        if existing.content != content:
            # embed_knowledge processes NULL embeddings, so changed documents
            # must re-enter that queue instead of keeping a stale vector.
            existing.embedding = None
        _apply(existing, defaults)
        existing.save()
    ctx.recorder.record("KnowledgeChunk", key, "updated" if changed else "skipped")
    return existing


def _jsonable(value: Any) -> Any:
    """Make YAML frontmatter safe for ``JSONField``."""
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
