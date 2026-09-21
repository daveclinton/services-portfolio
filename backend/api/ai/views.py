"""``/api/ai/`` endpoints (Phases 6, 7 and 9).

* ``POST /api/ai/search/``  — retrieval only, no LLM.
* ``POST /api/ai/chat/``    — retrieval + grounded answer, streamed as SSE.
* ``POST /api/ai/job-fit/`` — deterministic requirement matching + evidence.
"""

from __future__ import annotations

import json
from typing import Iterator

from django.conf import settings
from django.db import connection
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from knowledge import generation, jobfit
from knowledge.retrieval import search

from .serializers import (
    ChatRequestSerializer,
    JobFitRequestSerializer,
    SearchRequestSerializer,
)

MISSING_KEY_DETAIL = (
    "OPENAI_API_KEY is not configured on the server, so grounded answers "
    "cannot be generated"
)


def _chat_model(requested: str | None) -> str:
    return requested or getattr(settings, "OPENAI_CHAT_MODEL", generation.DEFAULT_MODEL)


def _openai_client():
    """Build an OpenAI client, or ``None`` when no key is configured."""
    import openai

    try:
        return openai.OpenAI()
    except Exception:
        return None


@api_view(["POST"])
@permission_classes([AllowAny])
def search_view(request):
    """Structured, semantic or hybrid retrieval over KnowledgeChunk."""
    serializer = SearchRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    outcome = search(
        data["query"],
        mode=data["mode"],
        filters=data.get("filters"),
        limit=data["limit"],
    )
    return Response(outcome.as_dict(include_content=data["include_content"]))


@api_view(["POST"])
@permission_classes([AllowAny])
def job_fit_view(request):
    """Score a job description against the knowledge base."""
    serializer = JobFitRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    report = jobfit.analyse(
        data["job_description"], title=data["title"], limit=data["limit"]
    )

    if data["narrative"]:
        client = _openai_client()
        if client is None:
            report.notes.append(MISSING_KEY_DETAIL)
        else:
            messages = jobfit.build_narrative_messages(
                report, data["job_description"]
            )
            report.narrative = generation.complete(
                client, model=_chat_model(None), messages=messages
            )

    return Response(report.as_dict())


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@csrf_exempt
@require_POST
def chat_view(request):
    """Retrieve, then stream a grounded answer as Server-Sent Events."""
    try:
        payload = json.loads(request.body or b"{}")
    except ValueError:
        return JsonResponse({"detail": "request body must be valid JSON"}, status=400)

    serializer = ChatRequestSerializer(data=payload)
    if not serializer.is_valid():
        return JsonResponse(
            {"detail": "invalid request", "errors": serializer.errors}, status=400
        )

    data = serializer.validated_data
    messages = data["messages"]
    question = messages[-1]["content"]
    history = messages[:-1]

    outcome = search(
        question, mode=data["mode"], limit=data["limit"], client=None
    )
    sources = generation.build_sources(outcome.results)

    # Everything that touches the database or the provider client happens
    # before the response starts streaming: a StreamingHttpResponse keeps the
    # request open, and the DB connection is closed just below.
    client = None
    prompt: list[dict] = []
    if sources:
        client = _openai_client()
        prompt = generation.build_messages(
            question,
            sources,
            person_name=generation.person_name(),
            history=history,
        )

    def event_stream() -> Iterator[str]:
        yield _sse(
            "retrieval",
            {
                "notes": outcome.notes,
                "strategies": outcome.strategies,
                "intent": outcome.intent.name,
            },
        )
        yield _sse(
            "citations",
            {"sources": [source.as_dict() for source in sources]},
        )

        if not sources:
            yield _sse("delta", {"text": generation.NO_EVIDENCE_MESSAGE})
            yield _sse("done", {"finish_reason": "no_evidence"})
            return

        if client is None:
            yield _sse("error", {"detail": MISSING_KEY_DETAIL})
            yield _sse("done", {"finish_reason": "error"})
            return

        try:
            for text in generation.stream_answer(
                client, model=_chat_model(data.get("model")), messages=prompt
            ):
                yield _sse("delta", {"text": text})
        except Exception as exc:  # surface provider failures to the client
            yield _sse("error", {"detail": f"generation failed: {exc}"})
        yield _sse("done", {"finish_reason": "stop"})

    # Retrieval is finished, so the request no longer needs its DB connection
    # held open for the lifetime of the stream.
    connection.close()

    response = StreamingHttpResponse(
        event_stream(), content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
