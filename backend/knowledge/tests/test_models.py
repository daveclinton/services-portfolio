from django.test import TestCase

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
