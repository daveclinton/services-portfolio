"""Request validation for the ``/api/ai/`` endpoints.

These deliberately validate *shape* only. Anything about the knowledge base
(does this project exist? does this chunk have an embedding?) belongs to the
retrieval layer, which can degrade gracefully instead of rejecting a request.
"""

from __future__ import annotations

from rest_framework import serializers

from knowledge.retrieval.service import MODES


class SearchFiltersSerializer(serializers.Serializer):
    source_type = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False
    )
    source_group = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False
    )
    project_slug = serializers.ListField(
        child=serializers.CharField(max_length=200), required=False
    )
    company_slug = serializers.ListField(
        child=serializers.CharField(max_length=200), required=False
    )
    skill_slug = serializers.ListField(
        child=serializers.CharField(max_length=200), required=False
    )


class SearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=4000, allow_blank=True, trim_whitespace=True)
    mode = serializers.ChoiceField(choices=MODES, default="hybrid")
    limit = serializers.IntegerField(min_value=1, max_value=50, default=10)
    include_content = serializers.BooleanField(default=True)
    filters = SearchFiltersSerializer(required=False)

    def validate(self, attrs: dict) -> dict:
        if not attrs["query"].strip() and not attrs.get("filters"):
            raise serializers.ValidationError(
                "provide a query, at least one filter, or both"
            )
        return attrs


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=8000, allow_blank=False)


class ChatRequestSerializer(serializers.Serializer):
    messages = ChatMessageSerializer(many=True, allow_empty=False)
    mode = serializers.ChoiceField(choices=MODES, default="hybrid")
    limit = serializers.IntegerField(min_value=1, max_value=20, default=8)
    model = serializers.CharField(max_length=100, required=False, allow_blank=False)

    def validate_messages(self, value: list[dict]) -> list[dict]:
        if value[-1]["role"] != "user":
            raise serializers.ValidationError("the last message must come from the user")
        if not any(message["role"] == "user" for message in value):
            raise serializers.ValidationError("at least one user message is required")
        return value


class JobFitRequestSerializer(serializers.Serializer):
    job_description = serializers.CharField(
        max_length=40000, allow_blank=False, trim_whitespace=True
    )
    title = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    limit = serializers.IntegerField(min_value=1, max_value=20, default=8)
    narrative = serializers.BooleanField(default=False)
