from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from knowledge.models import (
    AIConversation,
    AIConversationTurn,
    Company,
    Employment,
    Evidence,
    KnowledgeChunk,
    Person,
    Project,
    Skill,
    Technology,
)


class AIConversationModelsTest(TestCase):
    def test_evidence_only_status_is_valid(self):
        status = AIConversationTurn._meta.get_field("status")
        self.assertEqual(status.clean("degraded", None), "degraded")

    def test_conversation_keeps_pseudonymous_metadata_and_turns(self):
        conversation = AIConversation.objects.create(
            network_hash="a" * 64,
            device_type="mobile",
            browser_family="Safari",
            os_family="iOS",
            expires_at=timezone.now() + timedelta(days=30),
        )
        turn = AIConversationTurn.objects.create(
            conversation=conversation,
            question="What has David built?",
            answer="He has built operational software.",
            status="completed",
            intent="projects",
            intent_source="model",
            intent_confidence=0.91,
            model="gpt-4o-mini",
            source_count=3,
            latency_ms=120,
        )

        self.assertEqual(conversation.turns.get(), turn)
        self.assertEqual(conversation.network_hash, "a" * 64)
        self.assertEqual(conversation.consent_version, "2026-09-22")
        self.assertEqual(turn.status, "completed")
        self.assertEqual(turn.intent_source, "model")
        self.assertEqual(turn.intent_confidence, 0.91)
        self.assertNotIn("ip", {field.name for field in conversation._meta.fields})


class KnowledgeModelsTest(TestCase):
    def test_portfolio_graph_str_and_relations(self):
        person = Person.objects.create(
            slug="ada-lovelace", name="Ada Lovelace", title="Engineer", location="London"
        )
        company = Company.objects.create(slug="analytical", name="Analytical Engines")
        employment = Employment.objects.create(
            person=person, company=company, role="Programmer", start_date="1843-01-01",
        )
        skill = Skill.objects.create(slug="python", name="Python")
        tech = Technology.objects.create(slug="django", name="Django")
        project = Project.objects.create(slug="engine", name="Engine", overview="First program")
        project.skills.add(skill)
        project.technologies.add(tech)
        evidence = Evidence.objects.create(
            slug="first-program", claim="Wrote the first program", project=project
        )

        self.assertEqual(str(person), "Ada Lovelace")
        self.assertEqual(str(employment), "Programmer @ Analytical Engines")
        self.assertEqual(str(project), "Engine")
        self.assertEqual(evidence.confidence, "confirmed")
        self.assertEqual(evidence.slug, "first-program")
        self.assertIn(project, skill.projects.all())
        self.assertIn(project, tech.projects.all())
        self.assertIn(evidence, project.evidence.all())


class KnowledgeChunkTest(TestCase):
    def test_chunk_without_embedding(self):
        chunk = KnowledgeChunk.objects.create(content="hello world", source_type="project")
        self.assertIsNone(chunk.embedding)
        self.assertEqual(chunk.metadata, {})
        self.assertEqual(str(chunk), "project: hello world")
