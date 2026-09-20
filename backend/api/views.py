from rest_framework.decorators import api_view
from rest_framework.response import Response
from knowledge.models import Person

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
