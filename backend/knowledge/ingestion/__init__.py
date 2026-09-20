"""Markdown knowledge base ingestion (Phase 2).

Public entry point::

    from knowledge.ingestion import run_ingestion

    report = run_ingestion(kb_path="~/professional-knowledge")
    print(report.render())

The pipeline parses the frontmatter contract documented in
``knowledge/docs/frontmatter-contract.md``, validates every file, and then
upserts the structured data into the ``knowledge`` models.  Embeddings, LLM
calls and network access are deliberately out of scope: ``KnowledgeChunk`` rows
are created with ``embedding = NULL``.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Iterable

from django.conf import settings
from django.db import transaction

from . import upserters
from .errors import KnowledgeIngestionError, Problem
from .parsers import (
    SOURCE_TYPES,
    discover_documents,
    find_unexpected_documents,
    parse_document,
)
from .report import IngestionReport, Recorder
from .upserters import IngestionContext

__all__ = [
    "SOURCE_TYPES",
    "KnowledgeIngestionError",
    "run_ingestion",
    "resolve_kb_path",
]


def resolve_kb_path(kb_path: str | Path | None = None) -> Path:
    """Resolve the knowledge base root.

    Order: explicit argument -> ``KNOWLEDGE_BASE_PATH`` env var ->
    ``settings.KNOWLEDGE_BASE_PATH`` -> ``~/professional-knowledge``.
    """
    if kb_path:
        return Path(kb_path).expanduser().resolve()
    from_env = os.environ.get("KNOWLEDGE_BASE_PATH")
    if from_env:
        return Path(from_env).expanduser().resolve()
    configured = getattr(settings, "KNOWLEDGE_BASE_PATH", None)
    if configured:
        return Path(configured).expanduser().resolve()
    return (Path.home() / "professional-knowledge").resolve()


def run_ingestion(
    kb_path: str | Path | None = None,
    dry_run: bool = False,
    only: str | None = None,
    strict: bool = False,
) -> IngestionReport:
    """Parse, validate and ingest the knowledge base.

    :param kb_path: knowledge base root; falls back to ``KNOWLEDGE_BASE_PATH``
        and then ``~/professional-knowledge``.
    :param dry_run: parse and validate only, writing nothing to the database.
    :param only: one of ``person | experience | projects | skills | evidence``.
    :param strict: fail the run when the relationship graph is incomplete
        (projects without evidence, employments without projects, unlinked
        evidence, confirmed evidence without a source). Link checks apply to
        full runs; with ``--only`` only the in-scope evidence checks apply.
    :raises KnowledgeIngestionError: frontmatter is missing, malformed, or
        references something that does not exist.
    """
    if only is not None and only not in SOURCE_TYPES:
        raise ValueError(
            f"only must be one of {', '.join(SOURCE_TYPES)}; got {only!r}"
        )

    root = resolve_kb_path(kb_path)
    if not root.is_dir():
        raise KnowledgeIngestionError(
            [
                Problem(
                    str(root),
                    "knowledge base directory not found",
                    (
                        "pass --kb-path /path/to/professional-knowledge",
                        "or set KNOWLEDGE_BASE_PATH in the environment",
                    ),
                )
            ]
        )

    documents = discover_documents(root, only=only)
    if not documents:
        scope = f"source type '{only}'" if only else "the knowledge base"
        raise KnowledgeIngestionError(
            [
                Problem(
                    str(root),
                    f"no Markdown documents found for {scope}",
                    (
                        "expected files such as knowledge/person/profile.md",
                        "see knowledge/docs/frontmatter-contract.md for the file layout",
                    ),
                )
            ],
            kb_path=str(root),
        )

    recorder = Recorder()
    if only is None:
        for relative in find_unexpected_documents(root, documents):
            recorder.warn(
                f"{relative}: not part of the frontmatter contract, skipped "
                "(see knowledge/docs/frontmatter-contract.md)"
            )

    parsed: list[dict[str, Any]] = []
    problems: list[Problem] = []
    for document in documents:
        recorder.files.append(document.source_path)
        try:
            parsed.append(parse_document(document))
        except KnowledgeIngestionError as exc:
            problems.extend(exc.problems)
    problems.extend(_duplicate_key_problems(parsed))
    if problems:
        raise KnowledgeIngestionError(problems, kb_path=str(root))

    context = IngestionContext(recorder=recorder, dry_run=dry_run)
    if dry_run:
        _execute(context, parsed, only)
        if strict:
            _raise_for_strict(context, only, str(root))
    else:
        # A failure anywhere in the run rolls the whole thing back.
        with transaction.atomic():
            _execute(context, parsed, only)
            if strict:
                _raise_for_strict(context, only, str(root))

    return IngestionReport(
        kb_path=str(root),
        dry_run=dry_run,
        only=only,
        counts=recorder.counts(),
        warnings=recorder.warnings,
        files=recorder.files,
    )


#: phase name -> the ``--only`` scopes in which the phase runs
PHASE_SCOPES: dict[str, tuple[str, ...]] = {
    "person": ("person",),
    "skills": ("skills",),
    "experience": ("experience",),
    "projects": ("projects",),
    "evidence": ("evidence",),
    "links": ("experience",),
    "chunks": SOURCE_TYPES,
}


def _execute(
    ctx: IngestionContext, parsed: list[dict[str, Any]], only: str | None
) -> None:
    def documents_of_type(file_type: str) -> list[dict[str, Any]]:
        return [document for document in parsed if document["file_type"] == file_type]

    if _active(only, "person"):
        for document in documents_of_type("person-profile"):
            upserters.upsert_person(ctx, document)
        upserters.warn_if_multiple_people(ctx)

    if _active(only, "skills"):
        for document in documents_of_type("skill"):
            upserters.upsert_skill(ctx, document)

    if _active(only, "experience"):
        for document in documents_of_type("experience-overview"):
            upserters.upsert_employment_overview(ctx, document)
        for document in documents_of_type("experience-responsibilities"):
            upserters.upsert_employment_responsibilities(ctx, document)
        for document in documents_of_type("experience-accomplishments"):
            upserters.upsert_employment_accomplishments(ctx, document)
        for document in documents_of_type("experience-technologies"):
            upserters.upsert_employment_technologies(ctx, document)

    if _active(only, "projects"):
        for document in documents_of_type("project-overview"):
            upserters.upsert_project_overview(ctx, document)
        for document in documents_of_type("project-architecture"):
            upserters.upsert_project_patch(ctx, document)
        for document in documents_of_type("project-technical-decisions"):
            upserters.upsert_project_patch(ctx, document)
        for document in documents_of_type("project-evidence"):
            upserters.upsert_project_evidence(ctx, document)

    if _active(only, "evidence"):
        for document in documents_of_type("evidence"):
            upserters.upsert_evidence_document(ctx, document)

    if _active(only, "links"):
        # After projects, so project -> employment links can be applied.
        for document in documents_of_type("experience-projects"):
            upserters.link_employment_projects(ctx, document)
        for document in documents_of_type("experience-technologies"):
            upserters.link_employment_technologies(ctx, document)

    for document in parsed:
        if only is None or document["source_group"] == only:
            upserters.upsert_knowledge_chunk(ctx, document)


def _active(only: str | None, phase: str) -> bool:
    return only is None or only in PHASE_SCOPES[phase]


def _raise_for_strict(ctx: IngestionContext, only: str | None, kb_path: str) -> None:
    """Fail a ``--strict`` run whose relationship graph is incomplete.

    Link checks (project evidence, employment projects) only make sense for
    full runs: with ``--only`` the other side is deliberately not ingested.
    Evidence-level checks apply whenever evidence is in scope.
    """
    from knowledge import models as knowledge_models

    problems: list[Problem] = []
    full_run = only is None
    evidence_in_scope = only is None or only in ("experience", "projects", "evidence")

    projects = _strict_projects(ctx, knowledge_models)
    employments = _strict_employments(ctx, knowledge_models)
    evidence = _strict_evidence(ctx, knowledge_models)

    if full_run:
        for slug, company_slug in sorted(projects.items(), key=lambda item: item[0]):
            linked = [
                entry
                for entry in evidence
                if entry["project_slug"] == slug
            ]
            if not linked:
                problems.append(
                    Problem(
                        f"project:{slug}",
                        f"project '{slug}' has no linked evidence",
                        (
                            "add knowledge/projects/"
                            f"{slug}/evidence.md or a knowledge/evidence/<slug>.md "
                            f"with 'project: {slug}'",
                        ),
                    )
                )
        for company_slug in sorted(employments):
            if not any(
                project_company == company_slug
                for project_company in projects.values()
            ):
                problems.append(
                    Problem(
                        f"employment:{company_slug}",
                        f"employment at '{company_slug}' has no linked project",
                        (
                            "list its projects in knowledge/experience/"
                            f"{company_slug}/projects.md",
                        ),
                    )
                )

    if evidence_in_scope:
        for entry in sorted(evidence, key=lambda item: item["slug"]):
            if entry["company_slug"] is None and entry["project_slug"] is None:
                problems.append(
                    Problem(
                        f"evidence:{entry['slug']}",
                        f"evidence '{entry['slug']}' is linked to neither a "
                        "project nor an employment",
                        ("set 'project' and/or 'company' on the evidence entry",),
                    )
                )
            if (
                entry["confidence"] == "confirmed"
                and not entry["source_url"]
                and not entry["source_path"]
            ):
                problems.append(
                    Problem(
                        f"evidence:{entry['slug']}",
                        f"confirmed evidence '{entry['slug']}' has no source",
                        ("set 'source_url' and/or 'source_path' on the evidence entry",),
                    )
                )

    if problems:
        raise KnowledgeIngestionError(problems, kb_path=kb_path)


def _strict_projects(ctx: IngestionContext, models: Any) -> dict[str, str | None]:
    """Project slug -> employing company slug (None when unlinked)."""
    merged: dict[str, str | None] = {
        project.slug: _employment_company_slug(project.employment)
        for project in models.Project.objects.select_related(
            "employment", "employment__company"
        ).all()
    }
    for slug, project in ctx.state.projects.items():
        merged[slug] = _employment_company_slug(project.employment)
    return merged


def _strict_employments(ctx: IngestionContext, models: Any) -> set[str]:
    """Company slugs that have an Employment row."""
    merged = {
        employment.company.slug
        for employment in models.Employment.objects.select_related("company").all()
    }
    merged.update(ctx.state.employments.keys())
    return merged


def _strict_evidence(ctx: IngestionContext, models: Any) -> list[dict[str, Any]]:
    """Every evidence row, preferring the in-run version on slug conflicts."""
    merged: dict[str, dict[str, Any]] = {}
    for row in models.Evidence.objects.select_related(
        "project", "employment", "employment__company"
    ).all():
        merged[row.slug] = {
            "slug": row.slug,
            "confidence": row.confidence,
            "source_url": row.source_url,
            "source_path": row.source_path,
            "company_slug": (
                row.employment.company.slug if row.employment_id else None
            ),
            "project_slug": row.project.slug if row.project_id else None,
        }
    for entry in ctx.state.evidence:
        merged[entry["slug"]] = entry
    return list(merged.values())


def _employment_company_slug(employment: Any | None) -> str | None:
    if employment is None:
        return None
    company = getattr(employment, "company", None)
    return getattr(company, "slug", None)


def _duplicate_key_problems(parsed: list[dict[str, Any]]) -> list[Problem]:
    """Natural keys must be unique across the knowledge base."""
    owners: dict[tuple[str, str], str] = {}
    problems: list[Problem] = []

    for document in parsed:
        for model, slug in _declared_keys(document):
            key = (model, slug)
            previous = owners.get(key)
            if previous is not None and previous != document["source_path"]:
                problems.append(
                    Problem(
                        document["source_path"],
                        f"duplicate {model} slug '{slug}'",
                        (
                            f"already defined in {previous}",
                            "slugs are global natural keys; rename one of them",
                        ),
                    )
                )
            else:
                owners[key] = document["source_path"]
    return problems


def _declared_keys(document: dict[str, Any]) -> list[tuple[str, str]]:
    file_type = document["file_type"]
    if file_type == "person-profile":
        return [("Person", document["person"]["slug"])]
    if file_type == "experience-overview":
        return [("Company", document["company"]["slug"])]
    if file_type == "skill":
        return [("Skill", document["skill"]["slug"])]
    if file_type == "project-overview":
        return [("Project", document["project"]["slug"])]
    if file_type in {"experience-accomplishments", "project-evidence"}:
        return [("Evidence", entry["slug"]) for entry in document["evidence"]]
    if file_type == "evidence":
        return [("Evidence", entry["slug"]) for entry in document["evidence"]]
    return []
