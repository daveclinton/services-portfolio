from django.contrib import admin
from django.urls import path

from api import views as api_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_views.health, name='health'),
    path('api/person/', api_views.person, name='person'),
]
