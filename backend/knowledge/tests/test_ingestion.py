"""End-to-end tests for the Phase 2 knowledge ingestion pipeline."""

from __future__ import annotations

import datetime as dt
from pathlib import Path

import frontmatter
import pytest

from knowledge.ingestion import KnowledgeIngestionError, resolve_kb_path, run_ingestion
from knowledge.ingestion import upserters
from knowledge.ingestion.parsers import discover_documents
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

pytestmark = pytest.mark.django_db


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #


def _write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def _all_model_counts() -> dict[str, int]:
    return {
        "Person": Person.objects.count(),
        "Company": Company.objects.count(),
        "Employment": Employment.objects.count(),
        "Skill": Skill.objects.count(),
        "Technology": Technology.objects.count(),
        "Project": Project.objects.count(),
        "Evidence": Evidence.objects.count(),
        "KnowledgeChunk": KnowledgeChunk.objects.count(),
    }


# --------------------------------------------------------------------------- #
# happy path
# --------------------------------------------------------------------------- #


def test_happy_path_ingests_the_fixture_knowledgebase(kb_copy: Path):
    report = run_ingestion(kb_copy)

    person = Person.objects.get(slug="david-clinton")
    assert person.name == "David Clinton"
    assert person.title == "Backend & Data Engineer"
    assert person.location == "Nairobi, Kenya"
    assert person.summary.startswith("I build backend services")
    assert person.specializations == [
        "Python services and APIs",
        "PostgreSQL data modelling",
        "Batch data pipelines",
    ]
    assert person.career_focus == [
        "Platform engineering for data-heavy products",
        "AI-assisted knowledge tooling",
    ]
    assert person.experience_years == 8

    company = Company.objects.get(slug="analytical-engines")
    assert company.name == "Analytical Engines Ltd"
    assert company.website == "https://analytical-engines.example.com"
    assert company.description.startswith("Analytical Engines builds scheduling")

    employment = Employment.objects.get(company=company)
    assert employment.person == person
    assert employment.role == "Senior Backend Engineer"
    assert employment.start_date == dt.date(2021, 3, 1)
    assert employment.end_date == dt.date(2024, 6, 30)
    assert employment.location == "Nairobi, Kenya (hybrid)"
    assert employment.responsibilities.startswith("- Owned the billing")

    skill = Skill.objects.get(slug="system-design")
    assert skill.name == "System design"
    assert skill.category == "engineering"
    # a skill written out in full inside a project file is created too
    assert Skill.objects.get(slug="performance-tuning").name == "Performance tuning"
    assert Skill.objects.get(slug="technical-writing").category == "communication"

    postgresql = Technology.objects.get(slug="postgresql")
    assert (postgresql.name, postgresql.category) == ("PostgreSQL", "database")
    assert Technology.objects.get(slug="redis").name == "Redis"

    project = Project.objects.get(slug="difference-engine")
    assert project.name == "Difference Engine"
    assert project.overview.startswith("Difference Engine is the sharded job runner")
    assert project.problem.startswith("Nightly billing runs took six hours")
    assert project.context.startswith("The scheduler ran every job")
    assert project.architecture.startswith("Difference Engine splits the nightly run")
    assert project.technical_decisions.startswith("We kept PostgreSQL as the queue")
    assert project.challenges == (
        "- Job throughput was capped by a single worker process.\n"
        "- Retries could duplicate invoices when a worker died mid-job."
    )
    assert project.solutions.startswith("- Sharded the queue by tenant id")
    assert project.results.startswith("- Nightly runtime fell from six hours")
    assert project.github_url == "https://github.com/davidclinton/difference-engine"
    assert project.employment == employment
    assert set(project.skills.values_list("slug", flat=True)) == {
        "system-design",
        "performance-tuning",
    }
    assert set(project.technologies.values_list("slug", flat=True)) == {
        "python",
        "django",
        "postgresql",
        "redis",
    }

    employment_evidence = Evidence.objects.get(slug="analytical-engines-batch-runtime")
    assert employment_evidence.employment == employment
    assert employment_evidence.project is None
    assert employment_evidence.confidence == "confirmed"
    assert employment_evidence.source_path == "sources/documents/2023-performance-review.pdf"
    assert (
        Evidence.objects.get(slug="analytical-engines-scheduler-sharding").confidence
        == "probable"
    )

    project_evidence = Evidence.objects.get(slug="difference-engine-idempotent-invoices")
    assert project_evidence.project == project
    assert project_evidence.employment is None

    standalone = Evidence.objects.get(slug="difference-engine-throughput")
    assert standalone.project == project
    assert standalone.employment == employment
    assert standalone.evidence_type == "metric"
    assert standalone.title == "Billing batch runtime cut by 89%"
    assert standalone.description.startswith("Nightly billing runtime before")
    assert standalone.external_id == "scheduler-sharding"
    assert standalone.verified_at is not None
    assert standalone.verified_at.date() == dt.date(2024, 7, 1)
    assert Evidence.objects.count() == 5

    # Frontmatter-only inventories must be searchable as well as prose files.
    expected_chunks = len(discover_documents(kb_copy))
    assert KnowledgeChunk.objects.count() == expected_chunks
    assert not KnowledgeChunk.objects.exclude(embedding=None).exists()
    profile_chunk = KnowledgeChunk.objects.get(source_path="knowledge/person/profile.md")
    assert profile_chunk.source_type == "person-profile"
    assert profile_chunk.content.startswith("I build backend services")
    overview_chunk = KnowledgeChunk.objects.get(
        source_path="knowledge/projects/difference-engine/overview.md"
    )
    assert overview_chunk.project_slug == "difference-engine"
    assert overview_chunk.metadata["frontmatter"]["slug"] == "difference-engine"
    assert overview_chunk.embedding is None

    assert report.counts["Person"]["created"] == 1
    assert report.counts["Company"]["created"] == 1
    assert report.counts["Employment"]["created"] == 1
    assert report.counts["Skill"]["created"] == 3
    assert report.counts["Technology"]["created"] == 4
    assert report.counts["Project"]["created"] == 1
    assert report.counts["Evidence"]["created"] == 5
    assert report.counts["KnowledgeChunk"]["created"] == expected_chunks
    assert report.warnings == []
    assert "documents parsed: 13" in report.render()

    # the fixture graph is complete, so --strict passes on it
    strict_report = run_ingestion(kb_copy, strict=True)
    assert strict_report.created() == 0
    assert strict_report.updated() == 0


