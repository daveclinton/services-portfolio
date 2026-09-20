"""Tests for the read-only evidence detail endpoint."""

from __future__ import annotations

from rest_framework.test import APITestCase

from knowledge.models import Company, Employment, Evidence, Person, Project


class EvidenceEndpointTest(APITestCase):
    def test_missing_evidence_is_a_404(self):
        response = self.client.get("/api/evidence/does-not-exist/")

        self.assertEqual(response.status_code, 404)

    def test_evidence_is_returned_with_its_project_and_company(self):
        person = Person.objects.create(
            name="Ada Example", title="Engineer", location="Nairobi"
        )
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
            title="Store shipping",
            evidence_type="project",
            confidence="confirmed",
            project=project,
            source_url="https://example.com/warranty",
        )

        response = self.client.get("/api/evidence/warranty-shipped/")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["slug"], "warranty-shipped")
        self.assertEqual(body["title"], "Store shipping")
        self.assertEqual(body["project"]["slug"], "warranty")
        self.assertEqual(body["company"]["slug"], "acme")
        self.assertEqual(body["confidence"], "confirmed")
