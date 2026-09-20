"""Job-fit analysis (Phase 9).

Deterministic by default: the job description is scanned against a lexicon
built from the knowledge base's own skills and technologies (plus a small
alias table), then every detected requirement is checked for evidence. No
model is required to get a usable answer, which keeps the score reproducible
and cheap to test. An optional narrative can be layered on top when an API
key is configured.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from django.db.models import Q

from knowledge.models import Evidence, Project, Skill, Technology
from knowledge.retrieval.service import SearchOutcome, search

#: Surface forms that should resolve to one canonical slug. Only the
#: spellings that actually occur in job ads are listed; the knowledge base
#: supplies everything else.
ALIASES: dict[str, str] = {
    "postgres": "postgresql",
    "postgres sql": "postgresql",
    "psql": "postgresql",
    "js": "javascript",
    "ts": "typescript",
    "node": "node-js",
    "nodejs": "node-js",
    "reactjs": "react",
    "react js": "react",
    "reactnative": "react-native",
    "react native": "react-native",
    "k8s": "kubernetes",
    "rn": "react-native",
    "nextjs": "next-js",
    "next js": "next-js",
    "rest": "rest-apis",
    "restful": "rest-apis",
    "ci cd": "ci-cd",
    "cicd": "ci-cd",
    "tailwind": "tailwind-css",
    "gql": "graphql",
    "ui ux": "ui-ux",
    "ux": "ui-ux",
}

#: Words that look like requirements but never are.
NOISE = frozenset(
    {
        "the", "and", "with", "you", "our", "team", "role", "work", "years",
        "experience", "strong", "good", "great", "must", "plus", "nice",
        "have", "will", "who", "are", "for", "that", "this", "from", "a",
        "an", "of", "to", "in", "on", "or", "as", "be", "is", "we", "us",
    }
)

#: Industry terms worth detecting even when the knowledge base has never
#: mentioned them — that is exactly what makes them *gaps*. The knowledge
#: base supplies display names and canonical slugs for anything it knows;
#: this list only fills in the rest of the vocabulary.
COMMON_TERMS: dict[str, str] = {
    "aws": "aws",
    "azure": "azure",
    "gcp": "gcp",
    "docker": "docker",
    "kubernetes": "kubernetes",
    "terraform": "terraform",
    "graphql": "graphql",
    "grpc": "grpc",
    "redis": "redis",
    "kafka": "kafka",
    "rabbitmq": "rabbitmq",
    "elasticsearch": "elasticsearch",
    "mongodb": "mongodb",
    "mysql": "mysql",
    "sqlite": "sqlite",
    "dynamodb": "dynamodb",
    "firebase": "firebase",
    "supabase": "supabase",
    "django": "django",
    "flask": "flask",
    "fastapi": "fastapi",
    "rails": "rails",
    "laravel": "laravel",
    "spring boot": "spring-boot",
    "dotnet": "dotnet",
    "java": "java",
    "kotlin": "kotlin",
    "swift": "swift",
    "golang": "go",
    "rust": "rust",
    "php": "php",
    "ruby": "ruby",
    "vue": "vue",
    "angular": "angular",
    "svelte": "svelte",
    "nuxt": "nuxt",
    "remix": "remix",
    "expo": "expo",
    "flutter": "flutter",
    "android": "android",
    "ios": "ios",
    "jest": "jest",
    "vitest": "vitest",
    "cypress": "cypress",
    "playwright": "playwright",
    "selenium": "selenium",
    "jenkins": "jenkins",
    "github actions": "github-actions",
    "gitlab ci": "gitlab-ci",
    "vercel": "vercel",
    "netlify": "netlify",
    "sentry": "sentry",
    "datadog": "datadog",
    "grafana": "grafana",
    "prometheus": "prometheus",
    "sql": "sql",
    "nosql": "nosql",
    "rest apis": "rest-apis",
    "microservices": "microservices",
    "serverless": "serverless",
    "machine learning": "machine-learning",
    "data pipelines": "data-pipelines",
    "etl": "etl",
    "accessibility": "accessibility",
    "a11y": "accessibility",
    "design systems": "design-systems",
    "storybook": "storybook",
    "figma": "figma",
    "product management": "product-management",
    "stakeholder management": "stakeholder-management",
    "mentoring": "mentoring",
    "code review": "code-review",
    "technical writing": "technical-writing",
    "developer relations": "developer-relations",
    "data visualization": "data-visualization",
    "mobile development": "mobile-development",
    "frontend development": "frontend-development",
}


@dataclass
class Requirement:
    name: str
    slug: str
    kind: str  # "skill" | "technology" | "keyword"
    matched: bool = False
    projects: list[dict] = field(default_factory=list)
    evidence: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "slug": self.slug,
            "kind": self.kind,
            "matched": self.matched,
            "projects": self.projects,
            "evidence": self.evidence,
        }


@dataclass
class JobFitReport:
    title: str
    score: float
    matched: list[Requirement]
    gaps: list[Requirement]
    relevant_experience: list[dict]
    summary: str
    notes: list[str] = field(default_factory=list)
    narrative: str = ""

    def as_dict(self) -> dict:
        return {
            "title": self.title,
            "score": self.score,
            "coverage": {
                "matched": len(self.matched),
                "missing": len(self.gaps),
                "total": len(self.matched) + len(self.gaps),
            },
            "matched": [item.as_dict() for item in self.matched],
            "gaps": [item.as_dict() for item in self.gaps],
            "relevant_experience": self.relevant_experience,
            "summary": self.summary,
            "narrative": self.narrative,
            "notes": self.notes,
        }


def _slug_variants(value: str) -> set[str]:
    """Every surface form that should resolve to this knowledge-base entry."""
    cleaned = value.strip().lower()
    if not cleaned:
        return set()
    hyphenated = re.sub(r"[^a-z0-9]+", "-", cleaned).strip("-")
    spaced = hyphenated.replace("-", " ")
    return {v for v in {cleaned, hyphenated, spaced} if v}


def build_lexicon() -> dict[str, tuple[str, str, str]]:
    """Map surface form -> ``(canonical_slug, kind, display_name)``.

    Skills and technologies from the knowledge base come first, so a JD term
    that names something the candidate actually has always resolves to it.
    """
    lexicon: dict[str, tuple[str, str, str]] = {}
    for model, kind in ((Skill, "skill"), (Technology, "technology")):
        for row in model.objects.all():
            for variant in _slug_variants(row.name) | _slug_variants(row.slug):
                existing = lexicon.get(variant)
                # Prefer a display name from the knowledge base, and let a
                # real Skill/Technology outrank the generic keyword list.
                if existing is None or (existing[1] == "keyword" and kind != "keyword"):
                    lexicon[variant] = (row.slug, kind, row.name)
    for variant, canonical in ALIASES.items():
        lexicon.setdefault(variant, (canonical, "technology", variant))
    for variant, canonical in COMMON_TERMS.items():
        lexicon.setdefault(variant, (canonical, "keyword", canonical.replace("-", " ")))
    return lexicon


def detect_requirements(
    text: str, lexicon: dict[str, tuple[str, str, str]]
) -> list[Requirement]:
    """Find lexicon terms in ``text`` without double-counting substrings."""
    haystack = " " + re.sub(r"[^a-z0-9+#.]+", " ", text.lower()) + " "
    found: dict[str, Requirement] = {}
    # Longest surface forms first so "react native" wins over "react".
    for surface in sorted(lexicon, key=len, reverse=True):
        if surface in NOISE:
            continue
        pattern = r"(?<![a-z0-9+#])" + re.escape(surface) + r"(?![a-z0-9+#])"
        if not re.search(pattern, haystack):
            continue
        slug, kind, display = lexicon[surface]
        if slug not in found:
            found[slug] = Requirement(name=display, slug=slug, kind=kind)
    return sorted(found.values(), key=lambda item: item.name.lower())


def _project_payload(project: Project) -> dict:
    return {
        "slug": project.slug,
        "name": project.name,
        "company_slug": project.employment.company.slug if project.employment_id else "",
        "github_url": project.github_url,
    }


def _evidence_payload(evidence: Evidence) -> dict:
    return {
        "slug": evidence.slug,
        "title": evidence.title or evidence.claim[:120],
        "confidence": evidence.confidence,
        "evidence_type": evidence.evidence_type,
        "source_url": evidence.source_url,
        "source_path": evidence.source_path,
    }


def _resolve(requirement: Requirement) -> None:
    """Attach the projects and evidence that back a requirement."""
    kind = requirement.kind
    if kind == "keyword":
        # A generic industry term only counts if the knowledge base has a
        # matching Skill or Technology row. Otherwise it is a genuine gap.
        if Technology.objects.filter(slug=requirement.slug).exists():
            kind = "technology"
        elif Skill.objects.filter(slug=requirement.slug).exists():
            kind = "skill"
        else:
            requirement.matched = False
            return

    if kind == "technology":
        projects = list(
            Project.objects.filter(technologies__slug=requirement.slug)
            .select_related("employment__company")
            .distinct()
        )
    else:
        projects = list(
            Project.objects.filter(skills__slug=requirement.slug)
            .select_related("employment__company")
            .distinct()
        )

    requirement.matched = bool(projects)
    requirement.projects = [_project_payload(project) for project in projects]
    if not projects:
        return

    project_slugs = [project.slug for project in projects]
    rows = (
        Evidence.objects.filter(Q(project__slug__in=project_slugs))
        .select_related("project")
        .distinct()[:5]
    )
    requirement.evidence = [_evidence_payload(row) for row in rows]


def _summarize(title: str, matched: list[Requirement], gaps: list[Requirement]) -> str:
    where = f" for {title}" if title else ""
    if not matched and not gaps:
        return (
            f"No recognised requirements were detected in the job description{where}. "
            "Paste the responsibilities or requirements section for a useful comparison."
        )
    covered = ", ".join(item.name for item in matched[:8]) or "nothing in the lexicon"
    sentence = f"Evidence supports {len(matched)} of {len(matched) + len(gaps)} detected requirements{where}: {covered}."
    if gaps:
        missing = ", ".join(item.name for item in gaps[:8])
        sentence += f" No knowledge-base evidence found for: {missing}."
    return sentence


def analyse(
    job_description: str,
    *,
    title: str = "",
    limit: int = 8,
    search_outcome: SearchOutcome | None = None,
    client: object | None = None,
) -> JobFitReport:
    """Compare a job description against the knowledge base."""
    if not (job_description or "").strip():
        raise ValueError("job_description must not be empty")

    lexicon = build_lexicon()
    requirements = detect_requirements(job_description, lexicon)

    matched: list[Requirement] = []
    gaps: list[Requirement] = []
    for requirement in requirements:
        _resolve(requirement)
        if requirement.matched:
            matched.append(requirement)
        else:
            gaps.append(requirement)

    total = len(matched) + len(gaps)
    score = round(len(matched) / total, 4) if total else 0.0

    outcome = search_outcome or search(
        job_description, mode="hybrid", limit=limit, client=client
    )
    relevant = [
        {
            "rank": result.rank,
            "score": round(result.score, 6),
            "source_type": result.chunk.source_type,
            "source_path": result.chunk.source_path,
            "project_slug": result.chunk.project_slug,
            "company_slug": result.chunk.company_slug,
            "matched_by": list(result.matched_by),
            "citations": result.citations,
        }
        for result in outcome.results
    ]

    notes = list(outcome.notes)
    if not requirements:
        notes.append(
            "no knowledge-base skills or technologies were detected in the "
            "job description"
        )

    return JobFitReport(
        title=title,
        score=score,
        matched=matched,
        gaps=gaps,
        relevant_experience=relevant,
        summary=_summarize(title, matched, gaps),
        notes=notes,
    )


NARRATIVE_SYSTEM_PROMPT = """\
You write short, honest job-fit summaries for a candidate's portfolio.
Use ONLY the matched requirements and the retrieved experience below.
Never claim experience that is not listed. Mention the gaps briefly.
Write 3-4 sentences in the third person.
"""


def build_narrative_messages(report: JobFitReport, job_description: str) -> list[dict]:
    matched = ", ".join(item.name for item in report.matched) or "(none)"
    gaps = ", ".join(item.name for item in report.gaps) or "(none)"
    experience = "\n".join(
        f"- {item['source_type']} ({item['project_slug'] or item['company_slug']})"
        for item in report.relevant_experience
    ) or "(none)"
    return [
        {"role": "system", "content": NARRATIVE_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Job title: {report.title or '(not given)'}\n"
                f"Matched requirements: {matched}\n"
                f"Gaps: {gaps}\n"
                f"Retrieved experience:\n{experience}\n\n"
                f"Job description (truncated):\n{job_description[:4000]}"
            ),
        },
    ]