def test_frontmatter_only_technologies_and_claim_confidence_are_indexed(kb_copy):
    run_ingestion(kb_copy)
    technologies = KnowledgeChunk.objects.get(
        source_path="knowledge/experience/analytical-engines/technologies.md"
    )
    assert all(name in technologies.content for name in ("Python", "Django", "PostgreSQL"))
    evidence = KnowledgeChunk.objects.get(
        source_path="knowledge/projects/difference-engine/evidence.md"
    )
    assert '"confidence": "probable"' in evidence.content
    assert "Duplicate invoices" in evidence.content


def test_changed_facts_invalidate_embeddings_but_unchanged_ingestion_does_not(kb_copy):
    run_ingestion(kb_copy)
    path = "knowledge/experience/analytical-engines/technologies.md"
    chunk = KnowledgeChunk.objects.get(source_path=path)
    chunk.embedding = [0.1] * 1536
    chunk.save()
    run_ingestion(kb_copy)
    chunk.refresh_from_db()
    assert chunk.embedding is not None

    document = frontmatter.load(str(kb_copy / path))
    document["technologies"].append({"slug": "typescript", "name": "TypeScript"})
    _write(kb_copy / path, frontmatter.dumps(document))
    run_ingestion(kb_copy, dry_run=True)
    chunk.refresh_from_db()
    assert chunk.embedding is not None
    run_ingestion(kb_copy)
    chunk.refresh_from_db()
    assert "TypeScript" in chunk.content
    assert chunk.embedding is None


