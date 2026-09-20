from django.contrib import admin
from django.urls import include, path

from api import views as api_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_views.health, name='health'),
    path('api/person/', api_views.person, name='person'),
    path('api/evidence/<slug:slug>/', api_views.evidence, name='evidence'),
    path('api/ai/', include('api.ai.urls')),
]
