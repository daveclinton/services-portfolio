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

    # Natural key: matches knowledge/evidence/<evidence-slug>.md and the slugs
    # declared in accomplishments.md / projects/<slug>/evidence.md.
    slug = models.SlugField(unique=True)
    claim = models.TextField()
    confidence = models.CharField(max_length=20, choices=CONFIDENCE_CHOICES, default="confirmed")

    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="evidence")
    employment = models.ForeignKey(Employment, null=True, blank=True, on_delete=models.CASCADE, related_name="evidence")

    source_url = models.URLField(blank=True)
    source_path = models.CharField(max_length=500, blank=True)

    def __str__(self):
        return self.claim[:60]


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
