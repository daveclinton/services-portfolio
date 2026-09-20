"""HTTP tests for ``/api/ai/`` (Phases 6, 7 and 9).

The chat streaming tests swap in a fake OpenAI client, so they never hit the
network; the no-key path is exercised by removing the environment variable.
"""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from django.test import Client

from api.ai import views as ai_views
from knowledge.models import (
    Company,
    Employment,
    Evidence,
    KnowledgeChunk,
    Person,
    Project,
    Technology,
)

pytestmark = pytest.mark.django_db


def make_chunk(content: str, project_slug: str = "warranty") -> KnowledgeChunk:
    return KnowledgeChunk.objects.create(
        content=content,
        source_type="project-overview",
        source_path=f"knowledge/projects/{project_slug}/overview.md",
        project_slug=project_slug,
        metadata={"source_group": "projects"},
    )


def post(client: Client, path: str, payload: dict):
    return client.post(path, data=json.dumps(payload), content_type="application/json")


class FakeStreamingClient:
    """Minimal stand-in for ``openai.OpenAI`` used by the chat view."""

    def __init__(self, chunks: list[str]) -> None:
        self.chunks = chunks
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create)
        )

    def _create(self, **kwargs):
        return [
            SimpleNamespace(
                choices=[SimpleNamespace(delta=SimpleNamespace(content=text))]
            )
            for text in self.chunks
        ]


# --------------------------------------------------------------------------- #
# /api/ai/search/
# --------------------------------------------------------------------------- #


def test_search_returns_ranked_chunks():
    make_chunk("Built a React Native warranty app with offline sync.")
    make_chunk("Wrote GPU computing tutorials.", project_slug="paperspace")

    response = post(
        Client(), "/api/ai/search/", {"query": "react native warranty", "mode": "structured"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "structured"
    assert body["count"] == 1
    assert body["results"][0]["project_slug"] == "warranty"
    assert body["results"][0]["matched_by"] == ["structured"]


def test_search_honours_filters():
    make_chunk("Alpha detail", project_slug="alpha")
    make_chunk("Beta detail", project_slug="beta")

    response = post(
        Client(),
        "/api/ai/search/",
        {"query": "", "filters": {"project_slug": ["beta"]}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["results"][0]["project_slug"] == "beta"


def test_search_can_omit_content():
    make_chunk("Alpha detail", project_slug="alpha")

    response = post(
        Client(),
        "/api/ai/search/",
        {"query": "alpha", "include_content": False},
    )

    assert response.status_code == 200
    assert "content" not in response.json()["results"][0]


def test_search_rejects_an_empty_request():
    response = post(Client(), "/api/ai/search/", {"query": ""})

    assert response.status_code == 400
    assert "filter" in str(response.json())


def test_search_includes_citations():
    person = Person.objects.create(name="Ada", title="Engineer", location="Nairobi")
    company = Company.objects.create(slug="acme", name="Acme")
    employment = Employment.objects.create(
        person=person, company=company, role="Engineer", start_date="2021-01-01"
    )
    project = Project.objects.create(
        slug="warranty", name="Warranty", overview="…", employment=employment
    )
    Evidence.objects.create(
        slug="warranty-shipped",
        claim="Shipped to both stores.",
        project=project,
        source_url="https://example.com/warranty",
    )
    make_chunk("Warranty app shipped to both stores.")

    response = post(Client(), "/api/ai/search/", {"query": "warranty shipped"})

    citations = response.json()["results"][0]["citations"]
    assert citations[0]["slug"] == "warranty-shipped"


# --------------------------------------------------------------------------- #
# /api/ai/chat/
# --------------------------------------------------------------------------- #


def _sse_events(raw: bytes) -> list[tuple[str, dict]]:
    events = []
    for block in raw.decode().split("\n\n"):
        block = block.strip()
        if not block:
            continue
        lines = dict(
            line.split(": ", 1) for line in block.splitlines() if ": " in line
        )
        events.append((lines["event"], json.loads(lines["data"])))
    return events


def test_chat_streams_citations_then_grounded_deltas(monkeypatch):
    make_chunk("Built a React Native warranty app with offline sync.")
    monkeypatch.setattr(
        ai_views, "_openai_client", lambda: FakeStreamingClient(["He ", "shipped it [1]."])
    )

    response = post(
        Client(),
        "/api/ai/chat/",
        {"messages": [{"role": "user", "content": "Did he ship a warranty app?"}]},
    )

    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/event-stream")
    events = _sse_events(b"".join(response.streaming_content))
    names = [name for name, _ in events]
    assert names == ["retrieval", "citations", "delta", "delta", "done"]
    assert events[1][1]["sources"][0]["project_slug"] == "warranty"
    assert "".join(
        payload["text"] for name, payload in events if name == "delta"
    ) == "He shipped it [1]."


def test_chat_says_when_there_is_no_evidence(monkeypatch):
    monkeypatch.setattr(
        ai_views,
        "_openai_client",
        lambda: pytest.fail("the model must not be called without evidence"),
    )

    response = post(
        Client(),
        "/api/ai/chat/",
        {"messages": [{"role": "user", "content": "What is his favourite colour?"}]},
    )

    events = _sse_events(b"".join(response.streaming_content))
    assert [name for name, _ in events] == ["retrieval", "citations", "delta", "done"]
    assert "verified evidence" in events[2][1]["text"]
    assert events[-1][1]["finish_reason"] == "no_evidence"


def test_chat_reports_a_missing_api_key(monkeypatch):
    make_chunk("Built a React Native warranty app.")
    monkeypatch.setattr(ai_views, "_openai_client", lambda: None)

    response = post(
        Client(),
        "/api/ai/chat/",
        {"messages": [{"role": "user", "content": "warranty app"}]},
    )

    events = _sse_events(b"".join(response.streaming_content))
    assert ("error", {"detail": ai_views.MISSING_KEY_DETAIL}) in events


def test_chat_validates_the_message_shape():
    response = post(Client(), "/api/ai/chat/", {"messages": []})

    assert response.status_code == 400


def test_chat_requires_the_last_message_to_be_from_the_user():
    response = post(
        Client(),
        "/api/ai/chat/",
        {
            "messages": [
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "hello"},
            ]
        },
    )

    assert response.status_code == 400


def test_chat_rejects_a_non_json_body():
    response = Client().post(
        "/api/ai/chat/", data="not json", content_type="application/json"
    )

    assert response.status_code == 400


# --------------------------------------------------------------------------- #
# /api/ai/job-fit/
# --------------------------------------------------------------------------- #


def test_job_fit_scores_a_description():
    person = Person.objects.create(name="Ada", title="Engineer", location="Nairobi")
    company = Company.objects.create(slug="acme", name="Acme")
    employment = Employment.objects.create(
        person=person, company=company, role="Engineer", start_date="2021-01-01"
    )
    react = Technology.objects.create(slug="react-native", name="React Native")
    project = Project.objects.create(
        slug="warranty", name="Warranty", overview="…", employment=employment
    )
    project.technologies.add(react)
    make_chunk("Built a React Native warranty app.")

    response = post(
        Client(),
        "/api/ai/job-fit/",
        {
            "job_description": "Senior React Native engineer. Kubernetes a plus.",
            "title": "Senior Mobile Engineer",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Senior Mobile Engineer"
    assert {item["slug"] for item in body["matched"]} == {"react-native"}
    assert "kubernetes" in {item["slug"] for item in body["gaps"]}
    assert body["coverage"]["total"] == 2


def test_job_fit_requires_a_description():
    response = post(Client(), "/api/ai/job-fit/", {"job_description": "  "})

    assert response.status_code == 400
