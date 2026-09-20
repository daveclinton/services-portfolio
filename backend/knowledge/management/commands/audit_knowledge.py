"""``manage.py audit_knowledge`` — audit the evidence relationship graph.

Reports every claim that is not traceable to a source and every link that
is missing:

* projects with no evidence attached (hard)
* employments with no projects attached (hard)
* evidence linked to neither a project nor an employment (hard)
* evidence whose ``source_url`` answers with a non-2xx status (hard, but
  only checked behind ``--check-urls`` — no network access by default)
* skills referenced by no project (advisory)
* technologies referenced by no project (advisory)
* evidence with ``confidence=unverified`` (advisory)
* knowledge chunks with ``embedding IS NULL`` (advisory, expected
  until the Phase 5 embedding pass)

Exit code 1 when any hard issue is found (for CI), 0 otherwise.
"""

from __future__ import annotations

import urllib.error
import urllib.request
from dataclasses import dataclass, field

from django.core.management.base import BaseCommand, CommandError

from knowledge.models import (
    Employment,
    Evidence,
    KnowledgeChunk,
    Project,
    Skill,
    Technology,
)

#: Advisory sections never change the exit code on their own.
_URL_TIMEOUT_SECONDS = 10
_CHUNK_LIST_LIMIT = 10


@dataclass
class Section:
    """One audit finding group."""

    title: str
    rows: list[str] = field(default_factory=list)
    hard: bool = False
    #: overrides the count when only a sample of rows is listed
    total: int | None = None

    @property
    def count(self) -> int:
        return self.total if self.total is not None else len(self.rows)


class Command(BaseCommand):
    help = (
        "Audit the knowledge graph: every project needs evidence, every "
        "employment needs a project, and every claim needs a source. "
        "Exit code 1 when hard issues are found, 0 otherwise."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--check-urls",
            dest="check_urls",
            action="store_true",
            help=(
                "Also request every evidence source_url and report non-2xx "
                "answers. Off by default: it needs network access and is slow."
            ),
        )

    def handle(self, *args, **options) -> None:
        sections = [
            self._projects_without_evidence(),
            self._employments_without_projects(),
            self._unlinked_evidence(),
            self._orphan_skills(),
            self._orphan_technologies(),
            self._unverified_evidence(),
            self._chunks_without_embeddings(),
        ]
        if options["check_urls"]:
            sections.insert(3, self._broken_source_urls())

        self.stdout.write(self._render(sections))

        hard = sum(section.count for section in sections if section.hard)
        if hard:
            raise CommandError(f"knowledge audit found {hard} hard issue(s)")
        self.stdout.write("audit clean: no hard issues")

    # ------------------------------------------------------------------ #
    # hard sections
    # ------------------------------------------------------------------ #

    def _projects_without_evidence(self) -> Section:
        section = Section("Projects with no evidence", hard=True)
        for project in Project.objects.order_by("slug"):
            if not project.evidence.exists():
                section.rows.append(f"{project.slug} — {project.name}")
        return section

    def _employments_without_projects(self) -> Section:
        section = Section("Employments with no projects", hard=True)
        for employment in Employment.objects.select_related("company").order_by(
            "company__slug"
        ):
            if not Project.objects.filter(employment=employment).exists():
                section.rows.append(
                    f"{employment.company.slug} — {employment.role}"
                )
        return section

    def _unlinked_evidence(self) -> Section:
        section = Section("Evidence linked to neither project nor employment", hard=True)
        for row in Evidence.objects.order_by("slug"):
            if row.project_id is None and row.employment_id is None:
                section.rows.append(f"{row.slug} — {row.claim[:60]}")
        return section

    def _broken_source_urls(self) -> Section:
        section = Section("Evidence source URLs answering non-2xx", hard=True)
        urls = sorted(
            {
                row.source_url
                for row in Evidence.objects.exclude(source_url="")
                if row.source_url
            }
        )
        results: dict[str, str] = {}
        for url in urls:
            results[url] = _url_status(url)
        for row in Evidence.objects.exclude(source_url="").order_by("slug"):
            status = results.get(row.source_url, "")
            if status != "ok":
                section.rows.append(f"{row.slug} — {row.source_url} ({status})")
        return section

    # ------------------------------------------------------------------ #
    # advisory sections
    # ------------------------------------------------------------------ #

    def _orphan_skills(self) -> Section:
        section = Section("Skills referenced by no project")
        for skill in Skill.objects.order_by("slug"):
            if not skill.projects.exists():
                section.rows.append(f"{skill.slug} — {skill.name}")
        return section

    def _orphan_technologies(self) -> Section:
        section = Section("Technologies referenced by no project")
        for technology in Technology.objects.order_by("slug"):
            if not technology.projects.exists():
                section.rows.append(f"{technology.slug} — {technology.name}")
        return section

    def _unverified_evidence(self) -> Section:
        section = Section("Evidence with confidence=unverified")
        for row in Evidence.objects.filter(confidence="unverified").order_by("slug"):
            section.rows.append(f"{row.slug} — {row.claim[:60]}")
        return section

    def _chunks_without_embeddings(self) -> Section:
        # advisory only: embeddings arrive in Phase 5, so NULL is expected now
        missing = KnowledgeChunk.objects.filter(embedding=None).order_by("source_path")
        total = missing.count()
        section = Section(
            "Knowledge chunks with embedding IS NULL "
            "(expected until the Phase 5 embedding pass)",
            total=total,
        )
        for chunk in missing[:_CHUNK_LIST_LIMIT]:
            section.rows.append(chunk.source_path or f"chunk #{chunk.pk}")
        if total > _CHUNK_LIST_LIMIT:
            section.rows.append(f"… and {total - _CHUNK_LIST_LIMIT} more")
        return section

    # ------------------------------------------------------------------ #
    # rendering
    # ------------------------------------------------------------------ #

    def _render(self, sections: list[Section]) -> str:
        lines = ["Knowledge audit", ""]
        for section in sections:
            tag = "HARD" if section.hard else "advisory"
            lines.append(f"{section.title} [{tag}, {section.count}]")
            lines.append("-" * 43)
            if section.rows:
                lines.extend(f"  - {row}" for row in section.rows)
            else:
                lines.append("  none")
            lines.append("")
        hard = sum(section.count for section in sections if section.hard)
        advisory = sum(section.count for section in sections if not section.hard)
        lines.append(f"hard issues: {hard} — advisory findings: {advisory}")
        return "\n".join(lines)


def _url_status(url: str) -> str:
    """Return ``"ok"`` for a 2xx answer, otherwise a short failure reason."""
    for method in ("HEAD", "GET"):
        try:
            request = urllib.request.Request(url, method=method)
            with urllib.request.urlopen(request, timeout=_URL_TIMEOUT_SECONDS) as response:
                status = response.status
        except urllib.error.HTTPError as exc:
            if method == "HEAD" and exc.code in (405, 501):
                continue
            return f"HTTP {exc.code}"
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            return f"error: {exc.reason if isinstance(exc, urllib.error.URLError) else exc}"
        else:
            if 200 <= status <= 299:
                return "ok"
            return f"HTTP {status}"
    return "error: HEAD and GET both rejected"
