from django.urls import path

from . import views

urlpatterns = [
    path("search/", views.search_view, name="ai-search"),
    path("chat/", views.chat_view, name="ai-chat"),
    path("job-fit/", views.job_fit_view, name="ai-job-fit"),
]