# --------------------------------------------------------------------------- #
# idempotency
# --------------------------------------------------------------------------- #


def test_running_twice_does_not_duplicate_anything(kb_copy: Path):
    first = run_ingestion(kb_copy)
    counts_after_first = _all_model_counts()

    second = run_ingestion(kb_copy)

    assert _all_model_counts() == counts_after_first
    assert first.created() > 0
    assert second.created() == 0
    assert second.updated() == 0
    assert second.skipped() > 0
    for model in ("Person", "Company", "Employment", "Skill", "Technology", "Project"):
        assert second.counts[model]["skipped"] >= 1
    assert second.warnings == []


# --------------------------------------------------------------------------- #
# validation errors
# --------------------------------------------------------------------------- #


def test_malformed_yaml_raises_a_clear_error(kb_copy: Path):
    _write(
        kb_copy / "knowledge/person/profile.md",
        "---\ntype: person-profile\nname: [unclosed\n---\n\nbody\n",
    )

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy)

    message = str(excinfo.value)
    assert "knowledge/person/profile.md" in message
    assert "YAML frontmatter could not be parsed" in message
    assert _all_model_counts() == {model: 0 for model in _all_model_counts()}


def test_missing_required_keys_lists_the_keys_and_the_file(kb_copy: Path):
    _write(
        kb_copy / "knowledge/experience/analytical-engines/overview.md",
        "---\n"
        "type: experience-overview\n"
        "company: analytical-engines\n"
        "company_name: Analytical Engines Ltd\n"
        "start_date: 2021-03-01\n"
        "---\n\n"
        "A company description.\n",
    )

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy)

    message = str(excinfo.value)
    assert "knowledge/experience/analytical-engines/overview.md" in message
    assert "missing required key: role" in message
    assert "invalid frontmatter for type 'experience-overview'" in message
    assert _all_model_counts() == {model: 0 for model in _all_model_counts()}


def test_unknown_frontmatter_keys_are_rejected(kb_copy: Path):
    _write(
        kb_copy / "knowledge/skills/system-design.md",
        "---\n"
        "type: skill\n"
        "slug: system-design\n"
        "name: System design\n"
        "level: expert\n"
        "---\n\n"
        "Notes.\n",
    )

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy)

    message = str(excinfo.value)
    assert "knowledge/skills/system-design.md" in message
    assert "level" in message


def test_type_must_match_the_file_location(kb_copy: Path):
    _write(
        kb_copy / "knowledge/skills/system-design.md",
        "---\ntype: evidence\nslug: system-design\nclaim: nope\n---\n\nnotes\n",
    )

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy)

    assert "must use type 'skill'" in str(excinfo.value)


def test_duplicate_natural_keys_are_rejected(kb_copy: Path):
    _write(
        kb_copy / "knowledge/evidence/difference-engine-runtime.md",
        "---\n"
        "type: evidence\n"
        "slug: difference-engine-runtime\n"
        "claim: Duplicated slug.\n"
        "project: difference-engine\n"
        "---\n\nnotes\n",
    )

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy)

    message = str(excinfo.value)
    assert "duplicate Evidence slug 'difference-engine-runtime'" in message
    assert "knowledge/projects/difference-engine/evidence.md" in message


def test_experience_without_a_person_explains_what_to_do(kb_copy: Path):
    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy, only="experience")

    message = str(excinfo.value)
    assert "no Person row exists yet" in message
    assert "--only person" in message
    assert Person.objects.count() == 0


# --------------------------------------------------------------------------- #
# dry run
# --------------------------------------------------------------------------- #


