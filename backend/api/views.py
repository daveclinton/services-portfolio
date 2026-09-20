from rest_framework.decorators import api_view
from rest_framework.response import Response
from knowledge.models import Evidence, Person

@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})

@api_view(["GET"])
def person(request):
    p = Person.objects.first()
    if not p:
        return Response({"detail": "No person configured"}, status=404)
    return Response({
        "name": p.name,
        "title": p.title,
        "location": p.location,
        "summary": p.summary,
        "specializations": p.specializations,
        "career_focus": p.career_focus,
    })


@api_view(["GET"])
def evidence(request, slug):
    """A single evidence row, so the UI can link an answer back to its source."""
    row = (
        Evidence.objects.filter(slug=slug)
        .select_related("project__employment__company", "employment__company")
        .first()
    )
    if row is None:
        return Response({"detail": "Evidence not found"}, status=404)
    # Evidence attached only to a project still belongs to that project's
    # company, which is what a reader wants to see on the page.
    employment = row.employment or (
        row.project.employment if row.project_id else None
    )
    return Response(
        {
            "slug": row.slug,
            "title": row.title or row.claim[:120],
            "claim": row.claim,
            "description": row.description,
            "evidence_type": row.evidence_type,
            "confidence": row.confidence,
            "verified_at": row.verified_at,
            "external_id": row.external_id,
            "source_url": row.source_url,
            "source_path": row.source_path,
            "project": (
                {"slug": row.project.slug, "name": row.project.name}
                if row.project_id
                else None
            ),
            "company": (
                {
                    "slug": employment.company.slug,
                    "name": employment.company.name,
                }
                if employment is not None
                else None
            ),
        }
    )
