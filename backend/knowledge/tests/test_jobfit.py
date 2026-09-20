"""Phase 9 tests: deterministic job-fit analysis."""

from __future__ import annotations

import pytest

from knowledge import jobfit
from knowledge.models import (
    Company,
    Employment,
    Evidence,
    Person,
    Project,
    Skill,
    Technology,
)
from knowledge.retrieval import SearchFilters
from knowledge.retrieval.service import SearchOutcome

pytestmark = pytest.mark.django_db


def no_retrieval() -> SearchOutcome:
    """A stub retrieval outcome so the fit logic is tested on its own."""
    return SearchOutcome(
        query="", mode="hybrid", filters=SearchFilters(), results=[]
    )


@pytest.fixture
def knowledge_graph():
    person = Person.objects.create(name="Ada Example", title="Engineer", location="Nairobi")
    company = Company.objects.create(slug="acme", name="Acme")
    employment = Employment.objects.create(
        person=person, company=company, role="Engineer", start_date="2021-01-01"
    )
    react = Technology.objects.create(slug="react-native", name="React Native")
    python = Technology.objects.create(slug="python", name="Python")
    writing = Skill.objects.create(slug="technical-writing", name="Technical Writing")

    project = Project.objects.create(
        slug="warranty-app",
        name="Warranty App",
        overview="A React Native warranty app.",
        employment=employment,
        github_url="https://example.com/repo",
    )
    project.technologies.add(react, python)
    project.skills.add(writing)
    Evidence.objects.create(
        slug="warranty-shipped",
        claim="Shipped to both app stores.",
        project=project,
    )
    return project


def test_build_lexicon_uses_knowledge_base_display_names(knowledge_graph):
    lexicon = jobfit.build_lexicon()

    assert lexicon["react native"] == ("react-native", "technology", "React Native")
    assert lexicon["react-native"] == ("react-native", "technology", "React Native")


def test_detect_requirements_prefers_the_longest_surface_form(knowledge_graph):
    lexicon = jobfit.build_lexicon()

    found = jobfit.detect_requirements(
        "We need React Native experience and strong Docker skills.", lexicon
    )
    slugs = {item.slug for item in found}

    assert "react-native" in slugs
    assert "docker" in slugs  # a gap: not in the knowledge base
    assert "react" not in slugs  # subsumed by "react native"


def test_analyse_splits_matched_from_gaps(knowledge_graph):
    report = jobfit.analyse(
        "React Native engineer. Kubernetes and Terraform a plus. Python required.",
        title="Senior Mobile Engineer",
        search_outcome=no_retrieval(),
    )

    matched = {item.name for item in report.matched}
    gaps = {item.name for item in report.gaps}
    assert {"React Native", "Python"} <= matched
    assert {"kubernetes", "terraform"} <= gaps
    assert report.score == pytest.approx(len(report.matched) / (len(report.matched) + len(report.gaps)))
    assert "Evidence supports" in report.summary


def test_matched_requirements_carry_projects_and_evidence(knowledge_graph):
    report = jobfit.analyse(
        "React Native engineer.",
        search_outcome=no_retrieval(),
    )

    react = next(item for item in report.matched if item.slug == "react-native")
    assert react.projects[0]["slug"] == "warranty-app"
    assert react.evidence[0]["slug"] == "warranty-shipped"
    assert react.as_dict()["matched"] is True


def test_analyse_rejects_an_empty_job_description():
    with pytest.raises(ValueError, match="job_description"):
        jobfit.analyse("   ")


def test_analyse_notes_when_nothing_is_recognised(knowledge_graph):
    report = jobfit.analyse(
        "We are a friendly team looking for someone great.",
        search_outcome=no_retrieval(),
    )

    assert report.matched == []
    assert report.gaps == []
    assert report.score == 0.0
    assert any("no knowledge-base skills" in note for note in report.notes)
