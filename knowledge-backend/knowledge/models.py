import uuid

from django.db import models
from pgvector.django import VectorField


class Person(models.Model):
    # Natural key used by the ingestion pipeline. Nullable so rows created by
    # other code paths (admin, API fixtures) remain valid; ingestion always
    # sets it from knowledge/person/profile.md.
    slug = models.SlugField(unique=True, null=True, blank=True)
    name = models.CharField(max_length=200)
    title = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    summary = models.TextField(blank=True)
    specializations = models.JSONField(default=list, blank=True)
    career_focus = models.JSONField(default=list, blank=True)
    experience_years = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return self.name


class Company(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "companies"

    def __str__(self):
        return self.name


class Employment(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="employments")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="employments")
    role = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    responsibilities = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.role} @ {self.company.name}"


class Skill(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.name


class Technology(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name_plural = "technologies"

    def __str__(self):
        return self.name


class Project(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    overview = models.TextField()
    problem = models.TextField(blank=True)
    context = models.TextField(blank=True)
    architecture = models.TextField(blank=True)
    technical_decisions = models.TextField(blank=True)
    challenges = models.TextField(blank=True)
    solutions = models.TextField(blank=True)
    results = models.TextField(blank=True)

    github_url = models.URLField(blank=True)
    demo_url = models.URLField(blank=True)
    docs_url = models.URLField(blank=True)

    employment = models.ForeignKey(
        Employment, null=True, blank=True, on_delete=models.SET_NULL, related_name="projects"
    )
    skills = models.ManyToManyField(Skill, blank=True, related_name="projects")
    technologies = models.ManyToManyField(Technology, blank=True, related_name="projects")

    def __str__(self):
        return self.name


class Evidence(models.Model):
    CONFIDENCE_CHOICES = [
        ("confirmed", "Confirmed"),
        ("probable", "Probable"),
        ("unverified", "Unverified"),
    ]

    EVIDENCE_TYPE_CHOICES = [
        ("project", "Project"),
        ("repository", "Repository"),
        ("article", "Article"),
        ("talk", "Talk"),
        ("documentation", "Documentation"),
        ("certificate", "Certificate"),
        ("metric", "Metric"),
        ("screenshot", "Screenshot"),
    ]

    # Natural key: matches knowledge/evidence/<evidence-slug>.md and the slugs
    # declared in accomplishments.md / projects/<slug>/evidence.md.
    slug = models.SlugField(unique=True)
    claim = models.TextField()
    confidence = models.CharField(max_length=20, choices=CONFIDENCE_CHOICES, default="confirmed")

    # Phase 4 evidence layer: what kind of source backs this claim, and a
    # short label plus free-text details for admin/AI display.
    evidence_type = models.CharField(
        max_length=20, choices=EVIDENCE_TYPE_CHOICES, default="documentation"
    )
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    external_id = models.CharField(max_length=500, blank=True)

    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="evidence")
    employment = models.ForeignKey(Employment, null=True, blank=True, on_delete=models.CASCADE, related_name="evidence")

    source_url = models.URLField(blank=True)
    source_path = models.CharField(max_length=500, blank=True)

    def __str__(self):
        return self.title or self.claim[:60]


class KnowledgeChunk(models.Model):
    content = models.TextField()
    embedding = VectorField(dimensions=1536, null=True, blank=True)

    source_type = models.CharField(max_length=50)   # experience | project | skill | evidence
    source_path = models.CharField(max_length=500, blank=True)

    company_slug = models.CharField(max_length=100, blank=True)
    project_slug = models.CharField(max_length=100, blank=True)
    skill_slug = models.CharField(max_length=100, blank=True)

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["source_type"]),
            models.Index(fields=["project_slug"]),
            models.Index(fields=["company_slug"]),
        ]

    def __str__(self):
        return f"{self.source_type}: {self.content[:40]}"


class AIConversation(models.Model):
    """An explicitly opted-in, pseudonymous Ask AI conversation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    network_hash = models.CharField(max_length=64)
    device_type = models.CharField(max_length=20, default="unknown")
    browser_family = models.CharField(max_length=40, default="unknown")
    os_family = models.CharField(max_length=40, default="unknown")
    consent_version = models.CharField(max_length=20, default="2026-09-22")
    consented_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    alerted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AI conversation {self.id}"


class AIConversationTurn(models.Model):
    STATUS_CHOICES = [
        ("completed", "Completed"),
        ("no_evidence", "No evidence"),
        ("error", "Error"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        AIConversation, on_delete=models.CASCADE, related_name="turns"
    )
    question = models.TextField()
    answer = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    intent = models.CharField(max_length=50, blank=True)
    intent_source = models.CharField(max_length=20, blank=True)
    intent_confidence = models.FloatField(null=True, blank=True)
    model = models.CharField(max_length=100, blank=True)
    source_count = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.status}: {self.question[:60]}"
