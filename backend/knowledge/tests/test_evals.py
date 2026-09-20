"""Phase 10 tests: the evaluation harness and its question set."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from knowledge.evals import (
    DEFAULT_QUESTIONS_PATH,
    EvalQuestion,
    evaluate,
    evaluate_question,
    load_questions,
)
from knowledge.models import KnowledgeChunk

pytestmark = pytest.mark.django_db


def make_chunk(content: str, project_slug: str = "", company_slug: str = "") -> KnowledgeChunk:
    return KnowledgeChunk.objects.create(
        content=content,
        source_type="project-overview",
        source_path=f"knowledge/projects/{project_slug or 'x'}/overview.md",
        project_slug=project_slug,
        company_slug=company_slug,
        metadata={"source_group": "projects"},
    )


# --------------------------------------------------------------------------- #
# the shipped question set
# --------------------------------------------------------------------------- #


def test_shipped_question_set_loads_and_is_well_formed():
    questions = load_questions()

    assert len(questions) >= 30
    assert len({question.id for question in questions}) == len(questions)
    tags = {tag for question in questions for tag in question.tags}
    assert {"projects", "experience", "skills", "evidence"} <= tags


def test_shipped_question_set_is_valid_json_with_expectations():
    payload = json.loads(Path(DEFAULT_QUESTIONS_PATH).read_text(encoding="utf-8"))

    assert payload["version"] == 1
    assert all(question["expect"] for question in payload["questions"])


def test_duplicate_question_ids_are_rejected(tmp_path):
    path = tmp_path / "questions.json"
    path.write_text(
        json.dumps(
            {
                "questions": [
                    {"id": "dup", "question": "a", "expect": {"project_slug": ["x"]}},
                    {"id": "dup", "question": "b", "expect": {"project_slug": ["y"]}},
                ]
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="duplicate question id"):
        load_questions(path)


def test_unknown_expectation_keys_are_rejected(tmp_path):
    path = tmp_path / "questions.json"
    path.write_text(
        json.dumps(
            {
                "questions": [
                    {"id": "x", "question": "a", "expect": {"colour": ["blue"]}}
                ]
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="unknown expectation keys"):
        load_questions(path)


# --------------------------------------------------------------------------- #
# metrics
# --------------------------------------------------------------------------- #


def test_evaluate_question_scores_a_hit():
    make_chunk("Warranty app shipped to both stores.", project_slug="warranty")
    question = EvalQuestion(
        id="q",
        question="warranty app shipped",
        expect={"project_slug": ["warranty"]},
    )

    outcome = evaluate_question(question, mode="structured", k=5)

    assert outcome.hit is True
    assert outcome.first_rank == 1
    assert outcome.reciprocal_rank == 1.0
    assert outcome.recall == 1.0
    assert outcome.missing == []


def test_evaluate_question_scores_a_miss_and_reports_what_was_missing():
    make_chunk("Warranty app shipped.", project_slug="warranty")
    question = EvalQuestion(
        id="q",
        question="warranty app shipped",
        expect={"project_slug": ["warranty", "untapped"]},
    )

    outcome = evaluate_question(question, mode="structured", k=5)

    assert outcome.hit is True
    assert outcome.recall == 0.5
    assert outcome.missing == ["project_slug:untapped"]


def test_report_aggregates_hit_rate_recall_and_mrr():
    make_chunk("Kubernetes deployment notes.", project_slug="infra")
    questions = [
        EvalQuestion(id="hit", question="kubernetes", expect={"project_slug": ["infra"]}),
        EvalQuestion(id="miss", question="kubernetes", expect={"project_slug": ["ghost"]}),
    ]

    report = evaluate(questions, mode="structured", k=5)

    assert report.hit_rate == 0.5
    assert report.mrr == 0.5
    assert [outcome.question.id for outcome in report.misses] == ["miss"]
    assert report.as_dict()["misses"] == ["miss"]


# --------------------------------------------------------------------------- #
# command surface
# --------------------------------------------------------------------------- #


def test_command_reports_json(capsys):
    make_chunk("Warranty app shipped.", project_slug="warranty")

    call_command("evaluate_retrieval", "--json", "-k", "3")

    payload = json.loads(capsys.readouterr().out)
    assert payload["reports"][0]["mode"] == "hybrid"
    assert payload["reports"][0]["k"] == 3
    assert 0.0 <= payload["reports"][0]["hit_rate"] <= 1.0


def test_command_fails_when_below_the_minimum_hit_rate():
    with pytest.raises(CommandError, match="hit rate below"):
        call_command(
            "evaluate_retrieval",
            "--mode",
            "structured",
            "--min-hit-rate",
            "1.0",
        )


def test_command_rejects_a_bad_k():
    with pytest.raises(CommandError, match="-k must be"):
        call_command("evaluate_retrieval", "-k", "0")
