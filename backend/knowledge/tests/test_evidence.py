"""Phase 4 tests: evidence upserts, --strict mode and audit_knowledge."""

from __future__ import annotations

from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from knowledge.ingestion import KnowledgeIngestionError, run_ingestion
from knowledge.models import Evidence, Project, Skill, Technology

pytestmark = pytest.mark.django_db


def _write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def _standalone_evidence(kb_copy: Path) -> Path:
    return kb_copy / "knowledge/evidence/difference-engine-throughput.md"


# --------------------------------------------------------------------------- #
# evidence upserts
# --------------------------------------------------------------------------- #


def test_evidence_upsert_is_idempotent_on_slug(kb_copy: Path):
    run_ingestion(kb_copy)
    first = Evidence.objects.get(slug="difference-engine-throughput")
    assert Evidence.objects.count() == 5

    # re-running changes nothing
    run_ingestion(kb_copy)
    assert Evidence.objects.count() == 5
    assert Evidence.objects.get(slug="difference-engine-throughput").pk == first.pk

    # editing the file updates the same row in place
    edited = _standalone_evidence(kb_copy).read_text(encoding="utf-8")
    edited = edited.replace(
        "Billing batch runtime cut by 89%", "Billing batch runtime cut hugely"
    )
    _write(_standalone_evidence(kb_copy), edited)

    run_ingestion(kb_copy)

    assert Evidence.objects.count() == 5
    row = Evidence.objects.get(slug="difference-engine-throughput")
    assert row.pk == first.pk
    assert row.title == "Billing batch runtime cut hugely"


def test_standalone_evidence_needs_a_project_or_an_employment(kb_copy: Path):
    body = _standalone_evidence(kb_copy).read_text(encoding="utf-8")
    body = body.replace("company: analytical-engines\n", "")
    body = body.replace("project: difference-engine\n", "")
    _write(_standalone_evidence(kb_copy), body)

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy)

    message = str(excinfo.value)
    assert "difference-engine-throughput.md" in message
    assert "at least one of 'company' or 'project' is required" in message
    assert Evidence.objects.count() == 0


# --------------------------------------------------------------------------- #
# --strict
# --------------------------------------------------------------------------- #


def test_strict_fails_when_a_project_has_no_evidence(kb_copy: Path):
    # lenient default first: the graph still ingests fine
    (kb_copy / "knowledge/projects/difference-engine/evidence.md").unlink()
    body = _standalone_evidence(kb_copy).read_text(encoding="utf-8")
    body = body.replace("project: difference-engine\n", "")
    _write(_standalone_evidence(kb_copy), body)
    run_ingestion(kb_copy)
    assert Project.objects.get(slug="difference-engine").evidence.count() == 0

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy, strict=True)

    assert "project 'difference-engine' has no linked evidence" in str(excinfo.value)


def test_strict_fails_when_an_employment_has_no_project(kb_copy: Path):
    second = kb_copy / "knowledge/experience/second-co"
    second.mkdir(parents=True)
    _write(
        second / "overview.md",
        "---\n"
        "type: experience-overview\n"
        "company: second-co\n"
        "company_name: Second Co\n"
        "role: Engineer\n"
        "start_date: 2020-01-01\n"
        "end_date: 2020-12-31\n"
        "---\n\nSecond Co description.\n",
    )

    # lenient by default: still ingests
    run_ingestion(kb_copy)

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy, strict=True)

    assert "employment at 'second-co' has no linked project" in str(excinfo.value)


def test_strict_fails_when_confirmed_evidence_has_no_source(kb_copy: Path):
    body = _standalone_evidence(kb_copy).read_text(encoding="utf-8")
    body = body.replace(
        "source_url: https://analytical-engines.example.com/blog/scheduler-sharding\n",
        "",
    )
    _write(_standalone_evidence(kb_copy), body)

    # lenient by default: still ingests
    run_ingestion(kb_copy)

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy, strict=True)

    message = str(excinfo.value)
    assert "difference-engine-throughput" in message
    assert "has no source" in message


def test_strict_with_only_skips_out_of_scope_link_checks(kb_copy: Path):
    # with --only experience the projects side is deliberately not ingested,
    # so strict must not fail for the missing links (warnings cover that)
    run_ingestion(kb_copy, only="person")
    report = run_ingestion(kb_copy, only="experience", strict=True)

    assert report.only == "experience"
    assert Evidence.objects.count() == 2


# --------------------------------------------------------------------------- #
# audit_knowledge
# --------------------------------------------------------------------------- #


def test_audit_is_clean_on_the_fixture(kb_copy: Path, capsys):
    run_ingestion(kb_copy)

    call_command("audit_knowledge")

    out = capsys.readouterr().out
    assert "hard issues: 0" in out
    assert "audit clean" in out


def test_audit_exits_1_when_a_project_has_no_evidence(kb_copy: Path, capsys):
    run_ingestion(kb_copy)
    Project.objects.create(
        slug="orphan-project", name="Orphan Project", overview="No evidence yet."
    )

    with pytest.raises(CommandError) as excinfo:
        call_command("audit_knowledge")

    out = capsys.readouterr().out
    assert "orphan-project" in out
    assert "hard issues: 1" in out
    assert "hard issue(s)" in str(excinfo.value)


def test_audit_reports_orphaned_skills_and_technologies(kb_copy: Path, capsys):
    run_ingestion(kb_copy)
    # technical-writing ships in the fixture but no project references it
    Technology.objects.create(slug="cobol", name="COBOL")

    # advisory findings only: exit code stays 0
    call_command("audit_knowledge")

    out = capsys.readouterr().out
    assert "technical-writing" in out
    assert "cobol" in out
    assert "hard issues: 0" in out


def test_audit_lists_unverified_evidence(kb_copy: Path, capsys):
    run_ingestion(kb_copy)
    row = Evidence.objects.get(slug="analytical-engines-scheduler-sharding")
    row.confidence = "unverified"
    row.save()

    call_command("audit_knowledge")

    out = capsys.readouterr().out
    assert "analytical-engines-scheduler-sharding" in out
    assert "hard issues: 0" in out


def test_audit_reports_chunks_without_embeddings(kb_copy: Path, capsys):
    run_ingestion(kb_copy)

    call_command("audit_knowledge")

    out = capsys.readouterr().out
    assert "embedding IS NULL" in out
    # expected until Phase 5: advisory, exit stays 0
    assert "hard issues: 0" in out
    assert Skill.objects.count() > 0