def test_dry_run_parses_and_validates_but_writes_nothing(kb_copy: Path):
    report = run_ingestion(kb_copy, dry_run=True)

    assert report.dry_run is True
    assert report.counts["Person"]["created"] == 1
    assert report.counts["Project"]["created"] == 1
    assert report.counts["Evidence"]["created"] == 5
    assert "DRY RUN" in report.render()
    assert "nothing was written" in report.render()
    assert _all_model_counts() == {model: 0 for model in _all_model_counts()}


def test_dry_run_still_reports_validation_errors(kb_copy: Path):
    _write(
        kb_copy / "knowledge/skills/system-design.md",
        "---\ntype: skill\nname: System design\n---\n\nNotes.\n",
    )

    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(kb_copy, dry_run=True)

    assert "missing required key: slug" in str(excinfo.value)
    assert _all_model_counts() == {model: 0 for model in _all_model_counts()}


# --------------------------------------------------------------------------- #
# --only
# --------------------------------------------------------------------------- #


def test_only_skills_ingests_only_skills(kb_copy: Path):
    report = run_ingestion(kb_copy, only="skills")

    assert set(Skill.objects.values_list("slug", flat=True)) == {
        "system-design",
        "technical-writing",
    }
    assert Person.objects.count() == 0
    assert Company.objects.count() == 0
    assert Employment.objects.count() == 0
    assert Project.objects.count() == 0
    assert Technology.objects.count() == 0
    assert Evidence.objects.count() == 0
    assert KnowledgeChunk.objects.count() == 2

    touched = {
        model for model, bucket in report.counts.items() if sum(bucket.values()) > 0
    }
    assert touched == {"Skill", "KnowledgeChunk"}
    assert report.only == "skills"


def test_only_person_then_only_experience(kb_copy: Path):
    run_ingestion(kb_copy, only="person")
    assert Person.objects.count() == 1
    assert Company.objects.count() == 0

    report = run_ingestion(kb_copy, only="experience")
    assert Company.objects.count() == 1
    employment = Employment.objects.get()
    assert employment.person.slug == "david-clinton"
    assert employment.responsibilities.startswith("- Owned the billing")
    assert Evidence.objects.count() == 2
    assert set(Technology.objects.values_list("slug", flat=True)) == {
        "python",
        "django",
        "postgresql",
    }
    # projects are not ingested in this scope, so the link is only reported
    assert Project.objects.count() == 0
    assert any("difference-engine" in warning for warning in report.warnings)


def test_only_experience_warns_about_projects_that_are_not_ingested(kb_copy: Path):
    run_ingestion(kb_copy, only="person")
    report = run_ingestion(kb_copy, only="experience")

    assert len(report.warnings) == 1
    assert "project 'difference-engine' has not been ingested" in report.warnings[0]
    assert Project.objects.count() == 0
    assert Technology.objects.count() == 3


# --------------------------------------------------------------------------- #
# transaction + path resolution
# --------------------------------------------------------------------------- #


def test_a_failure_rolls_back_the_whole_run(kb_copy: Path, monkeypatch):
    def boom(ctx, document):
        raise RuntimeError("engine exploded")

    monkeypatch.setattr(upserters, "upsert_project_overview", boom)

    with pytest.raises(RuntimeError):
        run_ingestion(kb_copy)

    assert _all_model_counts() == {model: 0 for model in _all_model_counts()}


def test_resolve_kb_path_prefers_argument_then_environment(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("KNOWLEDGE_BASE_PATH", str(tmp_path / "from-env"))
    assert resolve_kb_path() == (tmp_path / "from-env").resolve()
    assert resolve_kb_path(tmp_path / "explicit") == (tmp_path / "explicit").resolve()


def test_missing_knowledgebase_directory_is_an_actionable_error(tmp_path: Path):
    with pytest.raises(KnowledgeIngestionError) as excinfo:
        run_ingestion(tmp_path / "nope")

    message = str(excinfo.value)
    assert "knowledge base directory not found" in message
    assert "--kb-path" in message
